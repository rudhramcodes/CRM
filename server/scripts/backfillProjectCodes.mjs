import mongoose from 'mongoose';
import config from '../src/config/index.js';
import { renumberProjectCodesByCompany } from '../src/utils/generateProjectCode.js';
import logger from '../src/utils/logger.js';

const run = async () => {
  await mongoose.connect(config.mongodbUri);
  logger.info('[project-codes] Connected to MongoDB');

  const dryRun = process.argv.includes('--dry-run');
  const { updated, skipped, changes } = await renumberProjectCodesByCompany({ dryRun });
  for (const change of changes) {
    logger.info(`[project-codes] ${dryRun ? '[dry-run] ' : ''}${change.title} (${change.projectId}, client ${change.clientId}): ${change.oldCode} -> ${change.newCode}`);
  }

  logger.info(`[project-codes] ${dryRun ? '[dry-run] ' : ''}Updated: ${updated}; Skipped: ${skipped}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  logger.error(`[project-codes] Failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
