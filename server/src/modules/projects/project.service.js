import ApiError from '../../utils/ApiError.js';
import generateProjectCode from '../../utils/generateProjectCode.js';
import * as projectRepository from './project.repository.js';
import { uploadBuffer } from '../../services/cloudinaryService.js';
import Task from '../tasks/task.model.js';
import Client from '../clients/client.model.js';
import * as notificationService from '../notifications/notification.service.js';
import { emitEntityUpdate } from '../../sockets/index.js';
import logger from '../../utils/logger.js';
import User from '../auth/auth.model.js';
import { QC_ITEMS, LEGACY_STAGE, STAGE_STATUS, assertProjectEditor, getStageChange } from './projectStage.js';
import { deadlineChange } from '../../utils/deadlineChange.js';

const resetQC = () => Object.fromEntries([
  ...QC_ITEMS.map((key) => [key, { checked: false }]), ['status', 'pending'],
]);

const notifyStageReversal = async (project, user, change) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] }, isActive: true }).select('_id');
    const notification = notificationService.buildNotification('project_stage_reverted', {
      projectName: project.title, actorName: user.name,
      fromStage: change.fromStage, toStage: change.toStage, reason: change.reason,
    });
    await notificationService.createAndSendBulk(admins.map((admin) => admin._id), {
      ...notification, priority: 'high', referenceId: project._id, referenceModel: 'Project',
      actionBy: user._id, link: `/projects/${project._id}`, metadata: { ...change },
    });
  } catch (error) {
    logger.error(`Stage reversal notification failed: ${error.message}`);
  }
};

const assertClientExists = async (clientId) => {
  const client = await Client.findById(clientId).select('_id brand');
  if (!client) {
    throw ApiError.badRequest('Selected client does not exist');
  }
  return client;
};

const assertOwnerExists = async (ownerId) => {
  const owner = await User.exists({ _id: ownerId, role: { $ne: 'client' }, isActive: true });
  if (!owner) throw ApiError.badRequest('Select an active staff member as project owner');
};

const assertClientProjectAccess = async (project, clientProfile) => {
  if (!clientProfile) return;
  const projectClientId = project.client?._id || project.client;
  if (String(projectClientId) !== String(clientProfile._id)) {
    throw ApiError.forbidden('Access denied to this project');
  }
};

export const createProject = async (data, user) => {
  if (data.status && data.status !== 'planning') {
    throw ApiError.badRequest('New projects start at Brief. Change stage after creation.');
  }
  const client = await assertClientExists(data.client);
  await assertOwnerExists(data.ownerId);

  const payload = {
    title: data.title,
    client: data.client,
    ownerId: data.ownerId,
    brand: client.brand,
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
    projectCode: data.projectCode?.trim() || (await generateProjectCode(client.brand)),
    location: data.location,
    duration: data.duration,
    inwardData: data.inwardData,
    deliverables: data.deliverables || [],
    teamDeployment: data.teamDeployment,
    createdBy: user._id,
    activities: [{ action: 'project_created', performedBy: user._id }],
  };

  const project = await projectRepository.create(payload);

  // Notify team members (empty members → Cliq team broadcast still fires)
  const members = (data.teamMembers || [])
    .filter((m) => String(m) !== String(user._id));
  const notif = notificationService.buildNotification('project_assigned', {
    projectName: project.title, actorName: user.name,
  });
  notificationService.createAndSendBulk(members, {
    referenceId: project._id, referenceModel: 'Project',
    actionBy: user._id, link: `/projects/${project._id}`, ...notif,
  }).catch(() => {});

  return project;
};

export const getProjects = async (query, _user, clientProfile) => {
  const { page, limit, sortBy, sortOrder, ...filters } = query;
  const options = { page, limit, sortBy, sortOrder };
  if (clientProfile) options.client = clientProfile._id;

  return projectRepository.findAll(filters, options);
};

export const getProjectById = async (id, user, clientProfile) => {
  const project = await projectRepository.findById(id);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  if (user?.role === 'client') {
    await assertClientProjectAccess(project, clientProfile);
  }
  return project;
};

