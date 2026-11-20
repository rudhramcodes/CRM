import ApiError from '../../utils/ApiError.js';

// Who may do what on a task. One place, used by every task route and mirrored by the apps
// (crm-mobile src/utils/tasks.js). The full table is in crm-mobile TASKS-FLOW.md, "Who can do what".
// - Managers of a task: its creator, its reviewer, and anyone with the manager / admin / super_admin role.
//   They plan it: title, priority, people, project, dependencies, repeat. They can do everything below too.
// - The people doing it (owner and helpers) work it: status, progress, checklist, time, description,
//   tags, start date, estimate, and the due date with a reason (the creator and reviewer are told).
// - Anyone else on staff: read, follow, chat. Clients: read and chat on their own projects' tasks.
// - Only the reviewer (the creator unless review was handed over) marks it Done. Only admins delete.
const idOf = (x) => String(x?._id || x || '');

export const MANAGED_FIELDS = ['title', 'priority', 'assignedTo', 'helpers', 'project', 'milestone', 'reviewer', 'recurring', 'dependsOn', 'parent'];
const LABELS = {
  title: 'title', priority: 'priority', assignedTo: 'assignee', helpers: 'helpers', project: 'project', milestone: 'milestone',
  reviewer: 'reviewer', recurring: 'repeat', dependsOn: 'dependencies', parent: 'parent task',
};

export const isManagerRole = (user) => ['manager', 'admin', 'super_admin'].includes(user?.role);
export const isReviewer = (task, user) => !!idOf(user) && idOf(user) === idOf(task.reviewer || task.createdBy);
export const canManageTask = (task, user) => {
  const me = idOf(user);
  return !!me && (isManagerRole(user) || me === idOf(task.createdBy) || me === idOf(task.reviewer));
};
export const isOnTask = (task, user) => {
  const me = idOf(user);
  return !!me && (me === idOf(task.assignedTo) || (task.helpers || []).some((h) => idOf(h) === me));
};
export const canWorkTask = (task, user) => canManageTask(task, user) || isOnTask(task, user);

// Stored values come back populated ({ _id, title }) and with defaults; compare plain ids and only what was sent.
const normal = (v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (Array.isArray(v)) return v.map(idOf).sort();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && v._id) return idOf(v);
  if (typeof v === 'object') return v; // plain objects (recurring) are compared key by key below
  return String(v);
};
export const sameValue = (stored, sent) => {
  const a = normal(stored);
  const b = normal(sent);
  if (b && typeof b === 'object' && !Array.isArray(b)) {
    const base = a && typeof a === 'object' ? a : {};
    return Object.keys(b).every((k) => String(base[k] ?? '') === String(b[k] ?? '') || (!b[k] && !base[k]));
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

// null when allowed, else the reason in plain words.
export const editBlockReason = (task, data, user) => {
  if (canManageTask(task, user)) return null;
  if (!isOnTask(task, user)) return 'Only people on this task can change it. You can follow it and chat on it.';
  const changed = MANAGED_FIELDS.filter((k) => data[k] !== undefined && !sameValue(task[k], data[k]));
  if (!changed.length) return null;
  return `Only ${task.createdBy?.name || 'the task creator'} or a manager can change the ${changed.map((k) => LABELS[k]).join(', ')}.`;
};

// Guards for the smaller routes (checklist, time, dependencies, subtasks).
export const assertCanWork = (task, user) => {
  if (!canWorkTask(task, user)) throw ApiError.forbidden('Only people on this task can change it. You can follow it and chat on it.');
};
export const assertCanManage = (task, user) => {
  if (!canManageTask(task, user)) throw ApiError.forbidden(`Only ${task.createdBy?.name || 'the task creator'} or a manager can change this.`);
};
