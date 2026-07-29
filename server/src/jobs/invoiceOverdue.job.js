import cron from 'node-cron';
import Invoice from '../modules/invoices/invoice.model.js';
import * as notificationService from '../modules/notifications/notification.service.js';
import logger from '../utils/logger.js';

const markOverdueInvoices = async () => {
  const now = new Date();

  const overdueInvoices = await Invoice.find(
    { status: { $in: ['sent', 'partially_paid'] }, dueDate: { $lt: now } },
  ).populate('createdBy', '_id');

  const ids = overdueInvoices.map((inv) => inv._id);
  if (ids.length === 0) return;

  await Invoice.updateMany(
    { _id: { $in: ids } },
    { $set: { status: 'overdue' } },
  );

  for (const invoice of overdueInvoices) {
    if (invoice.createdBy?._id) {
      const notif = notificationService.buildNotification('invoice_overdue', {
        invoiceNumber: invoice.invoiceNumber,
      });
      notificationService.createAndSend({
        recipient: invoice.createdBy._id,
        referenceId: invoice._id,
        referenceModel: 'Invoice',
        ...notif,
      }).catch(() => {});
    }
  }

  logger.info(`Overdue cron: ${ids.length} invoices marked overdue, notifications sent`);
};

export const startOverdueCron = () => {
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
