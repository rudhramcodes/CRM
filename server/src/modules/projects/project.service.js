import ApiError from '../../utils/ApiError.js';
import * as projectRepository from './project.repository.js';

export const createProject = async (data, user) => {
  const payload = {
    title: data.title,
    description: data.description || '',
    status: data.status || 'planning',
    priority: data.priority || 'medium',
    budget: data.budget || 0,
    currency: data.currency || 'INR',
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    deadline: data.deadline ? new Date(data.deadline) : undefined,
    teamMembers: data.teamMembers || [],
    milestones: (data.milestones || []).map((m) => ({
      ...m,
      dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
    })),
    tags: data.tags || [],
    createdBy: user._id,
  };

  if (data.status === 'completed') {
    payload.completedAt = new Date();
  }

  return projectRepository.create(payload);
};

export const getProjects = async (query, user) => {
  const { page, limit, sortBy, sortOrder, ...filters } = query;

  const options = { page, limit, sortBy, sortOrder };

  if (user.role === 'employee') {
    filters.employeeFilter = user._id;
  }

  return projectRepository.findAll(filters, options);
};

export const getProjectById = async (id) => {
  const project = await projectRepository.findById(id);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  return project;
};

export const updateProject = async (id, data) => {
  const project = await projectRepository.findById(id);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }

  const updateData = { ...data };

  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.deadline) updateData.deadline = new Date(data.deadline);

  if (data.milestones) {
    updateData.milestones = data.milestones.map((m) => ({
      ...m,
      dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
    }));
  }

  if (data.status === 'completed' && project.status !== 'completed') {
    updateData.completedAt = new Date();
  }

  if (data.status && data.status !== 'completed' && project.status === 'completed') {
    updateData.completedAt = null;
  }

  return projectRepository.updateById(id, updateData);
};

export const deleteProject = async (id) => {
  const project = await projectRepository.findById(id);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  return projectRepository.deleteById(id);
};

export const getProjectStats = async () => {
  const statusCounts = await projectRepository.countByStatus();

  const stats = {
    total: 0,
    planning: 0,
    active: 0,
    review: 0,
    completed: 0,
  };

  for (const item of statusCounts) {
    stats[item._id] = item.count;
    stats.total += item.count;
  }

  return stats;
};
