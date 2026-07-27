import Task from './task.model.js';

const POPULATE_FIELDS = [
  { path: 'assignedTo', select: 'name email avatar' },
  { path: 'createdBy', select: 'name email avatar' },
  { path: 'project', select: 'name' },
  { path: 'parent', select: 'title status' },
  { path: 'dependsOn', select: 'title status' },
  { path: 'blockedBy', select: 'title status' },
];

export const create = (data) => Task.create(data);

export const findById = (id) =>
  Task.findById(id).populate(POPULATE_FIELDS);

export const findAll = async (query, options) => {
  const filter = {};
  if (query.search) {
    const re = { $regex: query.search, $options: 'i' };
    filter.$or = [{ title: re }, { description: re }];
  }
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.project) filter.project = query.project;
  if (query.tags) filter.tags = { $in: query.tags.split(',') };
  if (query.dueDateFrom || query.dueDateTo) {
    filter.dueDate = {};
    if (query.dueDateFrom) filter.dueDate.$gte = new Date(query.dueDateFrom);
    if (query.dueDateTo) filter.dueDate.$lte = new Date(query.dueDateTo);
  }
  if (query.parent !== undefined) filter.parent = query.parent || null;
  if (query.watchedBy) filter.watchers = query.watchedBy;

  const sort = {};
  const sortField = query.sort?.startsWith('-') ? query.sort.slice(1) : query.sort || 'createdAt';
  sort[sortField] = query.sort?.startsWith('-') ? -1 : 1;

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
  };
};

export const updateById = (id, data) =>
  Task.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(POPULATE_FIELDS);

export const deleteById = (id) => Task.findByIdAndDelete(id);

export const countAll = (filter = {}) => Task.countDocuments(filter);

export const findSubtasks = (parentId) =>
  Task.find({ parent: parentId }).populate(POPULATE_FIELDS);

export const addActivity = (taskId, activity) =>
  Task.findByIdAndUpdate(taskId, { $push: { activities: activity } }, { new: true });

export const addComment = (taskId, comment) =>
  Task.findByIdAndUpdate(taskId, { $push: { comments: comment } }, { new: true }).populate(POPULATE_FIELDS);

export const addChecklistItem = (taskId, item) =>
  Task.findByIdAndUpdate(taskId, { $push: { checklists: item } }, { new: true }).populate(POPULATE_FIELDS);

export const updateChecklistItem = (taskId, itemId, data) =>
  Task.findOneAndUpdate(
    { _id: taskId, 'checklists._id': itemId },
    { $set: Object.fromEntries(Object.entries(data).map(([k, v]) => [`checklists.$.${k}`, v])) },
    { new: true },
  ).populate(POPULATE_FIELDS);

export const removeChecklistItem = (taskId, itemId) =>
  Task.findByIdAndUpdate(taskId, { $pull: { checklists: { _id: itemId } } }, { new: true }).populate(POPULATE_FIELDS);

export const addWatcher = (taskId, userId) =>
  Task.findByIdAndUpdate(taskId, { $addToSet: { watchers: userId } }, { new: true }).populate(POPULATE_FIELDS);

export const removeWatcher = (taskId, userId) =>
  Task.findByIdAndUpdate(taskId, { $pull: { watchers: userId } }, { new: true }).populate(POPULATE_FIELDS);

export const addTimeEntry = (taskId, entry) =>
  Task.findByIdAndUpdate(taskId, { $push: { timeEntries: entry } }, { new: true }).populate(POPULATE_FIELDS);

export const removeTimeEntry = (taskId, entryId) =>
  Task.findByIdAndUpdate(taskId, { $pull: { timeEntries: { _id: entryId } } }, { new: true }).populate(POPULATE_FIELDS);

export const addDependency = (taskId, depId) =>
  Task.findByIdAndUpdate(taskId, { $addToSet: { dependsOn: depId } }, { new: true }).populate(POPULATE_FIELDS);

export const removeDependency = (taskId, depId) =>
  Task.findByIdAndUpdate(taskId, { $pull: { dependsOn: depId } }, { new: true }).populate(POPULATE_FIELDS);
