import Task from './task.model.js';
import User from '../auth/auth.model.js';
import * as taskRepo from './task.repository.js';
import * as notificationService from '../notifications/notification.service.js';
import { emitEntityUpdate } from '../../sockets/index.js';

const checkCircularDependency = async (taskId, depId, visited = new Set()) => {
  if (taskId === depId) return true;
  if (visited.has(depId)) return false;
  visited.add(depId);
  const dep = await taskRepo.findById(depId);
  if (!dep) return false;
  for (const d of dep.dependsOn || []) {
    if (await checkCircularDependency(taskId, d.toString(), visited)) return true;
  }
  return false;
};

export const createTask = async (data, user) => {
  const taskData = { ...data, createdBy: user._id };
  if (data.parent) {
    const parent = await taskRepo.findById(data.parent);
    if (!parent) throw { status: 404, message: 'Parent task not found' };
  }
  const task = await taskRepo.create(taskData);
  if (data.dependsOn?.length) {
    for (const depId of data.dependsOn) {
      await taskRepo.addDependency(task._id, depId);
      await Task.findByIdAndUpdate(depId, { $addToSet: { blockedBy: task._id } });
    }
  }
  const created = await taskRepo.findById(task._id);
  if (data.assignedTo) {
    const notif = notificationService.buildNotification('task_assigned', {
      taskTitle: created.title, actorName: user.name,
    });
    notificationService.createAndSend({
      recipient: data.assignedTo, referenceId: created._id, referenceModel: 'Task',
      actionBy: user._id, link: `/tasks/${created._id}`, channels: { inApp: true, email: true },
      ...notif,
    }).catch(() => {});
  }
  return created;
};

export const getTasks = async (query) => taskRepo.findAll(query);

export const getTaskById = async (id) => {
  const task = await taskRepo.findById(id);
  if (!task) throw { status: 404, message: 'Task not found' };
  return task;
};

export const updateTask = async (id, data, user) => {
  const task = await taskRepo.findById(id);
  if (!task) throw { status: 404, message: 'Task not found' };

  // Status gate: check dependencies before allowing in_progress/done
  if (data.status && ['in_progress', 'done'].includes(data.status) && task.dependsOn?.length) {
    const deps = await Promise.all(task.dependsOn.map((d) => taskRepo.findById(d)));
    const incomplete = deps.filter((d) => d && d.status !== 'done');
    if (incomplete.length > 0) {
      throw {
        status: 400,
        message: `Cannot mark as ${data.status}: ${incomplete.length} dependenc${incomplete.length === 1 ? 'y' : 'ies'} not completed`,
      };
    }
  }

  if (data.status === 'done') data.completedAt = new Date().toISOString();
  if (data.status && data.status !== 'done') data.completedAt = null;

  const changedFields = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'status' && task.status !== value) {
      changedFields.push({ action: 'status_changed', field: 'status', oldValue: task.status, newValue: value });
    }
    if (key === 'assignedTo' && String(task.assignedTo?._id || '') !== String(value || '')) {
      changedFields.push({ action: 'assigned', field: 'assignedTo', oldValue: task.assignedTo?.name || 'unassigned', newValue: value || 'unassigned' });
    }
  }

  const updated = await taskRepo.updateById(id, data);

  if (changedFields.length > 0 && user) {
    for (const activity of changedFields) {
      await taskRepo.addActivity(id, { ...activity, performedBy: user._id });
    }
  }

  if (user) {
    const statusChange = changedFields.find((c) => c.action === 'status_changed');
    if (statusChange) {
      const notif = notificationService.buildNotification('task_status_change', {
        taskTitle: updated.title, actorName: user.name, newStatus: statusChange.newValue,
      });
      // Notify assignee
      if (updated.assignedTo) {
        notificationService.createAndSend({
          recipient: updated.assignedTo._id, referenceId: updated._id, referenceModel: 'Task',
          actionBy: user._id, link: `/tasks/${updated._id}`, ...notif,
        }).catch(() => {});
      }
      // Notify creator (skip if same as assignee — prevents duplicate)
      if (updated.createdBy && (
          !updated.assignedTo || String(updated.createdBy._id) !== String(updated.assignedTo._id))) {
        notificationService.createAndSend({
          recipient: updated.createdBy._id, referenceId: updated._id, referenceModel: 'Task',
          actionBy: user._id, link: `/tasks/${updated._id}`, ...notif,
        }).catch(() => {});
      }
    }
    const assignChange = changedFields.find((c) => c.action === 'assigned');
    if (assignChange && data.assignedTo && String(data.assignedTo) !== String(user._id)) {
      const notif = notificationService.buildNotification('task_assigned', {
        taskTitle: updated.title, actorName: user.name,
      });
      notificationService.createAndSend({
        recipient: data.assignedTo, referenceId: updated._id, referenceModel: 'Task',
        actionBy: user._id, link: `/tasks/${updated._id}`, channels: { inApp: true, email: true },
        ...notif,
      }).catch(() => {});
    }
  }

  emitEntityUpdate('task', id, 'task_updated');
  return updated;
};

