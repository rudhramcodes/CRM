import mongoose from 'mongoose';
import config from '../src/config/index.js';
import Project from '../src/modules/projects/project.model.js';
import Client from '../src/modules/clients/client.model.js';
import generateProjectCode from '../src/utils/generateProjectCode.js';
import logger from '../src/utils/logger.js';

const run = async () => {
  await mongoose.connect(config.mongodbUri);
  logger.info('[project-codes] Connected to MongoDB');

  const projects = await Project.find({
    $or: [
      { projectCode: '' },
      { projectCode: null },
      { projectCode: { $exists: false } },
    ],
  }).sort({ createdAt: 1 });

  let updated = 0;
  let skipped = 0;
  for (const project of projects) {
    let brand = project.brand;
    if (!brand && project.client) {
      const client = await Client.findById(project.client).select('brand').lean();
      brand = client?.brand;
    }
    if (!brand) {
      skipped += 1;
      logger.warn(`[project-codes] Skipped ${project.title}: no brand`);
      continue;
    }
    project.projectCode = await generateProjectCode(brand);
    await project.save();
    updated += 1;
    logger.info(`[project-codes] ${project.title} -> ${project.projectCode}`);
  }

  logger.info(`[project-codes] Updated: ${updated}; skipped: ${skipped}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  logger.error(`[project-codes] Failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
