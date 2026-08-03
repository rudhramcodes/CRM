import ApiError from '../../utils/ApiError.js';
import * as projectRepository from './project.repository.js';
import { uploadBuffer } from '../../services/cloudinaryService.js';
import Task from '../tasks/task.model.js';
import Client from '../clients/client.model.js';
import * as notificationService from '../notifications/notification.service.js';

const assertClientExists = async (clientId) => {
  const client = await Client.findById(clientId).select('_id');
  if (!client) {
    throw ApiError.badRequest('Selected client does not exist');
  }
};

export const createProject = async (data, user) => {
  await assertClientExists(data.client);

  const payload = {
    title: data.title,
    client: data.client,
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

  const project = await projectRepository.create(payload);

  // Notify team members
  const members = data.teamMembers || [];
  if (members.length > 0) {
    const notif = notificationService.buildNotification('project_assigned', {
      projectName: project.title, actorName: user.name,
    });
    notificationService.createAndSendBulk(
      members.filter((m) => String(m) !== String(user._id)),
      {
        referenceId: project._id, referenceModel: 'Project',
        actionBy: user._id, link: `/projects/${project._id}`, ...notif,
      },
    ).catch(() => {});
  }

  return project;
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

  if (data.client) {
    await assertClientExists(data.client);
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

  const updated = await projectRepository.updateById(id, updateData, activities);

  if (data.status && data.status !== project.status && project.teamMembers?.length) {
    const notif = notificationService.buildNotification('project_status_change', {
      projectName: project.title, actorName: user.name, newStatus: data.status,
    });
    const memberIds = project.teamMembers
      .map((m) => (m.user?._id || m.user))
      .filter((uid) => String(uid) !== String(user._id));
    if (memberIds.length > 0) {
      notificationService.createAndSendBulk(memberIds, {
        referenceId: project._id, referenceModel: 'Project',
        actionBy: user._id, link: `/projects/${project._id}`,
        ...notif,
      }).catch(() => {});
    }
  }

  return updated;
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
  const saved = project.tasks[project.tasks.length - 1];
  if (data.assignedTo && String(data.assignedTo) !== String(user._id)) {
    const notif = notificationService.buildNotification('task_assigned', {
      taskTitle: task.title, actorName: user.name,
    });
    notificationService.createAndSend({
      recipient: data.assignedTo, referenceId: saved._id, referenceModel: 'Task',
      actionBy: user._id, link: `/projects/${projectId}`,
      ...notif,
    }).catch(() => {});
  }
  return saved;
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

// --- Messages ---
const TASK_CMD_RE = /^\/task\s+"([^"]+)"(?:\s+@(\S+))?(?:\s+priority:(\w+))?(?:\s+due:(\S+))?/i;

const parseTaskCommand = (text) => {
  const match = text.match(TASK_CMD_RE);
  if (!match) return null;
  return {
    title: match[1],
    assigneeUsername: match[2] || null,
    priority: match[3] || 'medium',
    dueDate: match[4] || null,
  };
};

export const addMessage = async (projectId, data, user, files = []) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const images = await Promise.all(
    (files || []).map(async (f) => {
      try {
        return await uploadBuffer(f.buffer, { folder: 'crm/messages' });
      } catch {
        return { url: `/uploads/${f.originalname}`, fileId: `local-${Date.now()}`, name: f.originalname };
      }
    }),
  );

  const messageData = {
    text: data.text || '',
    images,
    createdBy: user._id,
  };

  // Check for /task command → create standalone Task, store ref in message
  const taskCmd = data.text ? parseTaskCommand(data.text) : null;
  if (taskCmd) {
    const taskData = {
      title: taskCmd.title,
      status: 'todo',
      priority: taskCmd.priority || 'medium',
      dueDate: taskCmd.dueDate ? new Date(taskCmd.dueDate) : undefined,
      project: project._id,
      createdBy: user._id,
    };

    if (taskCmd.assigneeUsername) {
      const User = (await import('../auth/auth.model.js')).default;
      const assignedUser = await User.findOne({ name: new RegExp(`^${taskCmd.assigneeUsername}$`, 'i') });
      if (assignedUser) taskData.assignedTo = assignedUser._id;
    }

    const standaloneTask = await Task.create(taskData);
    messageData.taskId = standaloneTask._id;
    messageData.taskTitle = taskCmd.title;
    project.activities.push({ action: 'task_added', performedBy: user._id });
  }

  project.messages.push(messageData);
  project.activities.push({ action: 'message_posted', performedBy: user._id });
  await project.save();

  const saved = project.messages[project.messages.length - 1];
  return saved;
};

export const getMessages = async (projectId) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  await project.populate('messages.createdBy', 'name email avatar');
  return (project.messages || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const deleteMessage = async (projectId, messageId, user) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const message = project.messages.id(messageId);
  if (!message) throw ApiError.notFound('Message not found');
  if (!message.createdBy._id.equals(user._id)) throw ApiError.forbidden('You can only delete your own messages');

  project.messages.pull(messageId);
  await project.save();
};

// --- Activities ---
export const getActivities = async (projectId) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  return (project.activities || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}