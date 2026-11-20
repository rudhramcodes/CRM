import Task from './task.model.js';
import User from '../auth/auth.model.js';
import * as taskRepo from './task.repository.js';
import * as notificationService from '../notifications/notification.service.js';
import { emitEntityUpdate } from '../../sockets/index.js';
import ApiError from '../../utils/ApiError.js';
import { deadlineChange } from '../../utils/deadlineChange.js';
import { addWorkingMinutes } from '../../utils/workingHours.js';
import { deleteFile, uploadFile } from '../../services/fileUploadService.js';

const assertClientTaskAccess = async (taskId, clientProfile) => {
  if (!clientProfile) return null;
  const task = await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  const projectId = task.project?._id || task.project;
  const { default: Project } = await import('../projects/project.model.js');
  const project = projectId ? await Project.findById(projectId).select('client').lean() : null;
  if (!project || String(project.client) !== String(clientProfile._id)) {
    throw ApiError.forbidden('Access denied to this task');
  }
  return task;
};

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

// Helpers never include the owner or repeats.
const cleanHelpers = (helpers = [], owner) => [...new Set(helpers.map(String))].filter((h) => h !== String(owner || ''));

// The create endpoint: one shared task, or with copyForEach one task per person (owner first).
export const createTasks = async ({ copyForEach, ...data }, user) => {
  const helpers = cleanHelpers(data.helpers, data.assignedTo);
  if (!copyForEach || !helpers.length) return [await createTask({ ...data, helpers }, user)];
  const tasks = [];
  for (const person of [data.assignedTo, ...helpers]) tasks.push(await createTask({ ...data, assignedTo: person, helpers: [] }, user));
  return tasks;
};

export const createTask = async (data, user) => {
  const taskData = { ...data, helpers: cleanHelpers(data.helpers, data.assignedTo), createdBy: user._id };
  if (data.parent) {
    const parent = await taskRepo.findById(data.parent);
    if (!parent) throw { status: 404, message: 'Parent task not found' };
    if (['done', 'review'].includes(parent.status)) {
      await taskRepo.updateById(parent._id, { status: 'in_progress', completedAt: null });
      await taskRepo.addActivity(parent._id, {
        action: 'status_changed',
        field: 'status',
        oldValue: parent.status,
        newValue: 'in_progress',
        performedBy: user._id,
      });
      emitEntityUpdate('task', parent._id, 'task_updated');
    }
  }
  const task = await taskRepo.create(taskData);
  if (data.dependsOn?.length) {
    for (const depId of data.dependsOn) {
      await taskRepo.addDependency(task._id, depId);
      await Task.findByIdAndUpdate(depId, { $addToSet: { blockedBy: task._id } });
    }
  }
  const created = await taskRepo.findById(task._id);
  const createdProjectId = created.project?._id || created.project;
  if (createdProjectId) emitEntityUpdate('project', createdProjectId, 'task_added', { taskId: created._id });
  if (data.assignedTo) {
    const notif = notificationService.buildNotification('task_assigned', {
      taskTitle: created.title, actorName: user.name,
    });
    notificationService.createAndSend({
      recipient: data.assignedTo, referenceId: created._id, referenceModel: 'Task',
      actionBy: user._id, link: taskLink(created),
      ...notif,
    }).catch(() => {});
  }
  notifyHelpersAdded(created, taskData.helpers, user);
  return created;
};

const notifyHelpersAdded = (task, ids, user) => {
  const people = ids.map(String).filter((id) => id !== String(user._id));
  if (!people.length) return;
  notificationService.createAndSendBulk(people, {
    referenceId: task._id, referenceModel: 'Task', actionBy: user._id, link: taskLink(task),
    ...notificationService.buildNotification('task_assigned', { taskTitle: task.title, actorName: user.name }),
    message: `${user.name} added you as a helper on "${task.title}"`,
  }).catch(() => {});
};

export const getTasks = async (query, user, clientProfile) => {
  const options = {};
  if (user?.role === 'client' && clientProfile) {
    options.client = clientProfile._id;
  }
  return taskRepo.findAll(query, options);
};

export const getTaskById = async (id, user, clientProfile) => {
  const task = user?.role === 'client' ? await assertClientTaskAccess(id, clientProfile) : await taskRepo.findById(id);
  if (!task) throw ApiError.notFound('Task not found');
  return task;
};

