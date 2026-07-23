import ApiError from '../../utils/ApiError.js';
import * as paymentRepository from './payment.repository.js';
import Invoice from '../invoices/invoice.model.js';
import { INVOICE_STATUS } from '../../constants/index.js';
import { sendEmail } from '../../services/emailService.js';
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
  const fmt = (val) => `\u20B9${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:15px;color:#374151;line-height:1.7">Dear ${invoice.client?.contactPerson || 'Client'},</p>
      <p style="font-size:15px;color:#374151;line-height:1.7">
        We have received a payment of <strong style="color:#059669">${fmt(payment.amount)}</strong> towards invoice <strong>${invoice.invoiceNumber}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;color:#374151">
        <tr><td style="padding:6px 12px;border:1px solid #e5e7eb">Amount</td><td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:bold">${fmt(payment.amount)}</td></tr>
        <tr><td style="padding:6px 12px;border:1px solid #e5e7eb">Invoice</td><td style="padding:6px 12px;border:1px solid #e5e7eb">${invoice.invoiceNumber}</td></tr>
        <tr><td style="padding:6px 12px;border:1px solid #e5e7eb">Date</td><td style="padding:6px 12px;border:1px solid #e5e7eb">${new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td></tr>
        <tr><td style="padding:6px 12px;border:1px solid #e5e7eb">Outstanding</td><td style="padding:6px 12px;border:1px solid #e5e7eb">${fmt(Math.max(0, outstanding))}</td></tr>
      </table>
      <p style="font-size:15px;color:#374151;line-height:1.7">Thank you for your payment.</p>
      <br>
      <p style="font-size:15px;color:#374151;line-height:1.7">Best regards,<br><strong style="color:#B3752F">Rudhram Enterprises</strong></p>
    </div>
  `;
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
