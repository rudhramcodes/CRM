import * as notifRepo from './notification.repository.js';
import { NOTIFICATION_TEMPLATES } from './notification.constants.js';
import { getIO } from '../../sockets/index.js';
import logger from '../../utils/logger.js';
import config from '../../config/index.js';
import { shouldNotify } from '../settings/settings.service.js';

// ponytail: simple in-memory dedup window, upgrade to Redis if scaling
const dedupCache = new Map();
const DEDUP_TTL = 5 * 60 * 1000; // 5 minutes

const dedupKey = (recipient, type, referenceId) =>
  `${recipient}_${type}_${referenceId}`;

const isDuplicate = (recipient, type, referenceId) => {
  if (!referenceId) return false;
  const key = dedupKey(recipient, type, referenceId);
  if (dedupCache.has(key)) return true;
  dedupCache.set(key, true);
  setTimeout(() => dedupCache.delete(key), DEDUP_TTL);
  return false;
};

export const buildNotification = (type, data) => {
  const template = NOTIFICATION_TEMPLATES[type];
  if (!template) {
    logger.warn(`Unknown notification type: ${type}`);
    return {
      type,
      title: 'Notification',
      message: data.message || '',
      priority: 'medium',
    };
  }
  return {
    type,
    title: template.title,
    message: template.message(data),
    priority: template.priority,
  };
};

export const createAndSend = async ({
  recipient, type, title, message, link, priority,
  referenceId, referenceModel, actionBy, metadata, channels,
}) => {
  // Dedup: same type + same reference + same recipient within 5 min
  if (isDuplicate(recipient, type, referenceId)) return null;

  // Resolve actual channels from user preferences
  let allowedInApp = true;
  let allowedEmail = true;
  if (type) {
    allowedInApp = await shouldNotify(recipient, type, 'inApp');
    allowedEmail = await shouldNotify(recipient, type, 'email');
  }
  // If user explicitly disabled both, skip entirely
  if (!allowedInApp && !allowedEmail) return null;

  const finalChannels = {
    inApp: allowedInApp && (!channels || channels.inApp !== false),
    email: allowedEmail && (!channels || channels.email !== false),
  };

  const notification = await notifRepo.create({
    recipient,
    type,
    title: title || '',
    message,
    link: link || '',
    priority: priority || 'medium',
    referenceId: referenceId || undefined,
    referenceModel: referenceModel || undefined,
    actionBy: actionBy || undefined,
    metadata: metadata || undefined,
    channels: channels || { inApp: true, email: true },
  });

  // Real-time via Socket.io (only if inApp is allowed)
  if (finalChannels.inApp) {
    try {
      const io = getIO();
      if (io) {
        const unreadCount = await notifRepo.countUnreadByRecipient(recipient);
        io.to(`user:${recipient}`).emit('notification:new', notification);
        io.to(`user:${recipient}`).emit('notification:unread', { count: unreadCount });
      }
    } catch (err) {
      logger.error(`Socket emit failed for notification: ${err.message}`);
    }
  }

  // Send email (only if email channel is allowed)
  if (finalChannels.email) {
    try {
      const { default: User } = await import('../auth/auth.model.js');
      const user = await User.findById(recipient).select('email name');
      if (user?.email) {
        const { sendEmail, renderNotificationEmail } = await import('../../services/emailService.js');
        await sendEmail({
          to: user.email,
          subject: title || message.substring(0, 100),
          html: renderNotificationEmail({ title: title || 'Notification', message, link }),
        });
      }
    } catch (err) {
      logger.error(`Email send failed for notification: ${err.message}`);
    }
  }

  // Zoho Cliq team channel — one broadcast per event, not per recipient.
  // Dedup key is reference-scoped so a bulk send (e.g. meeting to 5 staff) posts once.
  if (type && referenceId && !dedupCache.has(`cliq_${referenceId}`)) {
    dedupCache.set(`cliq_${referenceId}`, true);
    setTimeout(() => dedupCache.delete(`cliq_${referenceId}`), DEDUP_TTL);
    try {
      const { sendCliqMessage } = await import('../../services/cliqService.js');
      await sendCliqMessage({ title, message, link });
    } catch (err) {
      logger.error(`Cliq send failed for notification: ${err.message}`);
    }
  }

  return notification;
};

export const createAndSendBulk = async (recipients, data) => {
  if (!recipients?.length) return [];
  const results = await Promise.allSettled(
    recipients.map((recipient) => createAndSend({ ...data, recipient })),
  );
  return results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
};

export const getNotifications = async (userId, query) =>
  notifRepo.findByRecipient(userId, query);

export const getUnreadCount = async (userId) =>
  notifRepo.countUnreadByRecipient(userId);

export const markAsRead = async (notificationId, userId) => {
  const notif = await notifRepo.markAsRead(notificationId, userId);
  if (notif) {
    try {
      const io = getIO();
      if (io) {
        const unreadCount = await notifRepo.countUnreadByRecipient(userId);
        io.to(`user:${userId}`).emit('notification:unread', { count: unreadCount });
      }
    } catch (err) {
      logger.error(`Socket emit failed: ${err.message}`);
    }
  }
  return notif;
};

export const markAllAsRead = async (userId) => {
  const count = await notifRepo.markAllAsRead(userId);
  try {
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:unread', { count: 0 });
    }
  } catch (err) {
    logger.error(`Socket emit failed: ${err.message}`);
  }
  return count;
};

export const deleteNotification = async (id, userId) => {
  const notif = await notifRepo.findById(id);
  if (!notif) return null;
  if (String(notif.recipient) !== String(userId)) return null;
  return notifRepo.deleteById(id);
};

export const deleteOldNotifications = async (daysOld = 90) => {
  const beforeDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return notifRepo.deleteOldNotifications(beforeDate);
};
