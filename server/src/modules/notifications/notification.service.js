import Notification from './notification.model.js';

export const createNotification = async ({ recipient, type, message, link, referenceId, referenceModel }) => {
  return Notification.create({ recipient, type, message, link, referenceId, referenceModel });
};

export const getNotifications = async (userId, query = {}) => {
  const filter = { recipient: userId };
  if (query.unread) filter.read = false;

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    pagination: {
      page, limit, total,
      pages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipient: userId, read: false });
};

export const markAsRead = async (notificationId, userId) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { read: true },
    { new: true },
  );
  return notif;
};

export const markAllAsRead = async (userId) => {
  await Notification.updateMany({ recipient: userId, read: false }, { read: true });
};
