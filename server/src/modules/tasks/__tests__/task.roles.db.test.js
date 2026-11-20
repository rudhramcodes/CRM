// Who can do what on a task, run against a throwaway local MongoDB database (skipped when none is running).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import User from '../../auth/auth.model.js';
import Task from '../task.model.js';
import Notification from '../../notifications/notification.model.js';
import Project from '../../projects/project.model.js';
import Client from '../../clients/client.model.js';
import * as svc from '../task.service.js';
import { createTaskSchema } from '../task.validation.js';

const dbName = `crm_test_task_roles_${Date.now()}`;
let up = false;
try {
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName, serverSelectionTimeoutMS: 2000 });
  up = true;
} catch { /* no local MongoDB: tests below are skipped */ }

const mk = (name, role, extra = {}) => User.create({ name, email: `${name.toLowerCase()}@test.local`, password: 'Passw0rd!x', role, ...extra });
let boss; let rahul; let sana; let amit; let mgr; let admin; let clientUser; let base;

describe.skipIf(!up)('task rules by role (database)', () => {
  beforeAll(async () => {
    [boss, rahul, sana, amit, mgr, admin] = await Promise.all([
      mk('Boss', 'employee'), mk('Rahul', 'employee'), mk('Sana', 'employee'), mk('Amit', 'employee'), mk('Meera', 'manager'), mk('Asha', 'admin'),
    ]);
    clientUser = await mk('Client', 'client');
  });
  afterAll(async () => {
    if (!up) return;
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });
  // Boss gives Rahul a task with Sana helping; Amit is not on it.
  beforeEach(async () => {
    await Task.deleteMany({});
    await Notification.deleteMany({});
    base = (await svc.createTasks({ title: 'Edit teaser', assignedTo: String(rahul._id), helpers: [String(sana._id)], dueDate: new Date(Date.now() + 864e5) }, boss))[0];
  });
  const fresh = (id = base._id) => Task.findById(id).lean();
  const forbidden = (p) => expect(p).rejects.toMatchObject({ statusCode: 403 });

  it('the doer works it, a stranger cannot touch it', async () => {
    await svc.addChecklistItem(base._id, 'Cut', rahul);
    const item = (await fresh()).checklists[0];
    await svc.updateChecklistItem(base._id, item._id, { checked: true }, sana); // helper ticks: task starts
    expect((await fresh()).status).toBe('in_progress');
    await forbidden(svc.addChecklistItem(base._id, 'x', amit));
    await forbidden(svc.addTimeEntry(base._id, { date: new Date(), hours: 1 }, amit));
    await forbidden(svc.updateTask(base._id, { status: 'todo' }, amit));
    await forbidden(svc.reorderTasks('todo', [String(base._id)], amit));
    await forbidden(svc.bulkUpdate([String(base._id)], { status: 'todo' }, amit));
    await forbidden(svc.createTask({ title: 'Sub', parent: String(base._id), assignedTo: String(amit._id), dueDate: new Date() }, amit));
  });

  it('only managers of the task plan it', async () => {
    await forbidden(svc.updateTask(base._id, { priority: 'urgent' }, rahul));
    await forbidden(svc.addDependencies(base._id, [], rahul));
    await svc.updateTask(base._id, { priority: 'urgent' }, mgr); // manager role
    await svc.updateTask(base._id, { priority: 'low' }, boss); // creator
    expect((await fresh()).priority).toBe('low');
  });

  it('time: your own entries; managers can remove anyone\'s', async () => {
    await svc.addTimeEntry(base._id, { date: new Date(), hours: 1 }, rahul);
    const entry = (await fresh()).timeEntries[0];
    await forbidden(svc.removeTimeEntry(base._id, entry._id, sana));
    await svc.removeTimeEntry(base._id, entry._id, mgr);
    expect((await fresh()).totalLoggedHours).toBe(0);
  });

  it('only the reviewer approves, also through reorder and bulk', async () => {
    await svc.updateTask(base._id, { status: 'in_progress' }, rahul);
    await svc.updateTask(base._id, { status: 'review' }, rahul);
    await forbidden(svc.reorderTasks('done', [String(base._id)], rahul));
    await forbidden(svc.bulkUpdate([String(base._id)], { status: 'done' }, admin)); // admin is not the reviewer
    await svc.updateTask(base._id, { reviewer: String(mgr._id) }, boss); // hand review over
    await forbidden(svc.updateTask(base._id, { status: 'done' }, boss)); // creator no longer reviews
    await svc.reorderTasks('done', [String(base._id)], mgr);
    const t = await fresh();
    expect(t.status).toBe('done');
    expect(t.progress).toBe(100);
    // Owner, helper and creator hear "Approved" (not the approver). Alerts go out in the background.
    await new Promise((r) => setTimeout(r, 300));
    const approved = await Notification.find({ type: 'task_approved' }).lean();
    expect(approved.map((n) => String(n.recipient)).sort()).toEqual([String(rahul._id), String(sana._id), String(boss._id)].sort());
  });

  it('tags on a done task do not reopen it; a new title does', async () => {
    await svc.updateTask(base._id, { status: 'done' }, boss);
    await svc.updateTask(base._id, { tags: ['final'] }, rahul);
    expect((await fresh()).status).toBe('done');
    await svc.updateTask(base._id, { title: 'Edit teaser v2' }, boss);
    expect((await fresh()).status).toBe('in_progress');
  });

  it('sending yourself a review starts no clock', async () => {
    const own = await svc.createTask({ title: 'Mine', assignedTo: String(boss._id), dueDate: new Date() }, boss);
    await svc.updateTask(own._id, { status: 'review' }, boss);
    expect((await fresh(own._id)).reviewDueAt).toBeNull();
  });

  it('work only goes to active staff, and new tasks start as To do or In progress', async () => {
    await expect(svc.createTask({ title: 'x', assignedTo: String(clientUser._id), dueDate: new Date() }, boss)).rejects.toMatchObject({ statusCode: 400 });
    const off = await mk('Gone', 'employee', { isActive: false });
    await expect(svc.updateTask(base._id, { assignedTo: String(off._id) }, boss)).rejects.toMatchObject({ statusCode: 400 });
    expect(() => createTaskSchema.parse({ title: 'x', assignedTo: String(rahul._id), dueDate: '2026-12-01', status: 'done' })).toThrow();
  });

  it('deleting a task frees the tasks waiting on it', async () => {
    const waiting = await svc.createTask({ title: 'Export', assignedTo: String(sana._id), dueDate: new Date(), dependsOn: [String(base._id)] }, boss);
    await svc.deleteTask(base._id, admin);
    expect((await fresh(waiting._id)).dependsOn).toEqual([]);
    await new Promise((r) => setTimeout(r, 200)); // the "you can start" alert is sent in the background
    expect(await Notification.countDocuments({ recipient: sana._id, title: 'You can start now' })).toBe(1);
  });

  it('a client sees their project task without internal history or emails', async () => {
    const client = await Client.create({ companyName: 'Acme Weddings', contactPerson: 'Priya', email: 'priya@test.local', brand: 'panigrahna', createdBy: boss._id, user: clientUser._id, status: 'active' });
    const project = await Project.create({ title: 'Wedding film', client: client._id, brand: 'panigrahna', ownerId: boss._id, createdBy: boss._id }).catch((e) => { console.error(e.message); return null; });
    expect(project, 'test project could not be created').toBeTruthy();
    await svc.updateTask(base._id, { project: String(project._id) }, boss);
    const seen = await svc.getTaskById(String(base._id), clientUser, client);
    expect(seen.activities).toBeUndefined();
    expect(seen.timeEntries).toBeUndefined();
    expect(seen.assignedTo.email).toBeUndefined();
  });
});