const idOf = (x) => String(x?._id || x || '');
export const taskLink = (t) => (t.project ? `/projects/${t.project._id || t.project}` : '/tasks');
// "within 1 hour" when the clock is running now, else the office-hours deadline ("by 10:30 am, Tue").
export const dueText = (due) => {
  if (!due) return 'soon';
  if (due - Date.now() <= 61 * 60e3) return 'within 1 hour';
  const time = due.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  const day = due.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' });
  return `by ${time}, ${day}`;
};

export const updateTask = async (id, data, user) => {
  const task = await taskRepo.findById(id);
  if (!task) throw { status: 404, message: 'Task not found' };

  const oldHelpers = (task.helpers || []).map(idOf);
  if (data.helpers !== undefined || data.assignedTo !== undefined) {
    data.helpers = cleanHelpers(data.helpers ?? oldHelpers, data.assignedTo ?? idOf(task.assignedTo));
  }

  const deadlineActivity = data.dueDate !== undefined
    ? deadlineChange(task.dueDate, data.dueDate, data.reason, user) : null;
  delete data.reason;

  // Review roles: the reviewer (default: the creator) approves or asks for changes.
  const userId = idOf(user);
  const creatorId = idOf(task.createdBy);
  const canReview = !!userId && (userId === creatorId || userId === idOf(task.reviewer));
  const reviewerName = task.reviewer?.name || task.createdBy?.name || 'the task creator';
  const note = data.note || '';
  const askedChanges = !!data.requestChanges;
  delete data.note;
  delete data.requestChanges;

  const handedOver = data.reviewer !== undefined && data.reviewer !== idOf(task.reviewer || task.createdBy);
  if (data.reviewer !== undefined && !handedOver) delete data.reviewer;
  if (handedOver && userId !== creatorId && !['admin', 'super_admin'].includes(user?.role)) {
    throw ApiError.forbidden('Only the task creator can choose who reviews it');
  }

  if (data.status === 'done' && task.status !== 'done' && !canReview) {
    throw ApiError.forbidden(`Only ${reviewerName} can review and mark this task as completed`);
  }

  if (askedChanges) {
    if (!canReview) throw ApiError.forbidden(`Only ${reviewerName} can ask for changes`);
    if (!note) throw ApiError.badRequest('Say what needs to change');
    data.status = 'in_progress';
  } else {
    const contentKeys = Object.keys(data).filter(
      (k) => !['status', 'completedAt', 'order', 'checklistProgress', 'totalLoggedHours', 'reviewer', 'helpers', 'assignedTo'].includes(k)
    );
    const hasContentChanges = contentKeys.some((k) => {
      const oldVal = task[k];
      const newVal = data[k];
      if (newVal === undefined) return false;
      if (typeof newVal === 'object' && newVal !== null) {
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      }
      return String(oldVal ?? '') !== String(newVal ?? '');
    });

    if (task.status === 'done' && hasContentChanges && data.status !== 'done') {
      data.status = 'in_progress';
    }
  }

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

  // The 1-working-hour review clock starts on submit, and again when review is handed to someone else.
  const enteringReview = data.status === 'review' && task.status !== 'review';
  const restartClock = enteringReview || (handedOver && task.status === 'review' && !data.status);
  if (restartClock) {
    const now = new Date();
    Object.assign(data, {
      reviewer: data.reviewer || idOf(task.reviewer || task.createdBy),
      reviewRequestedAt: now, reviewDueAt: addWorkingMinutes(now, 60), reviewNudges: 0,
    });
    if (enteringReview) data.reviewNote = note;
  } else if (data.status && data.status !== 'review') {
    data.reviewDueAt = null;
  }

  const changedFields = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'status' && task.status !== value) {
      changedFields.push({ action: 'status_changed', field: 'status', oldValue: task.status, newValue: value });
    }
    if (key === 'assignedTo' && String(task.assignedTo?._id || '') !== String(value || '')) {
      changedFields.push({ action: 'assigned', field: 'assignedTo', oldValue: task.assignedTo?.name || 'unassigned', newValue: value || 'unassigned' });
    }
  }
  const addedHelpers = (data.helpers || []).filter((h) => !oldHelpers.includes(h));
  const removedHelpers = data.helpers ? oldHelpers.filter((h) => !data.helpers.includes(h)) : [];
  if (addedHelpers.length || removedHelpers.length) {
    const names = new Map((await User.find({ _id: { $in: [...addedHelpers, ...removedHelpers] } }).select('name').lean()).map((u) => [String(u._id), u.name]));
    const list = (ids) => ids.map((i) => names.get(i) || 'someone').join(', ');
    changedFields.push({ action: 'helpers_changed', field: 'helpers', oldValue: removedHelpers.length ? `removed ${list(removedHelpers)}` : '', newValue: addedHelpers.length ? `added ${list(addedHelpers)}` : '' });
  }

  let updated = await taskRepo.updateById(id, data,
    deadlineActivity ? [deadlineActivity] : [], deadlineActivity ? (task.dueDate || null) : undefined);

  // Notes land in the task chat so the whole thread sees why.
  if (note && (enteringReview || askedChanges)) {
    updated = await taskRepo.addComment(id, { text: `${askedChanges ? 'Changes needed' : 'For review'}: ${note}`, createdBy: user._id });
  }

  if (changedFields.length > 0 && user) {
    for (const activity of changedFields) {
      await taskRepo.addActivity(id, { ...activity, performedBy: user._id });
    }
  }

  if (user) {
    const statusChange = changedFields.find((c) => c.action === 'status_changed');
    const send = (recipient, type, extra = {}) => recipient && recipient !== userId && notificationService.createAndSend({
      recipient, referenceId: updated._id, referenceModel: 'Task', actionBy: user._id, dedup: false,
      link: taskLink(updated),
      ...notificationService.buildNotification(type, { taskTitle: updated.title, actorName: user.name, ...extra }),
    }).catch(() => {});
    const team = [idOf(updated.assignedTo), ...(updated.helpers || []).map(idOf)];

    if (restartClock) send(idOf(updated.reviewer), 'task_review_requested', { dueText: dueText(updated.reviewDueAt) });
    else if (askedChanges) team.forEach((id) => send(id, 'task_changes_requested', { note }));
    else if (statusChange?.newValue === 'done' && task.status === 'review') team.forEach((id) => send(id, 'task_approved'));
    else if (statusChange) {
      const notif = notificationService.buildNotification('task_status_change', {
        taskTitle: updated.title, actorName: user.name, newStatus: statusChange.newValue,
      });
      // Notify assignee (never the person who made the change)
      if (updated.assignedTo && String(updated.assignedTo._id) !== userId) {
        notificationService.createAndSend({
          recipient: updated.assignedTo._id, referenceId: updated._id, referenceModel: 'Task',
          actionBy: user._id, link: taskLink(updated), ...notif,
        }).catch(() => {});
      }
      // Notify creator (skip if same as assignee — prevents duplicate)
      if (updated.createdBy && String(updated.createdBy._id) !== userId && (
          !updated.assignedTo || String(updated.createdBy._id) !== String(updated.assignedTo._id))) {
        notificationService.createAndSend({
          recipient: updated.createdBy._id, referenceId: updated._id, referenceModel: 'Task',
          actionBy: user._id, link: taskLink(updated), ...notif,
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
        actionBy: user._id, link: taskLink(updated),
        ...notif,
      }).catch(() => {});
    }
    // The old owner hears where the task went (also when someone takes it for themselves).
    const oldOwner = idOf(task.assignedTo);
    if (assignChange && oldOwner && oldOwner !== userId && oldOwner !== String(data.assignedTo)) {
      notificationService.createAndSend({
        recipient: oldOwner, referenceId: updated._id, referenceModel: 'Task', actionBy: user._id, link: taskLink(updated),
        ...notificationService.buildNotification('task_assigned', { taskTitle: updated.title, actorName: user.name }),
        title: 'Task Reassigned', message: `${user.name} moved "${updated.title}" to ${updated.assignedTo?.name || 'someone else'}`,
      }).catch(() => {});
    }
    if (addedHelpers.length) notifyHelpersAdded(updated, addedHelpers, user);
  }

  emitEntityUpdate('task', id, 'task_updated');
  const updatedProjectId = updated.project?._id || updated.project;
  if (updatedProjectId) emitEntityUpdate('project', updatedProjectId, 'task_updated', { taskId: id });
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
    const projectLink = task.project?._id || task.project;
    const notif = notificationService.buildNotification('task_deleted', {
      taskTitle: task.title, actorName: user.name,
    });
    notificationService.createAndSend({
      recipient: task.assignedTo._id, referenceId: task._id, referenceModel: 'Task',
      actionBy: user._id, link: projectLink ? `/projects/${projectLink}` : '/dashboard',
      ...notif,
    }).catch(() => {});
  }

  emitEntityUpdate('task', id, 'task_deleted');
  const deletedProjectId = task.project?._id || task.project;
  if (deletedProjectId) emitEntityUpdate('project', deletedProjectId, 'task_deleted', { taskId: id });
  return taskRepo.deleteById(id);
};

