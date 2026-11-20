// Test the clock-in reminders now instead of waiting for 9:50 / 10:05: `node scripts/sendClockReminder.mjs in|late`
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import { sendClockInReminders } from '../src/jobs/clockReminder.job.js';
import logger from '../src/utils/logger.js';

const kind = process.argv[2];
if (!['in', 'late'].includes(kind)) {
  console.error('Usage: node scripts/sendClockReminder.mjs in|late');
  process.exit(1);
}

try {
  await mongoose.connect(config.mongodbUri);
  const count = await sendClockInReminders(kind);
  logger.info(`[ClockReminder] test run sent ${count} reminder(s)`);
} catch (error) {
  logger.error(`[ClockReminder] test run failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
