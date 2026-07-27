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
    await notificationService.markAllAsRead(req.user._id);
    ApiResponse.success(res, 200, null, 'All notifications marked as read');
  } catch (err) { next(err); }
};
