import ApiResponse from '../../utils/ApiResponse.js';
import * as taskService from './task.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await taskService.getTasks(req.query, req.user);
    ApiResponse.paginated(res, result.tasks, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    ApiResponse.success(res, 200, { task });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body, req.user);
    ApiResponse.created(res, { task }, 'Task created successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user);
    ApiResponse.success(res, 200, { task }, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id);
    ApiResponse.success(res, 200, null, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const stats = async (req, res, next) => {
  try {
    const taskStats = await taskService.getTaskStats();
    ApiResponse.success(res, 200, taskStats);
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const task = await taskService.addComment(req.params.id, req.body, req.user);
    ApiResponse.success(res, 200, { task }, 'Comment added');
  } catch (error) {
    next(error);
  }
};

export const bulkUpdate = async (req, res, next) => {
  try {
    const result = await taskService.bulkUpdate(req.body.ids, req.body);
    ApiResponse.success(res, 200, result, 'Tasks updated');
  } catch (error) {
    next(error);
  }
};

export const reorder = async (req, res, next) => {
  try {
    const result = await taskService.reorderTasks(req.body.status, req.body.orderedIds);
    ApiResponse.success(res, 200, result, 'Tasks reordered');
  } catch (error) {
    next(error);
  }
};
