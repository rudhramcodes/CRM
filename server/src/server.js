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

const startServer = async () => {
  try {
    await connectDB();

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
