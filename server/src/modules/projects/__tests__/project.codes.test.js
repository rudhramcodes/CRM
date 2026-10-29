import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Project from '../project.model.js';
import generateProjectCode, { migrateProjectCodes } from '../../../utils/generateProjectCode.js';

const uri = process.env.PROJECT_CODES_TEST_URI;
describe.skipIf(!uri)('simple project IDs', () => {
  beforeAll(async () => {
    await mongoose.connect(uri, { dbName: `crm_project_codes_${randomUUID().replaceAll('-', '')}` });
  });
  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  it('migrates old IDs in order, preserves references and continues numerically after 999', async () => {
    expect(await generateProjectCode()).toBe('001');
    const first = new mongoose.Types.ObjectId();
    const second = new mongoose.Types.ObjectId();
    await Project.collection.insertMany([
      { _id: first, projectCode: 'RE-PRJ-AG-2026-001', createdAt: new Date('2026-01-01') },
      { _id: second, projectCode: 'RE-PRJ-PG-2026-001', createdAt: new Date('2026-02-01') },
    ]);
    await migrateProjectCodes();
    expect((await Project.findById(first)).projectCode).toBe('001');
    expect((await Project.findById(second)).projectCode).toBe('002');
    await migrateProjectCodes();
    expect(await generateProjectCode()).toBe('003');
    await Project.collection.insertMany([{ projectCode: '999' }, { projectCode: '1000' }]);
    expect(await generateProjectCode()).toBe('1001');
  });
});