export const deleteTask = async (id, user) => {
  const task = await taskRepo.findById(id);
  if (!task) throw { status: 404, message: 'Task not found' };
  if (task.dependsOn?.length) {
    for (const depId of task.dependsOn) {
      await Task.findByIdAndUpdate(depId, { $pull: { blockedBy: id } });
    }
  }
  if (task.assignedTo && user && String(task.assignedTo._id) !== String(user._id)) {
    notificationService.createAndSend({
      recipient: task.assignedTo._id, type: 'task_deleted', title: 'Task Deleted',
      message: `"${task.title}" was deleted by ${user.name}`,
      referenceId: task._id, referenceModel: 'Task',
      actionBy: user._id, link: '',
    }).catch(() => {});
  }

  emitEntityUpdate('task', id, 'task_deleted');
  return taskRepo.deleteById(id);
};

// Subtasks
export const getSubtasks = async (parentId) => {
  const parent = await taskRepo.findById(parentId);
  if (!parent) throw { status: 404, message: 'Task not found' };
  return taskRepo.findSubtasks(parentId);
};

// Dependencies
export const addDependencies = async (taskId, depIds) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw { status: 404, message: 'Task not found' };
  for (const depId of depIds) {
    if (await checkCircularDependency(taskId, depId)) {
      throw { status: 400, message: 'Adding this dependency would create a circular reference' };
    }
    await taskRepo.addDependency(taskId, depId);
    await Task.findByIdAndUpdate(depId, { $addToSet: { blockedBy: taskId } });
  }
  return taskRepo.findById(taskId);
};

export const removeDependency = async (taskId, depId) => {
  await taskRepo.removeDependency(taskId, depId);
  await Task.findByIdAndUpdate(depId, { $pull: { blockedBy: taskId } });
  return taskRepo.findById(taskId);
};

export const getDependencies = async (taskId) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw { status: 404, message: 'Task not found' };
  return { dependsOn: task.dependsOn || [], blockedBy: task.blockedBy || [] };
};

// Comments
// Matches @[Name](userId) markdown-style and plain @Name
const MENTION_MD_RE = /@\[([^\]]+)\]\(([a-fA-F0-9]+)\)/g;
const MENTION_PLAIN_RE = /@(\w[\w.\-']*(?:\s+\w[\w.\-']*)?)/g;

const sendMentionNotif = (mentioned, commenter, taskId, taskTitle) => {
  if (String(mentioned._id) === String(commenter._id)) return;
  const notif = notificationService.buildNotification('mention', {
    actorName: commenter.name,
    entityTitle: taskTitle,
  });
  notificationService.createAndSend({
    recipient: mentioned._id,
    referenceId: taskId, referenceModel: 'Task',
    actionBy: commenter._id,
    link: `/tasks/${taskId}`,
    ...notif,
  }).catch(() => {});
};

const processMentions = async (text, commenter, taskId, taskTitle) => {
  // 1) Parse @[Name](userId) — exact ID match, no ambiguity
  const mdMatches = [...text.matchAll(MENTION_MD_RE)];
  const mdUserIds = [...new Set(mdMatches.map((m) => m[2]))];
  if (mdUserIds.length) {
    const matched = await User.find({ _id: { $in: mdUserIds } });
    matched.forEach((u) => sendMentionNotif(u, commenter, taskId, taskTitle));
    // Skip plain mentions for users already notified
    const remaining = [...text.matchAll(MENTION_PLAIN_RE)]
      .map((m) => m[1].trim())
      .filter((name) => !matched.some((u) => u.name === name || u.email?.split('@')[0] === name));
    if (!remaining.length) return;
    const plainMatched = await User.find({ name: { $in: remaining } });
    plainMatched.forEach((u) => sendMentionNotif(u, commenter, taskId, taskTitle));
    return;
  }

  // 2) Plain @Name only
  const plainMatches = [...text.matchAll(MENTION_PLAIN_RE)];
  if (!plainMatches.length) return;
  const usernames = [...new Set(plainMatches.map((m) => m[1].trim()))];
  const matched = await User.find({ name: { $in: usernames } });
  matched.forEach((u) => sendMentionNotif(u, commenter, taskId, taskTitle));
};

