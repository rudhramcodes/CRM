import * as notifRepo from './notification.repository.js';
import { NOTIFICATION_TEMPLATES } from './notification.constants.js';
import { getIO } from '../../sockets/index.js';
import { sendExpoPush } from './expoPush.js';
import logger from '../../utils/logger.js';
import config from '../../config/index.js';
import { shouldNotify } from '../settings/settings.service.js';

import { quietHoursEnd } from '../../utils/workingHours.js';

// ponytail: in-memory dedup for the Cliq broadcast only, upgrade to Redis if scaling
const dedupCache = new Map();
const DEDUP_TTL = 5 * 60 * 1000; // 5 minutes
const GROUP_WINDOW = 10 * 60 * 1000; // repeats within 10 min fold into one notification, no second push

// Task pushes wait out quiet hours (21:00–08:00 IST) unless the task is Urgent. Other modules keep sending at once.
const pushHoldUntil = async ({ type, referenceModel, referenceId }) => {
  if (!type?.startsWith('task_') && referenceModel !== 'Task') return null;
  const until = quietHoursEnd(new Date());
  if (!until) return null;
  if (referenceModel === 'Task' && referenceId) {
    const { default: Task } = await import('../tasks/task.model.js');
    const task = await Task.findById(referenceId).select('priority').lean();
    if (task?.priority === 'urgent') return null;
  }
  return until;
};

const emitUnread = async (recipient, event, notification) => {
  try {
    const io = getIO();
    if (!io) return;
    const room = `user:${recipient}`;
    io.to(room).emit(event, notification);
    io.to(room).emit('notification:unread', { count: await notifRepo.countUnreadByRecipient(recipient) });
  } catch (err) {
    logger.error(`[Notification] Socket emit failed: ${err.message}`);
  }
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
  referenceId, referenceModel, actionBy, metadata, channels, dedup = true,
}) => {
  logger.info(`[Notification] Creating: type=${type}, recipient=${recipient}, referenceId=${referenceId}`);

  // Grouping, checked in the database so restarts and several servers never send twice:
  // the same type + reference + recipient within 10 min updates the earlier notification, with no new push.
  // dedup: false for review steps, which can repeat quickly (submit, changes, submit again)
  if (dedup && referenceId) {
    const grouped = await notifRepo.groupRecent({ recipient, type, referenceId, since: new Date(Date.now() - GROUP_WINDOW), message });
    if (grouped) {
      logger.info(`[Notification] Grouped into ${grouped._id}: type=${type}, count=${grouped.count}`);
      await emitUnread(recipient, 'notification:updated', grouped);
      return grouped;
    }
  }

  const template = type ? NOTIFICATION_TEMPLATES[type] : null;
  // Template routing gates the channels this type is allowed on
  const templateChannels = template?.channels || { email: true, cliq: false };

  // Resolve actual channels from user preferences
  let allowedInApp = true;
  let allowedEmail = true;
  if (type) {
    allowedInApp = await shouldNotify(recipient, type, 'inApp');
    allowedEmail = await shouldNotify(recipient, type, 'email');
    logger.info(`[Notification] Preferences: inApp=${allowedInApp}, email=${allowedEmail} for type=${type}`);
  }
  // If user explicitly disabled both, skip entirely
  if (!allowedInApp && !allowedEmail) {
    logger.info(`[Notification] Skipped: both channels disabled for type=${type}, recipient=${recipient}`);
    return null;
  }

  const finalChannels = {
    inApp: allowedInApp && (!channels || channels.inApp !== false),
    email: allowedEmail && templateChannels.email !== false && (!channels || channels.email !== false),
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

  // Real-time via Socket.io, then phone push (both ride the in-app channel)
  if (finalChannels.inApp) {
    await emitUnread(recipient, 'notification:new', notification);
    const holdUntil = await pushHoldUntil({ type, referenceModel, referenceId }).catch(() => null);
    if (holdUntil) {
      await notifRepo.setPushAt(notification._id, holdUntil);
    } else {
      // never hold up the request for the push
      sendExpoPush(recipient, notification).catch((err) => logger.error(`[Notification] Push failed: ${err.message}`));
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
  await broadcastCliq({ type, referenceId, title, message, link, channels });

  return notification;
};

// Zoho Cliq team channel — one broadcast per event (reference-scoped dedup),
// fired even when there are no recipients (e.g. unassigned lead / no members).
// A caller can skip it with channels.cliq: false (e.g. editing a meeting is not a new meeting).
export const broadcastCliq = async ({ type, referenceId, title, message, link, channels }) => {
  const template = type ? NOTIFICATION_TEMPLATES[type] : null;
  if (template?.channels?.cliq !== true || channels?.cliq === false) return;
  if (!referenceId || dedupCache.has(`cliq_${referenceId}`)) return;
  dedupCache.set(`cliq_${referenceId}`, true);
  setTimeout(() => dedupCache.delete(`cliq_${referenceId}`), DEDUP_TTL);
  try {
    const { sendCliqMessage } = await import('../../services/cliqService.js');
    await sendCliqMessage({ title, message, link, channel: template?.cliqChannel || 'general' });
  } catch (err) {
    logger.error(`Cliq send failed for notification: ${err.message}`);
  }
};

export const createAndSendBulk = async (recipients, data) => {
  if (!recipients?.length) {
    await broadcastCliq(data);
    return [];
  }
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
