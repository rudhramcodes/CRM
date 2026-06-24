import ApiResponse from '../../utils/ApiResponse.js';
import * as projectService from './project.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await projectService.getProjects(req.query, req.user);
    ApiResponse.paginated(res, result.projects, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    ApiResponse.success(res, 200, { project });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body, req.user);
    ApiResponse.created(res, { project }, 'Project created successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    ApiResponse.success(res, 200, { project }, 'Project updated successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await projectService.deleteProject(req.params.id);
    ApiResponse.success(res, 200, null, 'Project deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const stats = async (req, res, next) => {
  try {
    const projectStats = await projectService.getProjectStats();
    ApiResponse.success(res, 200, projectStats);
  } catch (error) {
    next(error);
  }
};
