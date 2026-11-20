import Task from './task.model.js';
import User from '../auth/auth.model.js';
import * as taskRepo from './task.repository.js';
import * as notificationService from '../notifications/notification.service.js';
import { emitEntityUpdate } from '../../sockets/index.js';
import ApiError from '../../utils/ApiError.js';
import { deadlineChange } from '../../utils/deadlineChange.js';
import { addWorkingMinutes } from '../../utils/workingHours.js';
import { deleteFile, uploadFile } from '../../services/fileUploadService.js';
import { assertCanManage, assertCanWork, canManageTask, editBlockReason, isReviewer, sameValue } from './taskRules.js';

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

// Work can only go to active staff (not clients, not deactivated accounts).
const assertAssignable = async (ids) => {
  const want = [...new Set(ids.filter(Boolean).map(String))];
  if (!want.length) return;
  const ok = await User.countDocuments({ _id: { $in: want }, isActive: { $ne: false }, role: { $ne: 'client' } });
  if (ok !== want.length) throw ApiError.badRequest('Pick active team members only');
};

export const createTask = async (data, user) => {
  const taskData = { ...data, helpers: cleanHelpers(data.helpers, data.assignedTo), createdBy: user._id };
  await assertAssignable([taskData.assignedTo, ...taskData.helpers]);
  if (data.dependsOn?.length && (await Task.countDocuments({ _id: { $in: data.dependsOn } })) !== new Set(data.dependsOn.map(String)).size) {
    throw ApiError.badRequest('One of the tasks it depends on no longer exists');
  }
  let parent = null;
  if (data.parent) {
    parent = await taskRepo.findById(data.parent);
    if (!parent) throw ApiError.notFound('Parent task not found');
    assertCanWork(parent, user); // a subtask is new work on the parent
  }
  const task = await taskRepo.create(taskData);
  // New work under a finished parent reopens it (through updateTask: history, resets and alerts included).
  if (parent && ['done', 'review'].includes(parent.status)) {
    await updateTask(parent._id, { status: 'in_progress' }, user).catch(() => {});
  }
  if (data.dependsOn?.length) {
    for (const depId of data.dependsOn) {
      await taskRepo.addDependency(task._id, depId);
      await Task.findByIdAndUpdate(depId, { $addToSet: { blockedBy: task._id } });
    }
  }
  const created = await taskRepo.findById(task._id);
  const createdProjectId = created.project?._id || created.project;
  if (createdProjectId) emitEntityUpdate('project', createdProjectId, 'task_added', { taskId: created._id });
  // Never tell people about a task they gave themselves.
  if (data.assignedTo && String(data.assignedTo) !== String(user._id)) {
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

// What a client sees of a task: the work and its chat, not the team's internal history,
// time logs, review notes, or anyone's email address.
const forClient = (task) => {
  const t = task.toObject ? task.toObject() : { ...task };
  delete t.activities; delete t.timeEntries; delete t.reviewNote; delete t.watchers; delete t.activeTimers;
  delete t.dependsOn; delete t.blockedBy; // may point at other clients' work
  const strip = (u) => (u && typeof u === 'object' ? { _id: u._id, name: u.name, avatar: u.avatar } : u);
  ['assignedTo', 'createdBy', 'reviewer'].forEach((k) => { t[k] = strip(t[k]); });
  t.helpers = (t.helpers || []).map(strip);
  t.comments = (t.comments || []).map((c) => ({ ...c, createdBy: strip(c.createdBy) }));
  return t;
};
const isClient = (user) => user?.role === 'client';

export const getTasks = async (query, user, clientProfile) => {
  if (!isClient(user)) return taskRepo.findAll(query, {});
  if (!clientProfile) return { tasks: [], pagination: { page: 1, limit: 0, total: 0, pages: 0 } };
  const res = await taskRepo.findAll(query, { client: clientProfile._id });
  return { ...res, tasks: res.tasks.map(forClient) };
};

export const getTaskById = async (id, user, clientProfile) => {
  const task = isClient(user) ? await assertClientTaskAccess(id, clientProfile) : await taskRepo.findById(id);
  if (!task) throw ApiError.notFound('Task not found');
  return isClient(user) ? forClient(task) : task;
};

const idOf = (x) => String(x?._id || x || '');
// Everyone who follows a task (owner, helpers, creator, watchers), once each, never the person who acted.
export const taskAudience = (task, actorId) => [...new Set(
  [task.assignedTo, ...(task.helpers || []), task.createdBy, task.reviewer, ...(task.watchers || [])].map(idOf).filter(Boolean),
)].filter((id) => id !== String(actorId || ''));
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
  if (!task) throw ApiError.notFound('Task not found');
  const blocked = user && editBlockReason(task, data, user);
  if (blocked) throw ApiError.forbidden(blocked);

  const oldHelpers = (task.helpers || []).map(idOf);
  if (data.assignedTo !== undefined && !sameValue(task.assignedTo, data.assignedTo)) await assertAssignable([data.assignedTo]);
  if (data.helpers !== undefined) await assertAssignable(data.helpers.filter((h) => !oldHelpers.includes(String(h))));
  if (data.helpers !== undefined || data.assignedTo !== undefined) {
    data.helpers = cleanHelpers(data.helpers ?? oldHelpers, data.assignedTo ?? idOf(task.assignedTo));
  }

  const deadlineActivity = data.dueDate !== undefined
    ? deadlineChange(task.dueDate, data.dueDate, data.reason, user) : null;
  delete data.reason;

  // Review roles: the reviewer (default: the creator) approves or asks for changes.
  const userId = idOf(user);
  const canReview = isReviewer(task, user); // the reviewer, or the creator while nobody else was handed it
  const reviewerName = task.reviewer?.name || task.createdBy?.name || 'the task creator';
  const note = data.note || '';
  const askedChanges = !!data.requestChanges;
  delete data.note;
  delete data.requestChanges;

  const handedOver = data.reviewer !== undefined && data.reviewer !== idOf(task.reviewer || task.createdBy);
  if (data.reviewer !== undefined && !handedOver) delete data.reviewer;
  if (handedOver && !canManageTask(task, user)) {
    throw ApiError.forbidden('Only the task creator, the reviewer or a manager can choose who reviews it');
  }

  if (data.status === 'done' && task.status !== 'done' && !canReview) {
    throw ApiError.forbidden(`Only ${reviewerName} can review and mark this task as completed`);
  }

  if (askedChanges) {
    if (!canReview) throw ApiError.forbidden(`Only ${reviewerName} can ask for changes`);
    if (!note) throw ApiError.badRequest('Say what needs to change');
    data.status = 'in_progress';
  } else {
    // Only a change to the work itself reopens a done task, not tags, estimates or bookkeeping.
    const NOT_CONTENT = ['status', 'completedAt', 'order', 'checklistProgress', 'progress', 'totalLoggedHours', 'reviewer', 'helpers', 'assignedTo', 'tags', 'estimatedHours', 'startDate', 'priority'];
    const hasContentChanges = Object.keys(data).some((k) => !NOT_CONTENT.includes(k) && data[k] !== undefined && !sameValue(task[k], data[k]));

    if (task.status === 'done' && hasContentChanges && data.status !== 'done') {
      data.status = 'in_progress';
    }
  }

  // Saying how far along it is starts a To Do task.
  if (data.progress > 0 && task.status === 'todo' && !data.status) data.status = 'in_progress';
  // Reopening or moving back to To Do starts the count again.
  if (data.progress === undefined && data.status && data.status !== task.status && (task.status === 'done' || data.status === 'todo')) data.progress = 0;

  // Status gate: check dependencies before allowing in_progress/done
  if (data.status && data.status !== task.status && ['in_progress', 'done'].includes(data.status) && task.dependsOn?.length) {
    // dependsOn comes back populated with title and status, so no extra lookups.
    const open = task.dependsOn.filter((d) => d?.status && d.status !== 'done');
    if (open.length) throw ApiError.badRequest(`Waiting on ${open.map((d) => `"${d.title}"`).join(', ')} first`);
  }

  if (data.status === 'done') { data.completedAt = new Date().toISOString(); data.progress = 100; }
  if (data.status && data.status !== 'done') data.completedAt = null;

  // The 1-working-hour review clock starts on submit, and again when review is handed to someone else.
  const enteringReview = data.status === 'review' && task.status !== 'review';
  const restartClock = enteringReview || (handedOver && task.status === 'review' && !data.status);
  if (restartClock) {
    const now = new Date();
    const reviewerId = String(data.reviewer || idOf(task.reviewer || task.createdBy));
    Object.assign(data, {
      reviewer: reviewerId,
      // Sending yourself something to review starts no clock (and pages nobody when it runs out).
      reviewRequestedAt: now, reviewDueAt: reviewerId === userId ? null : addWorkingMinutes(now, 60), reviewNudges: 0,
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
    else if (statusChange?.newValue === 'done' && task.status === 'review') taskAudience(updated, userId).forEach((id) => send(id, 'task_approved'));
    // Started, finished, moved back: everyone following the task hears it (the review steps above have their own alerts).
    else if (statusChange) taskAudience(updated, userId).forEach((id) => send(id, 'task_status_change', { newStatus: statusChange.newValue }));
    if (statusChange?.newValue === 'done') notifyUnblocked(updated, user).catch(() => {});
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
        ...notificationService.buildNotification('task_reassigned', { taskTitle: updated.title, actorName: user.name, newOwner: updated.assignedTo?.name || 'someone else' }),
      }).catch(() => {});
    }
    if (addedHelpers.length) notifyHelpersAdded(updated, addedHelpers, user);
    // The doer moved the date (with a reason): the person who set it hears why.
    if (deadlineActivity) {
      const day = updated.dueDate ? new Date(updated.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : 'no date';
      [...new Set([idOf(updated.createdBy), idOf(updated.reviewer), idOf(updated.assignedTo)].filter(Boolean))]
        .forEach((rid) => send(rid, 'task_rescheduled', { newDate: day, reason: deadlineActivity.reason }));
    }
  }

  emitEntityUpdate('task', id, 'task_updated');
  const updatedProjectId = updated.project?._id || updated.project;
  if (updatedProjectId) emitEntityUpdate('project', updatedProjectId, 'task_updated', { taskId: id });
  return updated;
};

const hasOpenDeps = async (t) => !!t.dependsOn?.length && (await Task.countDocuments({ _id: { $in: t.dependsOn.map(idOf) }, status: { $ne: 'done' } })) > 0;

// A finished (or deleted) task may free others: when nothing a waiting task depends on is still open,
// its owner hears "You can start now". One query for the waiting tasks, one for their open dependencies.
const tellIfFree = async (waitingIds, why, user) => {
  const waiting = await Task.find({ _id: { $in: waitingIds }, status: { $ne: 'done' } }).select('title assignedTo dependsOn project').lean();
  const openDeps = new Set((await Task.find({ _id: { $in: waiting.flatMap((w) => w.dependsOn || []) }, status: { $ne: 'done' } }).select('_id').lean()).map((d) => String(d._id)));
  for (const w of waiting) {
    if ((w.dependsOn || []).some((d) => openDeps.has(String(d))) || !w.assignedTo || idOf(w.assignedTo) === idOf(user._id)) continue;
    await notificationService.createAndSend({
      recipient: w.assignedTo, referenceId: w._id, referenceModel: 'Task', actionBy: user._id, link: taskLink(w), dedup: false,
      ...notificationService.buildNotification('task_status_change', { taskTitle: w.title, actorName: user.name, newStatus: 'todo' }),
      title: 'You can start now', message: `${why}, so "${w.title}" is no longer blocked.`,
    });
  }
};
const notifyUnblocked = async (doneTask, user) => {
  const waiting = await Task.find({ dependsOn: doneTask._id }).select('_id').lean();
  return tellIfFree(waiting.map((w) => w._id), `"${doneTask.title}" is done`, user);
};

export const deleteTask = async (id, user) => {
  const task = await taskRepo.findById(id);
  if (!task) throw ApiError.notFound('Task not found');

  // Everyone on it hears (not the person deleting). The link goes to the task list: the task is gone.
  const audience = taskAudience(task, idOf(user));
  if (audience.length) {
    notificationService.createAndSendBulk(audience, {
      referenceId: task._id, referenceModel: 'Task', actionBy: user._id, link: '/tasks',
      ...notificationService.buildNotification('task_deleted', { taskTitle: task.title, actorName: user.name }),
    }).catch(() => {});
  }

  // Leave nothing pointing at it: links to tasks it waited on, tasks waiting on it, subtasks, held pushes.
  const waiting = await Task.find({ dependsOn: task._id }).select('_id').lean();
  await Promise.all([
    Task.updateMany({ _id: { $in: (task.dependsOn || []).map(idOf) } }, { $pull: { blockedBy: task._id } }),
    Task.updateMany({ dependsOn: task._id }, { $pull: { dependsOn: task._id } }),
    Task.updateMany({ parent: task._id }, { $set: { parent: null } }),
    (await import('../notifications/notification.model.js')).default.updateMany({ referenceId: task._id, pushAt: { $ne: null } }, { $unset: { pushAt: 1 } }),
  ]);
  if (waiting.length) tellIfFree(waiting.map((w) => w._id), `"${task.title}" was deleted`, user).catch(() => {});

  emitEntityUpdate('task', id, 'task_deleted');
  const deletedProjectId = task.project?._id || task.project;
  if (deletedProjectId) emitEntityUpdate('project', deletedProjectId, 'task_deleted', { taskId: id });
  return taskRepo.deleteById(id);
};

// Subtasks
export const getSubtasks = async (parentId, user, clientProfile) => {
  const parent = isClient(user) ? await assertClientTaskAccess(parentId, clientProfile) : await taskRepo.findById(parentId);
  if (!parent) throw ApiError.notFound('Task not found');
  const subs = await taskRepo.findSubtasks(parentId);
  if (!isClient(user)) return subs;
  const project = idOf(parent.project);
  return subs.filter((t) => idOf(t.project) === project).map(forClient);
};

// Dependencies
export const addDependencies = async (taskId, depIds, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  assertCanManage(task, user);
  if ((await Task.countDocuments({ _id: { $in: depIds } })) !== new Set(depIds.map(String)).size) throw ApiError.badRequest('That task no longer exists');
  for (const depId of depIds) {
    if (await checkCircularDependency(taskId, depId)) {
      throw ApiError.badRequest('Adding this dependency would create a circular reference');
    }
    await taskRepo.addDependency(taskId, depId);
    await Task.findByIdAndUpdate(depId, { $addToSet: { blockedBy: taskId } });
  }
  emitEntityUpdate('task', taskId, 'task_updated');
  return taskRepo.findById(taskId);
};

export const removeDependency = async (taskId, depId, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  assertCanManage(task, user);
  await taskRepo.removeDependency(taskId, depId);
  await Task.findByIdAndUpdate(depId, { $pull: { blockedBy: taskId } });
  emitEntityUpdate('task', taskId, 'task_updated');
  return taskRepo.findById(taskId);
};

export const getDependencies = async (taskId, user, clientProfile) => {
  const task = isClient(user) ? await assertClientTaskAccess(taskId, clientProfile) : await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  if (isClient(user)) return { dependsOn: [], blockedBy: [] }; // may point at other clients' work
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
    const matched = await User.find({ _id: { $in: mdUserIds.filter((x) => /^[a-f\d]{24}$/i.test(x)) }, role: { $ne: 'client' }, isActive: { $ne: false } });
    matched.forEach((u) => sendMentionNotif(u, commenter, taskId, taskTitle, projectId));
    // Skip plain mentions for users already notified
    const remaining = [...text.matchAll(MENTION_PLAIN_RE)]
      .map((m) => m[1].trim())
      .filter((name) => !matched.some((u) => u.name === name || u.email?.split('@')[0] === name));
    if (!remaining.length) return;
    const plainMatched = await User.find({ name: { $in: remaining }, role: { $ne: 'client' }, isActive: { $ne: false } });
    plainMatched.forEach((u) => sendMentionNotif(u, commenter, taskId, taskTitle, projectId));
    return;
  }

  // 2) Plain @Name only
  const plainMatches = [...text.matchAll(MENTION_PLAIN_RE)];
  if (!plainMatches.length) return;
  const usernames = [...new Set(plainMatches.map((m) => m[1].trim()))];
  const matched = await User.find({ name: { $in: usernames }, role: { $ne: 'client' }, isActive: { $ne: false } });
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

  // The chat reaches the people on the task (never the sender), plus the person replied to. On a client's
  // project, the client hears staff messages and the team hears the client's (T1 folds repeats into one push).
  const repliedTo = replyTo && task.comments.find((c) => String(c._id) === replyTo);
  const people = new Set([...taskAudience(task, user._id), idOf(repliedTo?.createdBy)].filter(Boolean));
  const projectId = task.project?._id || task.project;
  if (projectId && !isClient(user)) {
    const { default: Project } = await import('../projects/project.model.js');
    const { default: Client } = await import('../clients/client.model.js');
    const project = await Project.findById(projectId).select('client').lean();
    const client = project?.client && (await Client.findById(project.client).select('user status').lean());
    if (client?.user && client.status === 'active') people.add(idOf(client.user));
  }
  people.delete(String(user._id));
  notificationService.createAndSendBulk([...people], {
    type: 'task_comment',
    title: `${isClient(user) ? 'Client message' : 'New message'} • ${task.title}`,
    message: `${user.name || 'Someone'}: ${preview}`,
    priority: isClient(user) ? 'high' : 'low',
    referenceId: task._id,
    referenceModel: 'Task',
    actionBy: user._id,
    link: taskLink(task),
  }).catch(() => {});

  emitEntityUpdate('task', taskId, 'comment_added');
  if (projectId) emitEntityUpdate('project', projectId, 'comment_added', { taskId });

  return isClient(user) ? forClient(updated) : updated;
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

  return isClient(user) ? forClient(updated) : updated;
};

