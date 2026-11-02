import mongoose from 'mongoose';
import Project from '../modules/projects/project.model.js';
import logger from './logger.js';

const generateProjectCode = async (clientId) => {
  if (!clientId) throw new Error('generateProjectCode requires a clientId');
  if (!mongoose.isObjectIdOrHexString(clientId)) {
    throw new Error('generateProjectCode requires a valid clientId');
  }
  const [last] = await Project.aggregate([
    { $match: { client: new mongoose.Types.ObjectId(clientId), projectCode: /^\d+$/ } },
    { $group: { _id: null, sequence: { $max: { $toLong: '$projectCode' } } } },
  ]);
  return String(Number(last?.sequence || 0) + 1).padStart(3, '0');
};

export const migrateProjectCodes = async () => {
  const projects = await Project.find({
    $or: [{ projectCode: /^RE-.*PRJ-/ }, { projectCode: /^TMP-/ }, { projectCode: '' }, { projectCode: null }],
  }).sort({ createdAt: 1, _id: 1 }).select('_id client').lean();
  const sequences = new Map();
  const operations = [];
  for (const project of projects) {
    if (!project.client) {
      logger.warn('[project-codes] Skipped project without a client', { projectId: String(project._id) });
      continue;
    }
    const clientId = String(project.client);
    if (!sequences.has(clientId)) {
      sequences.set(clientId, Number(await generateProjectCode(project.client)));
    }
    const sequence = sequences.get(clientId);
    operations.push({
      updateOne: {
        filter: { _id: project._id },
        update: { $set: { projectCode: String(sequence).padStart(3, '0') } },
      },
    });
    sequences.set(clientId, sequence + 1);
  }
  if (operations.length) await Project.bulkWrite(operations);
};

export const renumberProjectCodesByCompany = async ({ dryRun = false } = {}) => {
  const projects = await Project.find({}).sort({ createdAt: 1, _id: 1 })
    .select('_id title client projectCode').lean();
  const sequences = new Map();
  const changes = [];
  let skipped = 0;
  for (const project of projects) {
    if (!project.client) {
      skipped += 1;
      logger.warn('[project-codes] Skipped project without a client', { projectId: String(project._id) });
      continue;
    }
    const clientId = String(project.client);
    const sequence = (sequences.get(clientId) || 0) + 1;
    sequences.set(clientId, sequence);
    changes.push({
      projectId: String(project._id),
      title: project.title,
      clientId,
      oldCode: project.projectCode ?? '',
      newCode: String(sequence).padStart(3, '0'),
    });
  }
  if (!dryRun && changes.length) {
    await Project.bulkWrite(changes.map(({ projectId }) => ({
      updateOne: {
        filter: { _id: projectId },
        update: { $set: { projectCode: `TMP-${projectId}` } },
      },
    })));
    await Project.bulkWrite(changes.map(({ projectId, newCode }) => ({
      updateOne: {
        filter: { _id: projectId },
        update: { $set: { projectCode: newCode } },
      },
    })));
  }
  return { updated: changes.length, skipped, changes };
};

export default generateProjectCode;
