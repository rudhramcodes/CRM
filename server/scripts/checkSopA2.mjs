// Optional database-free check. Not executed by the implementation agent.
// Run from repository root: node server/scripts/checkSopA2.mjs
import assert from 'node:assert/strict';
import { getStageChange, QC_ITEMS } from '../src/modules/projects/projectStage.js';
import { deadlineChange } from '../src/utils/deadlineChange.js';
import { qualityCheckSchema, closingNoteSchema, updateMilestonesSchema } from '../src/modules/projects/project.validation.js';

const admin = { _id: '507f1f77bcf86cd799439011', role: 'admin' };
const project = { stage: 'brief', teamMembers: [], qcChecklist: { status: 'pending' }, deliverables: [] };
assert.equal(getStageChange(project, 'planning', admin).toStage, 'planning');
assert.equal(getStageChange(project, 'brief', admin), null);
assert.throws(() => getStageChange({ ...project, stage: undefined }, 'planning', admin), /migration/);
assert.throws(() => getStageChange(project, 'planning', { ...admin, role: 'client' }), /Only an Admin/);
assert.throws(() => getStageChange(project, 'planning', { ...admin, role: 'manager' }), /assigned project Manager/);
assert.equal(getStageChange({ ...project, ownerId: admin._id }, 'planning', { ...admin, role: 'manager' }).toStage, 'planning');
assert.throws(() => getStageChange({ ...project, stage: 'review' }, 'execution', admin, '  '), /reason/);
const reversal = getStageChange({ ...project, stage: 'review' }, 'execution', admin, 'Fix client feedback');
assert.equal(reversal.backwards, true);
assert.equal(reversal.reason, 'Fix client feedback');
assert.throws(() => getStageChange(project, 'delivered', admin), /Admin QC and Closing Note required/);

const approved = {
  ...project, stage: 'review',
  qcChecklist: { status: 'passed', ...Object.fromEntries(QC_ITEMS.map((key) => [key, {
    checked: true, checkedBy: admin._id, checkedAt: new Date(),
  }])) },
  closingNote: { deliveredWhat: 'Final files', deliveredWhen: new Date(), writtenBy: admin._id, writtenAt: new Date() },
  deliverables: [{ title: 'Final film', status: 'ready' }],
};
assert.throws(() => getStageChange(approved, 'delivered', admin), /Undelivered deliverables exist: Final film/);
approved.deliverables[0].status = 'delivered';
assert.equal(getStageChange(approved, 'delivered', admin).toStage, 'delivered');
delete approved.qcChecklist.filesCorrect.checkedBy;
assert.throws(() => getStageChange(approved, 'delivered', admin), /Admin QC/);

assert.equal(deadlineChange('2026-11-01', '2026-11-01T00:00:00Z', '', admin), null);
assert.throws(() => deadlineChange('2026-11-01', '2026-11-02', ' ', admin), /reason/);
assert.throws(() => deadlineChange('2026-11-01', '', '', admin), /reason/);
assert.equal(deadlineChange('2026-11-01', '2026-11-02', 'Client rescheduled', admin).oldValue, '2026-11-01T00:00:00.000Z');
assert.equal(updateMilestonesSchema.safeParse({ milestones: [], status: 'completed' }).success, false);
assert.equal(qualityCheckSchema.safeParse({ ...Object.fromEntries(QC_ITEMS.map((key) => [key, true])), checkedBy: admin._id }).success, false);
assert.equal(closingNoteSchema.safeParse({ deliveredWhat: ' ', deliveredWhen: 'invalid' }).success, false);
console.log('SOP A2 policy and validation checks passed (no database connection).');
