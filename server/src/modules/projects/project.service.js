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
    tasks: (data.tasks || []).map((t) => ({
      ...t,
      dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
      createdBy: user._id,
    })),
    tags: data.tags || [],
    createdBy: user._id,
    activities: [{ action: 'project_created', performedBy: user._id }],
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

export const updateProject = async (id, data, user) => {
  const project = await projectRepository.findById(id);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }

  const updateData = { ...data };
  const activities = [];

  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.deadline) updateData.deadline = new Date(data.deadline);

  if (data.milestones) {
    updateData.milestones = data.milestones.map((m) => ({
      ...m,
      dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
    }));
  }

  if (data.tasks) {
    updateData.tasks = data.tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
    }));
    activities.push({ action: 'tasks_updated', performedBy: user._id });
  }

  if (data.status && data.status !== project.status) {
    activities.push({
      action: 'status_changed',
      field: 'status',
      oldValue: project.status,
      newValue: data.status,
      performedBy: user._id,
    });
  }

  if (data.status === 'completed' && project.status !== 'completed') {
    updateData.completedAt = new Date();
  }

  if (data.status && data.status !== 'completed' && project.status === 'completed') {
    updateData.completedAt = null;
  }

  return projectRepository.updateById(id, updateData, activities);
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
  const stats = { total: 0, planning: 0, active: 0, review: 0, completed: 0 };

  for (const item of statusCounts) {
    stats[item._id] = item.count;
    stats.total += item.count;
  }

  return stats;
};

// --- Tasks ---
export const addTask = async (projectId, data, user) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const task = {
    title: data.title,
    description: data.description || '',
    status: data.status || 'todo',
    priority: data.priority || 'medium',
    assignedTo: data.assignedTo || undefined,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    createdBy: user._id,
  };

  project.tasks.push(task);
  project.activities.push({ action: 'task_added', performedBy: user._id });
  await project.save();
  return project.tasks[project.tasks.length - 1];
};

export const updateTask = async (projectId, taskId, data, user) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const task = project.tasks.id(taskId);
  if (!task) throw ApiError.notFound('Task not found');

  Object.assign(task, data);
  if (data.dueDate) task.dueDate = new Date(data.dueDate);
  if (data.status === 'done' && task.status !== 'done') task.completedAt = new Date();
  if (data.status && data.status !== 'done') task.completedAt = null;

  project.activities.push({ action: 'task_updated', performedBy: user._id });
  await project.save();
  return task;
};

export const deleteTask = async (projectId, taskId, user) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const task = project.tasks.id(taskId);
  if (!task) throw ApiError.notFound('Task not found');

  project.tasks.pull(taskId);
  project.activities.push({ action: 'task_deleted', performedBy: user._id });
  await project.save();
};

// --- Activities ---
export const getActivities = async (projectId) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  return (project.activities || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