// Subtasks
export const getSubtasks = async (parentId, user, clientProfile) => {
  const parent = user?.role === 'client' ? await assertClientTaskAccess(parentId, clientProfile) : await taskRepo.findById(parentId);
  if (!parent) throw ApiError.notFound('Task not found');
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

export const getDependencies = async (taskId, user, clientProfile) => {
  const task = user?.role === 'client' ? await assertClientTaskAccess(taskId, clientProfile) : await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  return { dependsOn: task.dependsOn || [], blockedBy: task.blockedBy || [] };
};

// Comments
// Matches @[Name](userId) markdown-style and plain @Name
const MENTION_MD_RE = /@\[([^\]]+)\]\(([a-fA-F0-9]+)\)/g;
const MENTION_PLAIN_RE = /@(\w[\w.\-']*(?:\s+\w[\w.\-']*)?)/g;

const sendMentionNotif = (mentioned, commenter, taskId, taskTitle, projectId) => {
  if (String(mentioned._id) === String(commenter._id)) return;
  const notif = notificationService.buildNotification('mention', {
    actorName: commenter.name,
    entityTitle: taskTitle,
  });
  notificationService.createAndSend({
    recipient: mentioned._id,
    referenceId: taskId, referenceModel: 'Task',
    actionBy: commenter._id,
    link: projectId ? `/projects/${projectId}` : '/tasks',
    ...notif,
  }).catch(() => {});
};

