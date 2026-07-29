import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import * as notificationService from './notification.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await notificationService.getNotifications(req.user._id, req.query);
    ApiResponse.paginated(res, result.notifications, result.pagination);
  } catch (err) { next(err); }
};

export const unreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    ApiResponse.success(res, 200, { count });
  } catch (err) { next(err); }
};

export const markRead = async (req, res, next) => {
  try {
    const notif = await notificationService.markAsRead(req.params.id, req.user._id);
    if (!notif) throw ApiError.notFound('Notification not found');
    ApiResponse.success(res, 200, { notification: notif });
  } catch (err) { next(err); }
};

export const markAllRead = async (req, res, next) => {
  try {
    const count = await notificationService.markAllAsRead(req.user._id);
    ApiResponse.success(res, 200, { count }, `${count} notifications marked as read`);
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const deleted = await notificationService.deleteNotification(req.params.id, req.user._id);
    if (!deleted) throw ApiError.notFound('Notification not found');
    ApiResponse.success(res, 200, null, 'Notification deleted');
  } catch (err) { next(err); }
};

export const cleanupOld = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const count = await notificationService.deleteOldNotifications(days);
    ApiResponse.success(res, 200, { deletedCount: count }, `${count} old notifications cleaned up`);
  } catch (err) { next(err); }
};
