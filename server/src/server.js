import { createServer } from 'http';
import app from './app.js';
import config from './config/index.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import { initSocketIO } from './sockets/index.js';
import { startOverdueCron } from './jobs/invoiceOverdue.job.js';
import { startMeetingReminderCron } from './jobs/meetingReminder.job.js';
import { startTaskDueCron } from './jobs/taskDueSoon.job.js';
import { startCleanupCron } from './jobs/cleanupNotifications.job.js';
import User from './modules/auth/auth.model.js';
import Client from './modules/clients/client.model.js';
import { ROLES, ROLE_PERMISSIONS } from './constants/index.js';

/**
 * Fix stale MongoDB indexes that were created without sparse:true.
 * The Client model's `user` field has a unique+sparse index, but if the
 * index was created without sparse, all null user values collide (E11000).
 * This drops the bad index and lets Mongoose recreate it correctly.
 */
const fixStaleIndexes = async () => {
  try {
    const indexes = await Client.collection.indexes();
    const userIdx = indexes.find((idx) => idx.key && idx.key.user === 1);
    if (userIdx && !userIdx.sparse) {
      logger.info('[index-fix] Dropping stale user_1 index (missing sparse:true)');
      await Client.collection.dropIndex('user_1');
      await Client.createIndexes();
      logger.info('[index-fix] user_1 index recreated with sparse:true');
    }
  } catch (err) {
    // If index doesn't exist or already correct, skip silently
    if (err.codeName === 'IndexNotFound') {
      // Index doesn't exist yet — Mongoose will create it on first use
    } else {
      logger.warn(`[index-fix] Skipped: ${err.message}`);
    }
  }
};

const autoSeed = async () => {
  try {
    const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
    if (existing) return;

    const email = process.env.SEED_EMAIL || 'fizzzydev@gmail.com';
    const password = process.env.SEED_PASSWORD || 'Test@123';
    const name = process.env.SEED_NAME || 'Faizal Shaikh';

    await User.create({
      name,
      email,
      password,
      role: ROLES.SUPER_ADMIN,
      permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN],
      isEmailVerified: true,
      isActive: true,
    });

    logger.info(`[auto-seed] Super admin created: ${email}`);
  } catch (err) {
    logger.warn(`[auto-seed] Skipped (${err.message})`);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await fixStaleIndexes();
    await autoSeed();

    const httpServer = createServer(app);

    // Initialize Socket.io
    initSocketIO(httpServer);

    startOverdueCron();
    startMeetingReminderCron();
    startTaskDueCron();
    startCleanupCron();

    httpServer.listen(config.port, '0.0.0.0', () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

startServer();