const processMentions = async (text, commenter, taskId, taskTitle, projectId) => {
  // 1) Parse @[Name](userId) — exact ID match, no ambiguity
  const mdMatches = [...text.matchAll(MENTION_MD_RE)];
  const mdUserIds = [...new Set(mdMatches.map((m) => m[2]))];
  if (mdUserIds.length) {
    const matched = await User.find({ _id: { $in: mdUserIds } });
    matched.forEach((u) => sendMentionNotif(u, commenter, taskId, taskTitle, projectId));
    // Skip plain mentions for users already notified
    const remaining = [...text.matchAll(MENTION_PLAIN_RE)]
      .map((m) => m[1].trim())
      .filter((name) => !matched.some((u) => u.name === name || u.email?.split('@')[0] === name));
    if (!remaining.length) return;
    const plainMatched = await User.find({ name: { $in: remaining } });
    plainMatched.forEach((u) => sendMentionNotif(u, commenter, taskId, taskTitle, projectId));
    return;
  }

  // 2) Plain @Name only
  const plainMatches = [...text.matchAll(MENTION_PLAIN_RE)];
  if (!plainMatches.length) return;
  const usernames = [...new Set(plainMatches.map((m) => m[1].trim()))];
  const matched = await User.find({ name: { $in: usernames } });
  matched.forEach((u) => sendMentionNotif(u, commenter, taskId, taskTitle, projectId));
};