// After any checklist change: save the %, and move the task when the work clearly moved.
// Status changes go through updateTask so history, resets and notifications are the same as everywhere else.
const afterChecklist = async (taskId, task, updated, user, reopen) => {
  const total = updated.checklists?.length || 0;
  const ticked = updated.checklists?.filter((c) => c.checked).length || 0;
  await taskRepo.updateById(taskId, { checklistProgress: total ? Math.round((ticked / total) * 100) : 0 });
  let status = null;
  if (reopen && ['done', 'review'].includes(task.status)) status = 'in_progress'; // new or unticked work
  else if (task.status === 'todo' && ticked > 0 && !(await hasOpenDeps(task))) status = 'in_progress'; // first tick starts it
  if (status) return updateTask(taskId, { status }, user);
  emitEntityUpdate('task', taskId, 'task_updated');
  return taskRepo.findById(taskId);
};

export const addChecklistItem = async (taskId, text, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  assertCanWork(task, user);
  const updated = await taskRepo.addChecklistItem(taskId, { text, order: task.checklists?.length || 0, createdBy: user._id });
  return afterChecklist(taskId, task, updated, user, true);
};

export const updateChecklistItem = async (taskId, itemId, data, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  assertCanWork(task, user);
  if (data.checked === undefined && data.text === undefined) throw ApiError.badRequest('Nothing to change');
  const updated = await taskRepo.updateChecklistItem(taskId, itemId, data);
  if (!updated) throw ApiError.notFound('That checklist item was removed');
  return afterChecklist(taskId, task, updated, user, data.checked === false || data.text !== undefined);
};