export const addComment = async (taskId, text, user) => {
  const comment = { text, createdBy: user._id };
  const task = await taskRepo.addComment(taskId, comment);
  if (!task) throw { status: 404, message: 'Task not found' };
  await taskRepo.addActivity(taskId, { action: 'commented', field: 'comment', performedBy: user._id });

  processMentions(text, user, taskId, task.title).catch(() => {});

  if (task.assignedTo && !task.assignedTo._id.equals(user._id)) {
    const notif = notificationService.buildNotification('task_comment', {
      taskTitle: task.title, actorName: user.name,
    });
    notificationService.createAndSend({
      recipient: task.assignedTo._id, referenceId: task._id, referenceModel: 'Task',
      actionBy: user._id, link: `/tasks/${task._id}`, ...notif,
    }).catch(() => {});
  }

  emitEntityUpdate('task', taskId, 'comment_added');

  return task;
};

// Checklists
export const addChecklistItem = async (taskId, text, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw { status: 404, message: 'Task not found' };
  const order = (task.checklists?.length || 0);
  const item = { text, order, createdBy: user._id };
  const updated = await taskRepo.addChecklistItem(taskId, item);
  return updated;
};

export const updateChecklistItem = async (taskId, itemId, data) => {
  const updated = await taskRepo.updateChecklistItem(taskId, itemId, data);
  if (!updated) throw { status: 404, message: 'Task or checklist item not found' };
  // Recalculate progress
  const total = updated.checklists?.length || 0;
  const done = updated.checklists?.filter((c) => c.checked).length || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  return taskRepo.updateById(taskId, { checklistProgress: progress });
};

export const removeChecklistItem = async (taskId, itemId) => {
  const updated = await taskRepo.removeChecklistItem(taskId, itemId);
  if (!updated) throw { status: 404, message: 'Task not found' };
  const total = updated.checklists?.length || 0;
  const done = updated.checklists?.filter((c) => c.checked).length || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  return taskRepo.updateById(taskId, { checklistProgress: progress });
};

export const reorderChecklist = async (taskId, orderedIds) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw { status: 404, message: 'Task not found' };
  const reordered = orderedIds.map((id, i) => {
    const item = task.checklists?.id(id);
    if (item) item.order = i;
    return item;
  }).filter(Boolean);
  return taskRepo.updateById(taskId, { checklists: reordered });
};

// Watchers
export const addWatcher = async (taskId, userId) => {
  const task = await taskRepo.addWatcher(taskId, userId);
  if (!task) throw { status: 404, message: 'Task not found' };
  return task;
};

export const removeWatcher = async (taskId, userId) => {
  const task = await taskRepo.removeWatcher(taskId, userId);
  if (!task) throw { status: 404, message: 'Task not found' };
  return task;
};

export const getWatchedTasks = async (userId, query) => {
  return taskRepo.findAll({ ...query, watchedBy: userId });
};

// Time Tracking
export const addTimeEntry = async (taskId, entryData, user) => {
  const entry = { ...entryData, createdBy: user._id };
  const updated = await taskRepo.addTimeEntry(taskId, entry);
  if (!updated) throw { status: 404, message: 'Task not found' };
  const total = updated.timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  return taskRepo.updateById(taskId, { totalLoggedHours: total });
};

export const removeTimeEntry = async (taskId, entryId) => {
  const updated = await taskRepo.removeTimeEntry(taskId, entryId);
  if (!updated) throw { status: 404, message: 'Task not found' };
  const total = updated.timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  return taskRepo.updateById(taskId, { totalLoggedHours: total });
};

// Reorder
export const reorderTasks = async (status, orderedIds) => {
  await Promise.all(orderedIds.map((id, i) => taskRepo.updateById(id, { status, order: i })));
};

// Bulk update
export const bulkUpdate = async (ids, data) => {
  await Promise.all(ids.map((id) => taskRepo.updateById(id, data)));
};