export const updateProject = async (id, data, user, { milestonesOnly = false } = {}) => {
  const project = await projectRepository.findById(id);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }

  if (milestonesOnly && user.role === 'employee') {
    const assigned = (project.teamMembers || []).some((member) => String(member.user?._id || member.user) === String(user._id));
    if (!assigned) throw ApiError.forbidden('Only assigned staff can edit project milestones');
  } else {
    assertProjectEditor(project, user);
  }

  const updateData = { ...data };
  delete updateData.reason;
  delete updateData.stage;
  delete updateData.status;
  // Sign-off metadata is written only by the dedicated authenticated endpoints.
  for (const key of ['qcChecklist', 'closingNote', 'stageHistory', 'progress', 'completedAt']) delete updateData[key];
  if (data.client) {
    const client = await assertClientExists(data.client);
    updateData.brand = client.brand;
  }
  if (data.ownerId) await assertOwnerExists(data.ownerId);
  const activities = [];
  if (data.deadline !== undefined) {
    const activity = deadlineChange(project.deadline, data.deadline, data.reason, user, 'deadline');
    if (activity) activities.push(activity);
    updateData.deadline = data.deadline ? new Date(data.deadline) : null;
  }
  for (const field of ['milestones', 'tasks']) {
    if (!data[field]) continue;
    for (const oldItem of project[field] || []) {
      const newItem = data[field].find((item) => String(item._id) === String(oldItem._id));
      const activity = deadlineChange(oldItem.dueDate, newItem?.dueDate, data.reason, user, `${field}.${oldItem._id}.dueDate`);
      if (activity) activities.push(activity);
    }
  }

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

  const scopeFields = ['title', 'description', 'budget', 'deliverables', 'milestones'];
  const scopeChanged = (data.client !== undefined && String(project.client?._id || project.client) !== data.client)
    || scopeFields.some((key) => data[key] !== undefined
      && JSON.stringify(project.toObject()[key]) !== JSON.stringify(data[key]));
  if (scopeChanged) {
    if (project.stage === 'delivered') throw ApiError.badRequest('Reopen the project with a reason before changing reviewed scope');
    updateData.qcChecklist = resetQC();
    activities.push({ action: 'qc_invalidated', field: 'qcChecklist', oldValue: JSON.stringify(project.qcChecklist),
      newValue: JSON.stringify(updateData.qcChecklist), performedBy: user._id });
  }

  const legacyTarget = data.status && data.status !== project.status ? LEGACY_STAGE[data.status] : undefined;
  if (data.stage && data.status && STAGE_STATUS[data.stage] !== data.status) {
    throw ApiError.badRequest('Stage and status disagree');
  }
  const target = data.stage || legacyTarget;
  const candidate = { ...project.toObject(), ...updateData };
  const change = target ? getStageChange(candidate, target, user, data.reason) : null;
  if (change) {
    const { backwards, ...history } = change;
    updateData.stage = target;
    updateData.status = STAGE_STATUS[target];
    updateData.stageHistory = [...project.stageHistory.map((item) => item.toObject()), history];
    updateData.completedAt = target === 'delivered' ? history.changedAt : null;
    if (backwards) {
      updateData.qcChecklist = resetQC();
      updateData.closingNote = {};
      activities.push({ action: 'sign_off_reset', field: 'signOff',
        oldValue: JSON.stringify({ qcChecklist: project.qcChecklist, closingNote: project.closingNote }),
        newValue: JSON.stringify({ qcChecklist: updateData.qcChecklist, closingNote: {} }),
        reason: history.reason, performedBy: user._id });
    }
    activities.push({ action: 'stage_changed', field: 'stage', oldValue: history.fromStage,
      newValue: history.toStage, reason: history.reason, performedBy: user._id });
  }

  const updated = await projectRepository.updateById(id, updateData, activities, project.__v ?? null);

  emitEntityUpdate('project', id, 'project_updated');

  if (change?.backwards) await notifyStageReversal(updated, user, change);
  if (change && !change.backwards) {
    const notif = notificationService.buildNotification('project_status_change', {
      projectName: project.title, actorName: user.name, newStatus: change.toStage,
    });
    const memberIds = (project.teamMembers || [])
      .map((m) => (m.user?._id || m.user))
      .filter((uid) => String(uid) !== String(user._id));
    // Empty memberIds → Cliq team broadcast still fires
    notificationService.createAndSendBulk(memberIds, {
      referenceId: project._id, referenceModel: 'Project',
      actionBy: user._id, link: `/projects/${project._id}`,
      ...notif,
    }).catch(() => {});
  }

  return updated;
};

