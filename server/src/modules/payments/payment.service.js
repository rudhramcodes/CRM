import ApiError from '../../utils/ApiError.js';
import * as paymentRepository from './payment.repository.js';
import Invoice from '../invoices/invoice.model.js';
import { INVOICE_STATUS } from '../../constants/index.js';

const recalculateInvoicePayment = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw ApiError.notFound('Invoice not found');

  const totalPaid = await paymentRepository.getTotalByInvoice(invoiceId);
  // Cap paidAmount at invoice.total so balanceDue never goes negative
  invoice.paidAmount = Math.min(totalPaid, invoice.total);

  if (totalPaid <= 0) {
    invoice.status = invoice.sentAt ? INVOICE_STATUS.SENT : INVOICE_STATUS.DRAFT;
    invoice.paidAt = null;
  } else if (totalPaid >= invoice.total) {
    invoice.status = INVOICE_STATUS.PAID;
    invoice.paidAt = invoice.paidAt || new Date();
  } else {
    invoice.status = INVOICE_STATUS.PARTIALLY_PAID;
    invoice.paidAt = null;
  }

  await invoice.save();
  return invoice;
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

  await recalculateInvoicePayment(data.invoice);

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

  // If amount changed, recalculate invoice payment totals
  if (data.amount !== undefined && data.amount !== payment.amount) {
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