export const addComment = async (taskId, { text = '', replyTo } = {}, user, clientProfile, uploads = []) => {
  const task = user?.role === 'client'
    ? await assertClientTaskAccess(taskId, clientProfile)
    : await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  if (!text && !uploads.length) throw ApiError.badRequest('Write a message or add a file');
  if (replyTo && !task.comments?.some((c) => String(c._id) === replyTo)) throw ApiError.badRequest('That message was deleted');

  const files = await Promise.all(uploads.map(async (f) => ({
    ...(await uploadFile(f, 'crm/tasks')), name: f.originalname, mime: f.mimetype, size: f.size,
  })));
  const comment = { text, files, replyTo: replyTo || undefined, createdBy: user._id };
  const updated = await taskRepo.addComment(taskId, comment);
  if (!updated) throw ApiError.notFound('Task not found');
  await taskRepo.addActivity(taskId, { action: 'commented', field: 'comment', performedBy: user._id });

  if (text) processMentions(text, user, taskId, task.title, task.project?._id || task.project).catch(() => {});
  const preview = text ? text.slice(0, 120) : `📎 ${files.length === 1 ? files[0].name : `${files.length} files`}`;

  if (user?.role === 'client') {
    const User = (await import('../auth/auth.model.js')).default;
    const allStaff = await User.find({ role: { $ne: 'client' }, isActive: true }).select('_id');
    const recipientIds = allStaff
      .map((u) => u._id.toString())
      .filter((uid) => uid !== String(user._id));

    notificationService.createAndSendBulk(recipientIds, {
      type: 'task_comment',
      title: `Client Comment • ${task.title}`,
      message: `${user.name || 'Client'}: ${preview}`,
      priority: 'high',
      referenceId: task._id,
      referenceModel: 'Task',
      actionBy: user._id,
      link: taskLink(task),
    }).catch(() => {});
  } else {
    // Everyone on the task hears about new messages (T1 groups repeats within 10 min into one push).
    const repliedTo = replyTo && task.comments.find((c) => String(c._id) === replyTo);
    const people = new Set([task.assignedTo, task.createdBy, task.reviewer, ...(task.helpers || []), ...(task.watchers || []), repliedTo?.createdBy]
      .map(idOf).filter(Boolean));
    people.delete(String(user._id));
    notificationService.createAndSendBulk([...people], {
      type: 'task_comment',
      title: `New message • ${task.title}`,
      message: `${user.name}: ${preview}`,
      priority: 'low',
      referenceId: task._id,
      referenceModel: 'Task',
      actionBy: user._id,
      link: taskLink(task),
    }).catch(() => {});
  }

  emitEntityUpdate('task', taskId, 'comment_added');
  const projectId = task.project?._id || task.project;
  if (projectId) emitEntityUpdate('project', projectId, 'comment_added', { taskId });

  return updated;
};

// Checklists
export const removeComment = async (taskId, commentId, user, clientProfile) => {
  const task = user?.role === 'client'
    ? await assertClientTaskAccess(taskId, clientProfile)
    : await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');

  const comment = task.comments?.find((c) => String(c._id) === String(commentId));
  if (!comment) throw ApiError.notFound('Comment not found');

  const isAdminUser = ['admin', 'super_admin'].includes(user.role);
  if (!isAdminUser && String(comment.createdBy?._id || comment.createdBy) !== String(user._id)) {
    throw ApiError.forbidden('You can only delete your own messages');
  }

  const updated = await taskRepo.removeComment(taskId, commentId);
  (comment.files || []).forEach((f) => deleteFile(f.fileId).catch(() => {}));
  if (!updated) throw ApiError.notFound('Task not found');
  await taskRepo.addActivity(taskId, { action: 'removed_comment', field: 'comment', performedBy: user._id });

  emitEntityUpdate('task', taskId, 'comment_removed');
  const projectId = task.project?._id || task.project;
  if (projectId) emitEntityUpdate('project', projectId, 'comment_removed', { taskId });

  return updated;
};

export const addChecklistItem = async (taskId, text, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw { status: 404, message: 'Task not found' };
  const order = (task.checklists?.length || 0);
  const item = { text, order, createdBy: user._id };
  const updated = await taskRepo.addChecklistItem(taskId, item);

  // If task was completed or in review, adding new item puts it back in progress
  if (['done', 'review'].includes(task.status)) {
    await taskRepo.updateById(taskId, { status: 'in_progress', completedAt: null });
    await taskRepo.addActivity(taskId, {
      action: 'status_changed',
      field: 'status',
      oldValue: task.status,
      newValue: 'in_progress',
      performedBy: user._id,
    });
    emitEntityUpdate('task', taskId, 'task_updated');
  }

  return updated;
};

