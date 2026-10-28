// Optional, database-free verification: node server/scripts/checkSopA1.mjs
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Project from '../src/modules/projects/project.model.js';
import Task from '../src/modules/tasks/task.model.js';
import { STAGE_PROGRESS } from '../src/constants/index.js';
import { createProjectSchema, addTaskSchema } from '../src/modules/projects/project.validation.js';
import { createTaskSchema, updateTaskSchema, bulkUpdateSchema } from '../src/modules/tasks/task.validation.js';

const id = new mongoose.Types.ObjectId();
const base = { title: 'SOP verification', client: id, createdBy: id };
const missingOwner = new Project(base).validateSync();
assert.ok(missingOwner.errors.ownerId);
assert.ok(missingOwner.errors.brand);

const project = new Project({ ...base, ownerId: id, brand: 'panigrahna' });
assert.equal(project.validateSync(), undefined);
assert.equal(project.stage, 'brief');
assert.equal(project.qcChecklist.status, 'pending');
assert.equal(project.qcChecklist.scopeComplete.checked, false);
for (const [stage, progress] of Object.entries(STAGE_PROGRESS)) {
  project.stage = stage;
  assert.equal(project.toJSON().progress, progress);
}

const legacy = Project.hydrate({ ...base, _id: id, status: 'completed' });
assert.equal(legacy.stage, undefined, 'Legacy stages require the approved A4 migration');
assert.equal(legacy.progress, undefined);
legacy.description = 'Unrelated legacy edit';
assert.equal(legacy.validateSync(), undefined);

const missingTaskFields = new Task({ title: 'Missing fields', createdBy: id }).validateSync();
assert.ok(missingTaskFields.errors.assignedTo);
assert.ok(missingTaskFields.errors.dueDate);
const legacyTask = Task.hydrate({ _id: id, title: 'Legacy task', createdBy: id });
legacyTask.description = 'Unrelated legacy edit';
assert.equal(legacyTask.validateSync(), undefined);

const taskInput = { title: 'Assigned task', assignedTo: String(id), dueDate: '2026-11-01' };
assert.equal(createTaskSchema.safeParse(taskInput).success, true);
assert.equal(addTaskSchema.safeParse(taskInput).success, true);
for (const invalid of [undefined, null, '']) {
  assert.equal(createTaskSchema.safeParse({ ...taskInput, dueDate: invalid }).success, false);
  assert.equal(createTaskSchema.safeParse({ ...taskInput, assignedTo: invalid }).success, false);
}
assert.equal(updateTaskSchema.safeParse({ dueDate: null }).success, false);
assert.equal(bulkUpdateSchema.safeParse({ ids: [String(id)], data: { assignedTo: null } }).success, false);
assert.equal(createProjectSchema.safeParse({ title: base.title, client: String(id) }).success, false);
const parsedProject = createProjectSchema.parse({
  title: base.title, client: String(id), ownerId: String(id),
  stage: 'delivered', progress: 100, qcChecklist: { status: 'passed' },
});
assert.equal(parsedProject.stage, undefined);
assert.equal(parsedProject.progress, undefined);
assert.equal(parsedProject.qcChecklist, undefined);
console.log('SOP A1 schema and validation checks passed (no database connection).');