export const removeChecklistItem = async (taskId, itemId, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  assertCanManage(task, user);
  const updated = await taskRepo.removeChecklistItem(taskId, itemId);
  if (!updated) throw ApiError.notFound('Task not found');
  return afterChecklist(taskId, task, updated, user, false);
};

export const reorderChecklist = async (taskId, orderedIds) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
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
  if (!task) throw ApiError.notFound('Task not found');
  return task;
};

export const removeWatcher = async (taskId, userId) => {
  const task = await taskRepo.removeWatcher(taskId, userId);
  if (!task) throw ApiError.notFound('Task not found');
  return task;
};

export const getWatchedTasks = async (userId, query, user, clientProfile) => {
  const options = {};
  if (!isClient(user)) return taskRepo.findAll({ ...query, watchedBy: userId }, options);
  if (!clientProfile) return { tasks: [], pagination: { page: 1, limit: 0, total: 0, pages: 0 } };
  const res = await taskRepo.findAll({ ...query, watchedBy: userId }, { client: clientProfile._id });
  return { ...res, tasks: res.tasks.map(forClient) };
};

// Time Tracking
export const addTimeEntry = async (taskId, entryData, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  assertCanWork(task, user);
  const updated = await taskRepo.addTimeEntry(taskId, { ...entryData, createdBy: user._id });
  await taskRepo.updateById(taskId, { totalLoggedHours: updated.timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0) });
  // Logging time on a To Do task means work has started.
  if (task.status === 'todo' && !(await hasOpenDeps(task))) return updateTask(taskId, { status: 'in_progress' }, user);
  emitEntityUpdate('task', taskId, 'task_updated');
  return taskRepo.findById(taskId);
};