export const changeProjectStage = (projectId, targetStage, user, reason) =>
  updateProject(projectId, { stage: targetStage, reason }, user);

export const saveQualityCheck = async (id, checks, user) => {
  if (!['admin', 'super_admin'].includes(user.role)) throw ApiError.forbidden('Only Admin can complete quality checks');
  const project = await projectRepository.findById(id);
  if (!project) throw ApiError.notFound('Project not found');
  if (!project.stage) throw ApiError.conflict('Migrate this legacy project before recording SOP sign-off');
  if (project.stage === 'delivered') throw ApiError.badRequest('Reopen the project before changing quality checks');
  const now = new Date();
  const qcChecklist = Object.fromEntries(QC_ITEMS.map((key) => [key, {
    checked: checks[key], checkedBy: user._id, checkedAt: now,
  }]));
  qcChecklist.status = QC_ITEMS.every((key) => checks[key] === true) ? 'passed' : 'pending';
  const updated = await projectRepository.updateById(id, { qcChecklist }, [{
    action: 'quality_check', field: 'qcChecklist', oldValue: JSON.stringify(project.qcChecklist),
    newValue: JSON.stringify(qcChecklist), performedBy: user._id,
  }], project.__v ?? null);
  emitEntityUpdate('project', id, 'project_updated');
  return updated;
};

