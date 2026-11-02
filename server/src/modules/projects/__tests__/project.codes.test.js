import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import Project from '../project.model.js';
import generateProjectCode, {
  migrateProjectCodes,
  renumberProjectCodesByCompany,
} from '../../../utils/generateProjectCode.js';

const uri = process.env.PROJECT_CODES_TEST_URI;
describe.skipIf(!uri)('per-client project IDs', () => {
  const clientA = new mongoose.Types.ObjectId();
  const clientB = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await mongoose.connect(uri, { dbName: `crm_project_codes_${randomUUID().replaceAll('-', '')}` });
    await Project.init();
  });
  beforeEach(async () => {
    await Project.deleteMany({});
  });
  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('starts at 001 when a client has no projects', async () => {
    expect(await generateProjectCode(clientA)).toBe('001');
  });

  it('advances only the client with an existing project', async () => {
    await Project.collection.insertOne({ client: clientA, projectCode: '001' });

    const nextCode = await generateProjectCode(String(clientA));

    expect(nextCode).toBe('002');
  });

  it('starts client B at 001 when client A already has codes', async () => {
    await Project.collection.insertMany([
      { client: clientA, projectCode: '001' },
      { client: clientA, projectCode: '002' },
    ]);

    const nextCode = await generateProjectCode(clientB);

    expect(nextCode).toBe('001');
  });

  it('migrates legacy and blank codes in creation order per client', async () => {
    const projects = [
      { _id: new mongoose.Types.ObjectId(), client: clientA, projectCode: '', createdAt: new Date('2026-02-01') },
      { _id: new mongoose.Types.ObjectId(), client: clientB, projectCode: 'RE-PRJ-PG-2026-001', createdAt: new Date('2026-01-01') },
      { _id: new mongoose.Types.ObjectId(), client: clientA, projectCode: 'RE-PRJ-AG-2026-001', createdAt: new Date('2026-01-01') },
    ];
    await Project.collection.insertMany(projects);

    await migrateProjectCodes();

    const codes = await Promise.all(projects.map(async ({ _id }) => (await Project.findById(_id)).projectCode));
    expect(codes).toEqual(['002', '001', '001']);
  });

  it('preserves numeric codes when startup migration runs again', async () => {
    await Project.collection.insertMany([
      { client: clientA, projectCode: '007', createdAt: new Date('2026-02-01') },
      { client: clientA, projectCode: '', createdAt: new Date('2026-01-01') },
      { client: clientB, createdAt: new Date('2026-01-01') },
    ]);
    await migrateProjectCodes();
    const before = await Project.find({}).sort({ _id: 1 }).select('_id client projectCode').lean();

    await migrateProjectCodes();

    expect(await Project.find({}).sort({ _id: 1 }).select('_id client projectCode').lean()).toEqual(before);
    expect(await generateProjectCode(clientA)).toBe('009');
    expect(await generateProjectCode(clientB)).toBe('002');
  });

  it('continues at 1000 when the client reaches 999', async () => {
    await Project.collection.insertOne({ client: clientA, projectCode: '999' });

    expect(await generateProjectCode(clientA)).toBe('1000');
  });

  it('continues at 1001 when the client reaches 1000', async () => {
    await Project.collection.insertMany([
      { client: clientA, projectCode: '999' },
      { client: clientA, projectCode: '1000' },
    ]);

    expect(await generateProjectCode(clientA)).toBe('1001');
  });

  it('rejects allocation when clientId is missing', async () => {
    await expect(generateProjectCode()).rejects.toThrow('generateProjectCode requires a clientId');
  });

  it('rejects allocation when clientId is invalid', async () => {
    await expect(generateProjectCode('invalid')).rejects.toThrow('generateProjectCode requires a valid clientId');
  });

  it('skips projects without a client during startup migration', async () => {
    const { insertedId } = await Project.collection.insertOne({ projectCode: '' });

    await migrateProjectCodes();

    expect((await Project.findById(insertedId)).projectCode).toBe('');
  });

  it('reports per-client changes without writes when dry-run is enabled', async () => {
    const projects = [
      { _id: new mongoose.Types.ObjectId(), title: 'A first', client: clientA, projectCode: '009', createdAt: new Date('2026-01-01') },
      { _id: new mongoose.Types.ObjectId(), title: 'A second', client: clientA, projectCode: '004', createdAt: new Date('2026-02-01') },
      { _id: new mongoose.Types.ObjectId(), title: 'B first', client: clientB, projectCode: '008', createdAt: new Date('2026-03-01') },
      { _id: new mongoose.Types.ObjectId(), title: 'No client', projectCode: '099' },
    ];
    await Project.collection.insertMany(projects);
    const before = await Project.collection.find({}).sort({ _id: 1 }).toArray();

    const result = await renumberProjectCodesByCompany({ dryRun: true });

    expect(result).toEqual({
      updated: 3,
      skipped: 1,
      changes: projects.slice(0, 3).map((project, index) => ({
        projectId: String(project._id), title: project.title, clientId: String(project.client),
        oldCode: project.projectCode, newCode: ['001', '002', '001'][index],
      })),
    });
    expect(await Project.collection.find({}).sort({ _id: 1 }).toArray()).toEqual(before);
  });

  it('renumbers per client without unique-index collisions when existing codes swap', async () => {
    const first = new mongoose.Types.ObjectId('000000000000000000000001');
    const second = new mongoose.Types.ObjectId('000000000000000000000002');
    const third = new mongoose.Types.ObjectId('000000000000000000000003');
    const orphan = new mongoose.Types.ObjectId('000000000000000000000004');
    const createdAt = new Date('2026-01-01');
    await Project.collection.insertMany([
      { _id: second, title: 'A second', client: clientA, projectCode: '001', createdAt },
      { _id: first, title: 'A first', client: clientA, projectCode: '002', createdAt },
      { _id: third, title: 'B first', client: clientB, projectCode: '007', createdAt },
      { _id: orphan, title: 'No client', projectCode: '099', createdAt },
    ]);

    const result = await renumberProjectCodesByCompany();

    expect(result.updated).toBe(3);
    expect(result.skipped).toBe(1);
    const projects = await Project.find({}).sort({ _id: 1 }).lean();
    expect(projects.map(({ _id, projectCode }) => [String(_id), projectCode])).toEqual([
      [String(first), '001'], [String(second), '002'], [String(third), '001'], [String(orphan), '099'],
    ]);
  });
});
