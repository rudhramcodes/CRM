import ApiResponse from '../../utils/ApiResponse.js';
import * as taskService from './task.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await taskService.getTasks(req.query);
    ApiResponse.paginated(res, result.tasks, result.pagination);
  } catch (err) { next(err); }
};

export const getById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    ApiResponse.success(res, 200, { task });
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body, req.user);
    ApiResponse.created(res, { task }, 'Task created successfully');
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user);
    ApiResponse.success(res, 200, { task }, 'Task updated successfully');
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id, req.user);
    ApiResponse.success(res, 200, null, 'Task deleted successfully');
  } catch (err) { next(err); }
};

// Subtasks
export const getSubtasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getSubtasks(req.params.id);
    ApiResponse.success(res, 200, { tasks });
  } catch (err) { next(err); }
};

// Dependencies
export const getDependencies = async (req, res, next) => {
  try {
    const deps = await taskService.getDependencies(req.params.id);
    ApiResponse.success(res, 200, deps);
  } catch (err) { next(err); }
};

export const addDependency = async (req, res, next) => {
  try {
    const task = await taskService.addDependencies(req.params.id, req.body.dependsOn);
    ApiResponse.success(res, 200, { task }, 'Dependencies added');
  } catch (err) { next(err); }
};

export const removeDependency = async (req, res, next) => {
  try {
    const task = await taskService.removeDependency(req.params.id, req.params.depId);
    ApiResponse.success(res, 200, { task }, 'Dependency removed');
  } catch (err) { next(err); }
};

// Comments
export const addComment = async (req, res, next) => {
  try {
    const task = await taskService.addComment(req.params.id, req.body.text, req.user);
    ApiResponse.success(res, 200, { task }, 'Comment added');
  } catch (err) { next(err); }
};

export const removeComment = async (req, res, next) => {
  try {
    const task = await taskService.removeComment(req.params.id, req.params.commentId, req.user);
    ApiResponse.success(res, 200, { task }, 'Comment removed');
  } catch (err) { next(err); }
};

// Checklists
export const addChecklistItem = async (req, res, next) => {
  try {
    const task = await taskService.addChecklistItem(req.params.id, req.body.text, req.user);
    ApiResponse.success(res, 200, { task }, 'Checklist item added');
  } catch (err) { next(err); }
};

export const updateChecklistItem = async (req, res, next) => {
  try {
    const task = await taskService.updateChecklistItem(req.params.id, req.params.itemId, req.body);
    ApiResponse.success(res, 200, { task }, 'Checklist item updated');
  } catch (err) { next(err); }
};

export const removeChecklistItem = async (req, res, next) => {
  try {
    const task = await taskService.removeChecklistItem(req.params.id, req.params.itemId);
    ApiResponse.success(res, 200, { task }, 'Checklist item removed');
  } catch (err) { next(err); }
};

export const reorderChecklist = async (req, res, next) => {
  try {
    const task = await taskService.reorderChecklist(req.params.id, req.body.orderedIds);
    ApiResponse.success(res, 200, { task }, 'Checklist reordered');
  } catch (err) { next(err); }
};

// Watchers
export const watchTask = async (req, res, next) => {
  try {
    const task = await taskService.addWatcher(req.params.id, req.user._id);
    ApiResponse.success(res, 200, { task }, 'Watching task');
  } catch (err) { next(err); }
};

export const unwatchTask = async (req, res, next) => {
  try {
    const task = await taskService.removeWatcher(req.params.id, req.user._id);
    ApiResponse.success(res, 200, { task }, 'Stopped watching');
  } catch (err) { next(err); }
};

export const getWatchedTasks = async (req, res, next) => {
  try {
    const result = await taskService.getWatchedTasks(req.user._id, req.query);
    ApiResponse.paginated(res, result.tasks, result.pagination);
  } catch (err) { next(err); }
};

// Time Tracking
export const addTimeEntry = async (req, res, next) => {
  try {
    const task = await taskService.addTimeEntry(req.params.id, req.body, req.user);
    ApiResponse.success(res, 200, { task }, 'Time logged');
  } catch (err) { next(err); }
};

export const removeTimeEntry = async (req, res, next) => {
  try {
    const task = await taskService.removeTimeEntry(req.params.id, req.params.entryId);
    ApiResponse.success(res, 200, { task }, 'Time entry removed');
  } catch (err) { next(err); }
};

// Reorder
export const reorderTasks = async (req, res, next) => {
  try {
    await taskService.reorderTasks(req.body.status, req.body.orderedIds);
    ApiResponse.success(res, 200, null, 'Tasks reordered');
  } catch (err) { next(err); }
};

// Bulk Update
export const bulkUpdate = async (req, res, next) => {
  try {
    await taskService.bulkUpdate(req.body.ids, req.body.data);
    ApiResponse.success(res, 200, null, 'Bulk update completed');
  } catch (err) { next(err); }
};
