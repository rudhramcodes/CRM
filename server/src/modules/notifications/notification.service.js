import * as notifRepo from './notification.repository.js';
import { NOTIFICATION_TEMPLATES } from './notification.constants.js';
import { getIO } from '../../sockets/index.js';
import logger from '../../utils/logger.js';
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
        const { sendEmail } = await import('../../services/emailService.js');
        await sendEmail({
          to: user.email,
          subject: message.substring(0, 100),
          html: buildEmailHtml({ title: message, message, link }),
        });
      }
    } catch (err) {
      logger.error(`Email send failed for notification: ${err.message}`);
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

function buildEmailHtml({ title, message, link }) {
  const linkHtml = link
    ? `<a href="${link}" style="display:inline-block;padding:10px 20px;background:#1e40af;color:#fff;text-decoration:none;border-radius:6px;margin-top:12px;">View Details</a>`
    : '';
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#1e293b;">${title}</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6;">${message}</p>
      ${linkHtml}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin-top:20px;" />
      <p style="color:#94a3b8;font-size:12px;">Rudhram CRM</p>
    </div>
  `;
}