export const saveClosingNote = async (id, data, user) => {
  const project = await projectRepository.findById(id);
  if (!project) throw ApiError.notFound('Project not found');
  assertProjectEditor(project, user);
  if (!project.stage) throw ApiError.conflict('Migrate this legacy project before recording SOP sign-off');
  if (project.stage === 'delivered') throw ApiError.badRequest('Reopen the project before changing its Closing Note');
  const closingNote = { deliveredWhat: data.deliveredWhat, deliveredWhen: new Date(data.deliveredWhen),
    pendingItems: data.pendingItems || '', writtenBy: user._id, writtenAt: new Date() };
  const updated = await projectRepository.updateById(id, { closingNote }, [{
    action: 'closing_note_saved', field: 'closingNote', oldValue: JSON.stringify(project.closingNote),
    newValue: JSON.stringify(closingNote), performedBy: user._id,
  }], project.__v ?? null);
  emitEntityUpdate('project', id, 'project_updated');
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
  const [stageCounts, brandCounts] = await Promise.all([
    projectRepository.countByStage(),
    projectRepository.countByBrand(),
  ]);

  const stats = { total: 0, brief: 0, planning: 0, execution: 0, review: 0, delivered: 0 };

  for (const item of stageCounts) {
    if (stats[item._id] !== undefined) stats[item._id] = item.count;
    stats.total += item.count;
  }

  const byBrand = {};
  for (const item of brandCounts) {
    byBrand[item._id || 'unassigned'] = item.count;
  }

  return { ...stats, byBrand };
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
  emitEntityUpdate('project', projectId, 'task_added', { taskId: saved._id });
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

  const activity = data.dueDate !== undefined ? deadlineChange(task.dueDate, data.dueDate, data.reason, user, `tasks.${taskId}.dueDate`) : null;
  const { reason, ...taskData } = data;
  Object.assign(task, taskData);
  if (activity) project.activities.push(activity);
  if (data.dueDate) task.dueDate = new Date(data.dueDate);
  if (data.status === 'done' && task.status !== 'done') task.completedAt = new Date();
  if (data.status && data.status !== 'done') task.completedAt = null;

  project.activities.push({ action: 'task_updated', performedBy: user._id });
  await project.save();
  emitEntityUpdate('project', projectId, 'task_updated', { taskId });
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
  emitEntityUpdate('project', projectId, 'task_deleted', { taskId });
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

export const addMessage = async (projectId, data, user, clientProfile, files = []) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  if (user.role === 'client') {
    await assertClientProjectAccess(project, clientProfile);
    if (data.text?.trim().toLowerCase().startsWith('/task')) {
      throw ApiError.forbidden('Clients cannot create tasks from chat');
    }
  }

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

    if (!taskData.assignedTo || !taskData.dueDate || Number.isNaN(taskData.dueDate.getTime())) {
      throw ApiError.badRequest('Chat tasks require a matching assignee and a valid deadline. Use the task form to select both.');
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

  emitEntityUpdate('project', project._id, 'message_added', { messageId: saved._id });

  const chatNotif = notificationService.buildNotification('project_chat', {
    senderName: user.name,
    message: data.text ? data.text.slice(0, 120) : '📎 image',
  });

  if (user.role === 'client') {
    // Broadcast notification to ALL internal staff users (Super Admin, Admin, Manager, Employee)
    const User = (await import('../auth/auth.model.js')).default;
    const staffUsers = await User.find({
      role: { $ne: 'client' },
      isActive: true,
    }).select('_id');

    const recipientIds = staffUsers
      .map((u) => u._id.toString())
      .filter((uid) => uid !== String(user._id));

    const messagePreview = data.text?.trim()
      ? (data.text.length > 120 ? `${data.text.slice(0, 117)}...` : data.text)
      : (images?.length ? '📎 Sent an image/attachment' : 'New message');

    const clientNotif = {
      type: 'project_chat',
      title: `Client Message • ${project.title}`,
      message: `${user.name || 'Client'}: ${messagePreview}`,
      priority: 'high',
    };

    notificationService.createAndSendBulk(recipientIds, {
      referenceId: saved._id,
      referenceModel: 'Project',
      actionBy: user._id,
      link: `/projects/${project._id}`,
      ...clientNotif,
    }).catch((err) => {
      logger.error('Failed to notify staff of client message', { error: err.message });
    });
  } else {
    const clientId = project.client?._id || project.client;
    const linkedClient = clientId ? await Client.findById(clientId).select('user').lean() : null;
    if (linkedClient?.user) {
      notificationService.createAndSend({
        recipient: linkedClient.user,
        referenceId: saved._id,
        referenceModel: 'Project',
        actionBy: user._id,
        link: `/portal/projects/${project._id}`,
        ...chatNotif,
      }).catch(() => {});
    }
  }

  if (data.text) {
    const mentionRegex = /@\[([^\]]+)\]\(([a-fA-F0-9]+)\)/g;
    let mentionMatch;
    const mentionedIds = new Set();
    while ((mentionMatch = mentionRegex.exec(data.text)) !== null) {
      const userId = mentionMatch[2];
      if (userId !== String(user._id)) mentionedIds.add(userId);
    }
    if (mentionedIds.size > 0) {
      logger.info(`Mention notifications: ${mentionedIds.size} users mentioned in project ${project._id}`);
      const notif = notificationService.buildNotification('mention', {
        actorName: user.name,
        entityTitle: project.title,
      });
      try {
        await notificationService.createAndSendBulk([...mentionedIds], {
          referenceId: saved._id,
          referenceModel: 'Project',
          actionBy: user._id,
          link: `/projects/${project._id}`,
          ...notif,
        });
      } catch (err) {
        logger.error(`Mention notification failed: ${err.message}`);
      }
    }
  }

  return saved;
};

export const getMessages = async (projectId, user, clientProfile) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  if (user?.role === 'client') {
    await assertClientProjectAccess(project, clientProfile);
  }

  await project.populate('messages.createdBy', 'name email avatar');
  return (project.messages || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export const deleteMessage = async (projectId, messageId, user, clientProfile) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  if (user.role === 'client') {
    await assertClientProjectAccess(project, clientProfile);
  }

  const message = project.messages.id(messageId);
  if (!message) throw ApiError.notFound('Message not found');
  if (!message.createdBy._id.equals(user._id)) throw ApiError.forbidden('You can only delete your own messages');

  project.messages.pull(messageId);
  await project.save();
  emitEntityUpdate('project', projectId, 'message_deleted', { messageId });
};

// --- Activities ---
export const getActivities = async (projectId, user, clientProfile) => {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  if (user?.role === 'client') {
    await assertClientProjectAccess(project, clientProfile);
  }
  return (project.activities || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
