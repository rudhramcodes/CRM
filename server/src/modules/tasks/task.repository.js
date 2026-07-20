import Task from './task.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

const TASK_POPULATE = [
  { path: 'assignedTo', select: 'name email avatar' },
  { path: 'project', select: 'title' },
  { path: 'createdBy', select: 'name email' },
  { path: 'comments.createdBy', select: 'name email avatar role' },
  { path: 'activities.performedBy', select: 'name email avatar role' },
];

export const create = async (data) => {
  return Task.create(data);
};

export const findById = async (id) => {
  return Task.findById(id).populate(TASK_POPULATE);
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort: userSort } = paginate(options);
  const sort = userSort || { order: 1, createdAt: -1 };
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: searchRegex }, { description: searchRegex }];
  }
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.project) filter.project = query.project;
  if (query.dueDateFrom || query.dueDateTo) {
    filter.dueDate = {};
    if (query.dueDateFrom) filter.dueDate.$gte = new Date(query.dueDateFrom);
    if (query.dueDateTo) filter.dueDate.$lte = new Date(query.dueDateTo);
  }
  if (query.employeeFilter) filter.assignedTo = query.employeeFilter;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(TASK_POPULATE),
    Task.countDocuments(filter),
  ]);

  return { tasks, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = async (id, data) => {
  return Task.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(TASK_POPULATE);
};

export const deleteById = async (id) => {
  return Task.findByIdAndDelete(id);
};

export const countByStatus = async () => {
  return Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
};

export const countOverdue = async () => {
  return Task.countDocuments({ dueDate: { $lt: new Date() }, status: { $ne: 'done' } });
};

export const countAll = async (filter = {}) => {
  return Task.countDocuments(filter);
};

export const addComment = async (id, commentData) => {
  return Task.findByIdAndUpdate(id, { $push: { comments: commentData } }, { new: true }).populate(TASK_POPULATE);
};

export const bulkUpdate = async (ids, data) => {
  return Task.updateMany({ _id: { $in: ids } }, { $set: data });
};

export const findLastByStatus = async (status) => {
  return Task.findOne({ status }).sort({ order: -1 }).select('order');
};

export const addActivity = async (id, activityData) => {
  const update = Array.isArray(activityData)
    ? { $push: { activities: { $each: activityData } } }
    : { $push: { activities: activityData } };
  return Task.findByIdAndUpdate(id, update, { new: true }).populate(TASK_POPULATE);
};

export const reorderTasks = async (orderedIds) => {
  const ops = orderedIds.map((taskId, index) => ({
    updateOne: { filter: { _id: taskId }, update: { $set: { order: index } } },
  }));
  return Task.bulkWrite(ops);
};
