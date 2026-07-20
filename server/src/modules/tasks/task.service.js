import ApiError from '../../utils/ApiError.js';
import * as taskRepository from './task.repository.js';
import { TASK_STATUS } from '../../constants/index.js';

const TRACKED_FIELDS = ['status', 'priority', 'assignedTo', 'dueDate', 'title', 'description'];

function buildActivity(field, oldValue, newValue, userId) {
  return { action: 'update', field, oldValue: String(oldValue ?? ''), newValue: String(newValue ?? ''), performedBy: userId };
}

export const createTask = async (data, user) => {
  const lastTask = await taskRepository.findLastByStatus(data.status || TASK_STATUS.TODO);
  const payload = {
    title: data.title,
    description: data.description || '',
    status: data.status || 'todo',
    priority: data.priority || 'medium',
    assignedTo: data.assignedTo || undefined,
    project: data.project || undefined,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    estimatedHours: data.estimatedHours || 0,
    tags: data.tags || [],
    order: (lastTask?.order ?? -1) + 1,
    createdBy: user._id,
  };
  return taskRepository.create(payload);
};

export const getTasks = async (query, user) => {
  const { page, limit, sortBy, sortOrder, ...filters } = query;
  const options = { page, limit, sortBy, sortOrder };

  if (user.role === 'employee') {
    filters.employeeFilter = user._id;
  }

  return taskRepository.findAll(filters, options);
};

export const getTaskById = async (id) => {
  const task = await taskRepository.findById(id);
  if (!task) throw ApiError.notFound('Task not found');
  return task;
};

export const updateTask = async (id, data, user) => {
  const task = await taskRepository.findById(id);
  if (!task) throw ApiError.notFound('Task not found');

  const updateData = { ...data };
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  if (data.status === 'done' && task.status !== 'done') updateData.completedAt = new Date();
  if (data.status && data.status !== 'done' && task.status === 'done') updateData.completedAt = null;

  const updated = await taskRepository.updateById(id, updateData);

  const activities = [];
  for (const field of TRACKED_FIELDS) {
    const oldVal = task[field];
    const newVal = data[field];
    if (newVal !== undefined && newVal !== oldVal) {
      const resolvedOld = field === 'assignedTo' ? (oldVal?._id || oldVal || '') : (oldVal ?? '');
      const resolvedNew = field === 'assignedTo' ? (newVal?._id || newVal || '') : (newVal ?? '');
      if (String(resolvedOld) !== String(resolvedNew)) {
        activities.push(buildActivity(field, resolvedOld, resolvedNew, user._id));
      }
    }
  }

  if (activities.length > 0) {
    await taskRepository.addActivity(id, activities);
    return taskRepository.findById(id);
  }

  return updated;
};

export const deleteTask = async (id) => {
  const task = await taskRepository.findById(id);
  if (!task) throw ApiError.notFound('Task not found');
  return taskRepository.deleteById(id);
};

export const getTaskStats = async () => {
  const [statusCounts, overdue] = await Promise.all([
    taskRepository.countByStatus(),
    taskRepository.countOverdue(),
  ]);

  const stats = { total: 0, todo: 0, in_progress: 0, review: 0, done: 0, overdue };

  for (const item of statusCounts) {
    stats[item._id] = item.count;
    stats.total += item.count;
  }

  return stats;
};

export const addComment = async (taskId, data, user) => {
  const task = await taskRepository.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');

  return taskRepository.addComment(taskId, {
    text: data.text,
    createdBy: user._id,
  });
};

export const bulkUpdate = async (ids, data) => {
  if (!ids || ids.length === 0) throw ApiError.badRequest('No task IDs provided');

  const updateData = {};
  if (data.status) updateData.status = data.status;
  if (data.priority) updateData.priority = data.priority;
  if (data.assignedTo) updateData.assignedTo = data.assignedTo;

  if (data.status === 'done') updateData.completedAt = new Date();

  await taskRepository.bulkUpdate(ids, updateData);
  return { updated: ids.length };
};

export const reorderTasks = async (status, orderedIds) => {
  await taskRepository.reorderTasks(orderedIds);
  return { status, reordered: orderedIds.length };
};
