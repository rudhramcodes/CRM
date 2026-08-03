import ApiError from '../../utils/ApiError.js';
import * as paymentRepository from './payment.repository.js';
import Invoice from '../invoices/invoice.model.js';
import { INVOICE_STATUS } from '../../constants/index.js';
import { sendEmail, renderPaymentEmail } from '../../services/emailService.js';
import * as notificationService from '../notifications/notification.service.js';
import logger from '../../utils/logger.js';

const markOverdueIfPastDue = async (invoice) => {
  if (!invoice) return;
  const now = new Date();
  const shouldBeOverdue =
    ['sent', 'partially_paid'].includes(invoice.status) &&
    invoice.dueDate < now;
  if (shouldBeOverdue) {
    invoice.status = 'overdue';
  }
};

const recalculateInvoicePayment = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw ApiError.notFound('Invoice not found');

  const totalPaid = await paymentRepository.getTotalByInvoice(invoiceId);
  // Cap paidAmount at invoice.total so balanceDue never goes negative
  invoice.paidAmount = Math.min(totalPaid, invoice.total);

  const latestPayment = await paymentRepository.getLatestPayment(invoiceId);
  invoice.lastPaymentDate = latestPayment?.paymentDate || null;

  if (totalPaid <= 0) {
    invoice.status = invoice.sentAt ? INVOICE_STATUS.SENT : INVOICE_STATUS.DRAFT;
    invoice.paidAt = null;
  } else if (totalPaid >= invoice.total) {
    invoice.status = INVOICE_STATUS.PAID;
    invoice.paidAt = new Date();
  } else {
    invoice.status = INVOICE_STATUS.PARTIALLY_PAID;
    invoice.paidAt = null;
  }

  await markOverdueIfPastDue(invoice);

  await invoice.save();
  return invoice;
};

const sendPaymentConfirmation = async (payment, invoice, outstanding) => {
  const clientEmail = invoice.client?.email;
  if (!clientEmail) {
    logger.warn(`Cannot send payment confirmation: invoice ${invoice.invoiceNumber} has no client email`);
    return;
  }
  const html = renderPaymentEmail({
    clientName: invoice.client?.contactPerson || 'Client',
    invoiceNumber: invoice.invoiceNumber,
    amount: payment.amount,
    date: payment.paymentDate,
    outstanding,
  });
  try {
    await sendEmail({ to: clientEmail, subject: `Payment Received — ${invoice.invoiceNumber}`, html });
    logger.info(`Payment confirmation email sent for ${invoice.invoiceNumber}`);
  } catch (err) {
    logger.error(`Payment confirmation email failed: ${err.message}`, { invoice: invoice.invoiceNumber });
  }
};

export const createPayment = async (data, user) => {
  const invoice = await Invoice.findById(data.invoice);
  if (!invoice) throw ApiError.notFound('Invoice not found');

  if (invoice.status === INVOICE_STATUS.CANCELLED) {
    throw ApiError.badRequest('Cannot add payment to a cancelled invoice');
  }

  if (invoice.status === INVOICE_STATUS.PAID) {
    throw ApiError.badRequest('Invoice is already fully paid');
  }

  if (data.amount > invoice.balanceDue) {
    throw ApiError.badRequest(
      `Payment amount (${data.amount}) exceeds balance due (${invoice.balanceDue})`,
    );
  }

  const payment = await paymentRepository.create({
    invoice: data.invoice,
    client: invoice.client,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    referenceNo: data.referenceNo || '',
    notes: data.notes || '',
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    status: data.status || 'completed',
    createdBy: user._id,
  });

  const updatedInvoice = await recalculateInvoicePayment(data.invoice);

  if (payment.status === 'completed') {
    const outstanding = Math.max(0, updatedInvoice.balanceDue);
    sendPaymentConfirmation(payment, updatedInvoice, outstanding).catch((err) =>
      logger.error(`Payment email send failed: ${err.message}`),
    );

    // 🔔 Notify invoice creator that payment was received
    const notif = notificationService.buildNotification('payment_received', {
      amount: payment.amount, invoiceNumber: updatedInvoice.invoiceNumber,
    });
    if (updatedInvoice.createdBy) {
      notificationService.createAndSend({
        recipient: updatedInvoice.createdBy, referenceId: updatedInvoice._id, referenceModel: 'Invoice',
        link: `/invoices/${updatedInvoice._id}`,
        ...notif,
      }).catch(() => {});
    }

    // 🔔 If invoice is fully paid, send invoice_paid notification
    if (updatedInvoice.status === 'paid' && updatedInvoice.createdBy) {
      const paidNotif = notificationService.buildNotification('invoice_paid', {
        invoiceNumber: updatedInvoice.invoiceNumber,
      });
      notificationService.createAndSend({
        recipient: updatedInvoice.createdBy, referenceId: updatedInvoice._id, referenceModel: 'Invoice',
        link: `/invoices/${updatedInvoice._id}`,
        ...paidNotif,
      }).catch(() => {});
    }
  }

  return paymentRepository.findById(payment._id);
};

export const getPayments = async (query) => {
  const { page, limit, sortBy, sortOrder, ...filters } = query;
  return paymentRepository.findAll(filters, { page, limit, sortBy, sortOrder });
};

export const getPaymentById = async (id) => {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found');
  return payment;
};

export const getInvoicePayments = async (invoiceId) => {
  return paymentRepository.findByInvoice(invoiceId);
};

export const updatePayment = async (id, data) => {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found');

  const updated = await paymentRepository.updateById(id, data);

  // Recalculate invoice when amount or status changes (status affects completed-total sum)
  const amountChanged = data.amount !== undefined && data.amount !== payment.amount;
  const statusChanged = data.status !== undefined && data.status !== payment.status;
  if (amountChanged || statusChanged) {
    await recalculateInvoicePayment(payment.invoice._id || payment.invoice);
  }

  return updated;
};

export const deletePayment = async (id) => {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found');

  const invoiceId = payment.invoice._id || payment.invoice;
  await paymentRepository.deleteById(id);
  await recalculateInvoicePayment(invoiceId);
};

export const getPaymentStats = async () => {
  return paymentRepository.getStats();
};

export const getPaymentReceiptPdf = async (id) => {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found');
  const invoice = payment.invoice || {};
  const { generatePaymentReceiptPdf } = await import('../../services/pdfService.js');
  return generatePaymentReceiptPdf(payment, invoice);
};