export const updateChecklistItem = async (taskId, itemId, data, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw { status: 404, message: 'Task not found' };

  const updated = await taskRepo.updateChecklistItem(taskId, itemId, data);
  if (!updated) throw { status: 404, message: 'Task or checklist item not found' };

  // Recalculate progress
  const total = updated.checklists?.length || 0;
  const done = updated.checklists?.filter((c) => c.checked).length || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const updateData = { checklistProgress: progress };

  // If item was unchecked or modified while task was done, put back in progress
  if (['done', 'review'].includes(task.status) && (data.checked === false || data.text !== undefined)) {
    updateData.status = 'in_progress';
    updateData.completedAt = null;
    if (user) {
      await taskRepo.addActivity(taskId, {
        action: 'status_changed',
        field: 'status',
        oldValue: task.status,
        newValue: 'in_progress',
        performedBy: user._id,
      });
    }
    emitEntityUpdate('task', taskId, 'task_updated');
  }

  return taskRepo.updateById(taskId, updateData);
};

export const removeChecklistItem = async (taskId, itemId, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw { status: 404, message: 'Task not found' };

  const updated = await taskRepo.removeChecklistItem(taskId, itemId);
  if (!updated) throw { status: 404, message: 'Task not found' };
  const total = updated.checklists?.length || 0;
  const done = updated.checklists?.filter((c) => c.checked).length || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const updateData = { checklistProgress: progress };
  if (['done', 'review'].includes(task.status)) {
    updateData.status = 'in_progress';
    updateData.completedAt = null;
    if (user) {
      await taskRepo.addActivity(taskId, {
        action: 'status_changed',
        field: 'status',
        oldValue: task.status,
        newValue: 'in_progress',
        performedBy: user._id,
      });
    }
    emitEntityUpdate('task', taskId, 'task_updated');
  }

  return taskRepo.updateById(taskId, updateData);
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

export const getWatchedTasks = async (userId, query, user, clientProfile) => {
  const options = {};
  if (user?.role === 'client' && clientProfile) {
    options.client = clientProfile._id;
  }
  return taskRepo.findAll({ ...query, watchedBy: userId }, options);
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
export const reorderTasks = async (status, orderedIds, user) => {
  if (status === 'done') {
    const tasks = await Promise.all(orderedIds.map((id) => taskRepo.findById(id)));
    for (const t of tasks) {
      if (t && t.status !== 'done' && idOf(t.createdBy) && ![idOf(t.createdBy), idOf(t.reviewer)].includes(idOf(user))) {
        throw ApiError.forbidden(`Only ${t.reviewer?.name || t.createdBy?.name || 'the task creator'} can review and mark "${t.title}" as completed`);
      }
    }
  }

  // Moving into Review goes through updateTask, so the review clock starts and the reviewer hears about it.
  const current = status === 'review' ? await Task.find({ _id: { $in: orderedIds } }).select('status').lean() : [];
  const entering = new Set(current.filter((t) => t.status !== 'review').map((t) => String(t._id)));
  await Promise.all(orderedIds.map((id, i) => {
    if (entering.has(String(id))) return updateTask(id, { status, order: i }, user);
    const update = { status, order: i };
    if (status === 'done') update.completedAt = new Date().toISOString();
    else if (status && status !== 'done') update.completedAt = null;
    return taskRepo.updateById(id, update);
  }));
};

// Bulk update
export const bulkUpdate = async (ids, data, user) => {
  if (data.status === 'done') {
    const tasks = await Promise.all(ids.map((id) => taskRepo.findById(id)));
    for (const t of tasks) {
      if (t && t.status !== 'done' && idOf(t.createdBy) && ![idOf(t.createdBy), idOf(t.reviewer)].includes(idOf(user))) {
        throw ApiError.forbidden(`Only ${t.reviewer?.name || t.createdBy?.name || 'the task creator'} can review and mark "${t.title}" as completed`);
      }
    }
  }

  if (data.status === 'done') data.completedAt = new Date().toISOString();
  else if (data.status && data.status !== 'done') data.completedAt = null;

  if (data.status === 'review') {
    const entering = await Task.find({ _id: { $in: ids }, status: { $ne: 'review' } }).select('_id').lean();
    const set = new Set(entering.map((t) => String(t._id)));
    await Promise.all(ids.map((id) => (set.has(String(id)) ? updateTask(id, { ...data }, user) : taskRepo.updateById(id, data))));
    return;
  }
  await Promise.all(ids.map((id) => taskRepo.updateById(id, data)));
};
