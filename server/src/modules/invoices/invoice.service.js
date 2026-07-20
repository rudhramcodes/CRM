import ApiError from '../../utils/ApiError.js';
import * as invoiceRepository from './invoice.repository.js';

const VALID_TRANSITIONS = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'cancelled'],
  paid: [],
  overdue: ['paid', 'cancelled'],
  cancelled: [],
};

export const generateInvoiceNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;

  const todayCount = await invoiceRepository.getDailyInvoiceCount();
  const seq = String(todayCount + 1).padStart(4, '0');

  return `${prefix}${seq}`;
};

const validateStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return;
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw ApiError.badRequest(
      `Cannot transition invoice from '${currentStatus}' to '${newStatus}'`,
    );
  }
};

export const createInvoice = async (data, user) => {
  const invoiceNumber = await generateInvoiceNumber();

  const payload = {
    invoiceNumber,
    client: data.client,
    project: data.project || null,
    issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
    dueDate: new Date(data.dueDate),
    items: data.items,
    taxRate: data.taxRate || 0,
    discountPercent: data.discountPercent || 0,
    billingAddress: data.billingAddress || {},
    notes: data.notes || '',
    termsConditions: data.termsConditions || '',
    createdBy: user._id,
  };

  return invoiceRepository.create(payload);
};

export const getInvoices = async (query) => {
  const { page, limit, sortBy, sortOrder, ...filters } = query;
  return invoiceRepository.findAll(filters, { page, limit, sortBy, sortOrder });
};

export const getInvoiceById = async (id) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }
  return invoice;
};

export const updateInvoice = async (id, data) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }

  if (invoice.status !== 'draft') {
    throw ApiError.badRequest('Only draft invoices can be edited');
  }

  const updateData = { ...data };
  if (data.issueDate) updateData.issueDate = new Date(data.issueDate);
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

  return invoiceRepository.updateById(id, updateData);
};

export const updateInvoiceStatus = async (id, status) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }

  validateStatusTransition(invoice.status, status);

  const updateData = { status };
  if (status === 'sent') updateData.sentAt = new Date();
  if (status === 'paid') updateData.paidAt = new Date();
  if (status === 'cancelled') updateData.cancelledAt = new Date();

  return invoiceRepository.updateById(id, updateData);
};

export const deleteInvoice = async (id) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }

  if (invoice.status !== 'draft') {
    throw ApiError.badRequest('Only draft invoices can be deleted');
  }

  return invoiceRepository.deleteById(id);
};

export const getStats = async () => {
  const statusCounts = await invoiceRepository.countByStatus();
  const revenueStats = await invoiceRepository.getRevenueStats();
  const total = await invoiceRepository.countAll();
  const overdueCount = await invoiceRepository.countOverdue();

  const statusBreakdown = { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 };
  statusCounts.forEach(({ _id, count }) => {
    statusBreakdown[_id] = count;
  });

  return {
    total,
    ...statusBreakdown,
    overdueCount,
    revenue: revenueStats,
  };
};
