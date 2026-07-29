import logger from '../utils/logger.js';
import * as notifRepo from '../modules/notifications/notification.repository.js';

export const registerNotificationHandlers = (io, socket) => {
  // Client confirms it received a notification
  socket.on('notification:delivered', async (notificationIds) => {
    if (!Array.isArray(notificationIds) || !notificationIds.length) return;
    try {
      await notifRepo.markAsDelivered(notificationIds);
    } catch (err) {
      logger.error(`Failed to mark notifications delivered: ${err.message}`);
    }
  });

  // Client marks a single notification as read
  socket.on('notification:read', async (notificationId) => {
    if (!notificationId) return;
    try {
      const notif = await notifRepo.markAsRead(notificationId, socket.user._id);
      if (notif) {
        const unreadCount = await notifRepo.countUnreadByRecipient(socket.user._id);
        io.to(`user:${socket.user._id}`).emit('notification:unread', { count: unreadCount });
      }
    } catch (err) {
      logger.error(`Socket markAsRead failed: ${err.message}`);
    }
  });

  // Client marks all notifications as read
  socket.on('notification:readAll', async () => {
    try {
      await notifRepo.markAllAsRead(socket.user._id);
      io.to(`user:${socket.user._id}`).emit('notification:unread', { count: 0 });
    } catch (err) {
      logger.error(`Socket markAllAsRead failed: ${err.message}`);
    }
  });
};
