import cron from 'node-cron';
import * as notificationService from '../modules/notifications/notification.service.js';
import logger from '../utils/logger.js';

const cleanupOldNotifications = async () => {
  const deleted = await notificationService.deleteOldNotifications(90);
  if (deleted > 0) {
    logger.info(`Cleanup cron: ${deleted} old notifications deleted`);
  }
};

export const startCleanupCron = () => {
  cron.schedule('0 3 * * 0', async () => {
    logger.info('Cleanup cron: starting weekly old notification cleanup');
    try {
      await cleanupOldNotifications();
    } catch (err) {
      logger.error('Cleanup cron failed', { error: err.message });
    }
  });

  logger.info('Cleanup cron: scheduled weekly on Sunday at 03:00');
};
