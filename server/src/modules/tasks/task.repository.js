import Task from './task.model.js';
import ApiError from '../../utils/ApiError.js';

const POPULATE_FIELDS = [
  { path: 'assignedTo', select: 'name email avatar' },
  { path: 'helpers', select: 'name email avatar' },
  { path: 'createdBy', select: 'name email avatar' },
  { path: 'reviewer', select: 'name email avatar' },
  { path: 'project', select: 'title' },
  { path: 'parent', select: 'title status' },
  { path: 'dependsOn', select: 'title status' },
  { path: 'blockedBy', select: 'title status' },
  { path: 'timeEntries.createdBy', select: 'name email avatar' },
  { path: 'comments.createdBy', select: 'name email avatar' },
  { path: 'watchers', select: 'name email avatar' },
  { path: 'activities.performedBy', select: 'name email avatar' },
];

export const create = (data) => Task.create(data);

export const findById = (id) =>
  Task.findById(id).populate(POPULATE_FIELDS);

export const findAll = async (query, options = {}) => {
  const filter = {};
  if (query.search) {
    // Escaped: a typed "(" or "*" is text to find, not a broken (or very slow) regex.
    const re = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ title: re }, { description: re }, { tags: re }];
  }
  if (query.status) filter.status = query.status;
  else if (query.open === 'true') filter.status = { $ne: 'done' };
  if (query.doneSince) Object.assign(filter, { status: 'done', completedAt: { $gte: new Date(query.doneSince) } });
  if (query.priority) filter.priority = query.priority;
  if (query.project) filter.project = query.project;
  if (query.tags) filter.tags = { $in: query.tags.split(',') };
  if (query.dueDateFrom || query.dueDateTo) {
    filter.dueDate = {};
    if (query.dueDateFrom) filter.dueDate.$gte = new Date(query.dueDateFrom);
    if (query.dueDateTo) filter.dueDate.$lte = new Date(query.dueDateTo);
  }
  if (query.parent !== undefined) filter.parent = query.parent || null;
  if (query.watchedBy) filter.watchers = query.watchedBy;
  // Older tasks have no reviewer yet: their creator reviews them.
  const and = [];
  if (query.reviewer) and.push({ $or: [{ reviewer: query.reviewer }, { reviewer: null, createdBy: query.reviewer }] });
  // "Assigned to X" means X owns it or helps on it.
  if (query.assignedTo) and.push({ $or: [{ assignedTo: query.assignedTo }, { helpers: query.assignedTo }] });
  if (and.length) filter.$and = and;

  if (options.client) {
    const { default: Project } = await import('../projects/project.model.js');
    const projects = await Project.find({ client: options.client }).select('_id').lean();
    const own = projects.map((p) => String(p._id));
    // A client may narrow to one of their own projects, never widen past them.
    filter.project = { $in: query.project ? own.filter((id) => id === String(query.project)) : own };
  }

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

export const updateById = async (id, data, activities = [], expectedDueDate) => {
  const filter = { _id: id };
  if (expectedDueDate !== undefined) filter.dueDate = expectedDueDate;
  const update = { ...data };
  if (activities.length) update.$push = { activities: { $each: activities } };
  const task = await Task.findOneAndUpdate(filter, update, { new: true, runValidators: true }).populate(POPULATE_FIELDS);
  if (!task && expectedDueDate !== undefined) throw ApiError.conflict('Task deadline changed. Refresh and try again.');
  return task;
};

export const deleteById = (id) => Task.findByIdAndDelete(id);

export const countAll = (filter = {}) => Task.countDocuments(filter);

export const findSubtasks = (parentId) =>
  Task.find({ parent: parentId }).populate(POPULATE_FIELDS);

export const addActivity = (taskId, activity) =>
  Task.findByIdAndUpdate(taskId, { $push: { activities: activity } }, { new: true });

export const addComment = (taskId, comment) =>
  Task.findByIdAndUpdate(taskId, { $push: { comments: comment } }, { new: true }).populate(POPULATE_FIELDS);

export const removeComment = (taskId, commentId) =>
  Task.findByIdAndUpdate(taskId, { $pull: { comments: { _id: commentId } } }, { new: true }).populate(POPULATE_FIELDS);

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

// Open and overdue task counts per person (owner or helper), for the assignee picker.
// shortcut: counts every user in one pass; fine for one studio, add a ?users= filter if staff grows to thousands.
export const workload = async () => {
  const today = new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}T00:00:00+05:30`);
  const rows = await Task.aggregate([
    { $match: { status: { $ne: 'done' } } },
    { $project: { dueDate: 1, people: { $setUnion: [{ $cond: [{ $ifNull: ['$assignedTo', false] }, ['$assignedTo'], []] }, { $ifNull: ['$helpers', []] }] } } },
    { $unwind: '$people' },
    { $group: { _id: '$people', open: { $sum: 1 }, overdue: { $sum: { $cond: [{ $lt: ['$dueDate', today] }, 1, 0] } } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), { open: r.open, overdue: r.overdue }]));
};
