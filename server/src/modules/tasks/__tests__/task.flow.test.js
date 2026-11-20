import { describe, expect, it } from 'vitest';
import { taskAudience } from '../task.service.js';
import { buildNotification } from '../../notifications/notification.service.js';

const task = {
  assignedTo: { _id: 'owner' },
  helpers: ['helper', 'owner'],
  createdBy: { _id: 'creator' },
  watchers: [{ _id: 'watcher' }, 'helper'],
};

describe('taskAudience', () => {
  it('reaches owner, helpers, creator and watchers once each', () => {
    expect(taskAudience(task, 'someone-else').sort()).toEqual(['creator', 'helper', 'owner', 'watcher']);
  });
  it('never tells the person who acted', () => {
    expect(taskAudience(task, 'owner')).not.toContain('owner');
  });
  it('copes with a bare task', () => {
    expect(taskAudience({ createdBy: 'creator' }, 'creator')).toEqual([]);
  });
});

describe('task status messages', () => {
  const msg = (newStatus) => buildNotification('task_status_change', { actorName: 'Rahul', taskTitle: 'Edit teaser', newStatus }).message;
  it('reads as plain words', () => {
    expect(msg('in_progress')).toBe('Rahul started "Edit teaser"');
    expect(msg('done')).toBe('Rahul finished "Edit teaser"');
    expect(msg('todo')).toBe('Rahul moved "Edit teaser" back to To Do');
  });
});

describe('who may change what (taskRules)', async () => {
  const { editBlockReason, canManageTask } = await import('../taskRules.js');
  const t = {
    title: 'Edit teaser', priority: 'medium', createdBy: { _id: 'boss', name: 'Faizal' },
    assignedTo: { _id: 'rahul' }, helpers: [{ _id: 'sana' }], reviewer: null,
  };
  const rahul = { _id: 'rahul', role: 'employee' };
  const sana = { _id: 'sana', role: 'employee' };
  const stranger = { _id: 'amit', role: 'employee' };

  it('lets the creator and managers change anything', () => {
    expect(editBlockReason(t, { priority: 'urgent', title: 'New' }, { _id: 'boss', role: 'employee' })).toBeNull();
    expect(editBlockReason(t, { assignedTo: 'amit' }, { _id: 'x', role: 'manager' })).toBeNull();
    expect(canManageTask({ ...t, reviewer: 'amit' }, stranger)).toBe(true);
  });
  it('lets the owner and helpers move the work along', () => {
    expect(editBlockReason(t, { status: 'in_progress', progress: 50 }, rahul)).toBeNull();
    expect(editBlockReason(t, { dueDate: '2026-12-01', reason: 'Client late' }, sana)).toBeNull();
    expect(editBlockReason(t, { priority: 'medium' }, rahul)).toBeNull(); // unchanged value
    expect(editBlockReason(t, { assignedTo: 'rahul' }, rahul)).toBeNull(); // same owner, populated vs id
  });
  it('stops the doer from changing priority, title or people', () => {
    expect(editBlockReason(t, { priority: 'low' }, rahul)).toBe('Only Faizal or a manager can change the priority.');
    expect(editBlockReason(t, { title: 'x', assignedTo: 'amit' }, sana)).toMatch(/title, assignee/);
  });
  it('stops people who are not on the task', () => {
    expect(editBlockReason(t, { status: 'done' }, stranger)).toMatch(/follow it and chat/);
  });
});