// Your own entries; a task's managers can remove anyone's.
export const removeTimeEntry = async (taskId, entryId, user) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  const entry = task.timeEntries?.find((e) => idOf(e._id) === String(entryId));
  if (!entry) throw ApiError.notFound('That time entry was already removed');
  if (idOf(entry.createdBy) !== idOf(user) && !canManageTask(task, user)) throw ApiError.forbidden('You can only remove time you logged');
  const updated = await taskRepo.removeTimeEntry(taskId, entryId);
  emitEntityUpdate('task', taskId, 'task_updated');
  return taskRepo.updateById(taskId, { totalLoggedHours: updated.timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0) });
};

// Reorder
// Board drag/arrows: a card that changes column goes through updateTask (same rules, history and alerts
// as any status change); cards that only move up or down just save their order.
export const reorderTasks = async (status, orderedIds, user) => {
  const current = new Map((await Task.find({ _id: { $in: orderedIds } }).select('status').lean()).map((t) => [String(t._id), t.status]));
  for (const [i, id] of orderedIds.entries()) {
    if (!current.has(String(id))) continue;
    if (current.get(String(id)) !== status) await updateTask(id, { status, order: i }, user);
    else await taskRepo.updateById(id, { order: i });
  }
};

// Bulk update: checked first so nothing half-applies on a rule, then each task through updateTask.
export const bulkUpdate = async (ids, data, user) => {
  const all = (await Promise.all(ids.map((id) => taskRepo.findById(id)))).filter(Boolean);
  for (const t of all) {
    const blocked = editBlockReason(t, data, user)
      || (data.status === 'done' && t.status !== 'done' && !isReviewer(t, user) && `Only ${(t.reviewer || t.createdBy)?.name || 'the reviewer'} can mark it Done`);
    if (blocked) throw ApiError.forbidden(`"${t.title}": ${blocked}`);
  }
  for (const t of all) await updateTask(t._id, { ...data }, user);
};
