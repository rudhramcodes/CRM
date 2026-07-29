import Notification from './notification.model.js';

export const create = async (data) => Notification.create(data);

export const createBulk = async (notifications) => Notification.insertMany(notifications);

export const findById = async (id) => Notification.findById(id);

export const findByRecipient = async (userId, query = {}) => {
  const filter = { recipient: userId };
  if (query.type) filter.type = query.type;
  if (query.read !== undefined) filter.read = query.read;
  if (query.priority) filter.priority = query.priority;
  if (query.search) {
    filter.message = { $regex: query.search, $options: 'i' };
  }
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actionBy', 'name email avatar')
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

export const findUnreadByRecipient = async (userId) =>
  Notification.find({ recipient: userId, read: false })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

export const countUnreadByRecipient = async (userId) =>
  Notification.countDocuments({ recipient: userId, read: false });

export const markAsRead = async (notificationId, userId) =>
  Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { read: true, readAt: new Date() },
    { new: true },
  );

export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, read: false },
    { read: true, readAt: new Date() },
  );
  return result.modifiedCount;
};

export const markAsDelivered = async (ids) =>
  Notification.updateMany(
    { _id: { $in: ids } },
    { deliveredAt: new Date() },
  );

export const deleteById = async (id) => Notification.findByIdAndDelete(id);

export const deleteOldNotifications = async (beforeDate) => {
  const result = await Notification.deleteMany({
    createdAt: { $lt: beforeDate },
    read: true,
  });
  return result.deletedCount;
};
