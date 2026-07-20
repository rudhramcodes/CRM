import cron from 'node-cron';
import Invoice from '../modules/invoices/invoice.model.js';
import logger from '../utils/logger.js';

const markOverdueInvoices = async () => {
  const now = new Date();

  const result = await Invoice.updateMany(
    { status: 'sent', dueDate: { $lt: now } },
    { $set: { status: 'overdue' } },
  );

  if (result.modifiedCount > 0) {
    logger.info(`Overdue cron: ${result.modifiedCount} invoices marked overdue`);
  }
};

export const startOverdueCron = () => {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Overdue cron: starting daily check');
    try {
      await markOverdueInvoices();
    } catch (err) {
      logger.error('Overdue cron failed', { error: err.message });
    }
  });

  logger.info('Overdue cron: scheduled daily at 00:00');
};
