import ApiError from '../../utils/ApiError.js';
import * as invoiceRepository from './invoice.repository.js';
import { sendEmail, renderInvoiceEmail } from '../../services/emailService.js';
import { generateInvoicePdf, generateInvoiceHtml } from '../../services/pdfService.js';
import logger from '../../utils/logger.js';
import Client from '../clients/client.model.js';
import Payment from '../payments/payment.model.js';
import { VENTURE_CODES } from '../../constants/index.js';
import * as notificationService from '../notifications/notification.service.js';

// Invoice service manages NON-FINANCIAL status transitions only.
// Financial transitions (→ partially_paid, → paid) are handled by Payment service
// when payments are created/updated/deleted.
const VALID_TRANSITIONS = {
  draft: ['sent', 'cancelled'],
  sent: ['cancelled'],
  partially_paid: ['paid', 'cancelled'],
  overdue: ['cancelled'],
  paid: [],
  cancelled: [],
};

export const generateInvoiceNumber = async (brand) => {
  const ventureCode = VENTURE_CODES[brand] || 'PG';
  const prefix = `INV-${ventureCode}-`;
  const count = await invoiceRepository.getInvoiceCountByPrefix(prefix);
  const seq = String(count + 1).padStart(4, '0');
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
  const clientDoc = await Client.findById(data.client).select('brand');
  const invoiceNumber = await generateInvoiceNumber(clientDoc?.brand);

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

const markOverdueIfPastDue = async (invoice) => {
  if (!invoice) return;
  const now = new Date();
  const shouldBeOverdue =
    ['sent', 'partially_paid'].includes(invoice.status) &&
    invoice.dueDate < now;
  if (shouldBeOverdue) {
    invoice.status = 'overdue';
    await invoice.save();
  }
};

export const getInvoiceById = async (id) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }
  await markOverdueIfPastDue(invoice);
  return invoiceRepository.findById(id);
};

export const getInvoiceHtml = async (id) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }
  return generateInvoiceHtml(invoice);
};

export const getInvoicePdf = async (id) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }
  return generateInvoicePdf(invoice);
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
  // normalize empty project string to null
  if (updateData.project === '') updateData.project = null;
  // recalculate computed fields (pre('save') doesn't run on findByIdAndUpdate)
  if (updateData.items) {
    updateData.items = updateData.items.map((item) => ({
      ...item,
      amount: item.quantity * item.unitPrice,
    }));
    const subtotal = updateData.items.reduce((s, i) => s + i.amount, 0);
    const taxRate = updateData.taxRate ?? 0;
    const discountPercent = updateData.discountPercent ?? 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const discountAmount = (subtotal * discountPercent) / 100;
    const total = subtotal + taxAmount - discountAmount;
    const paidAmount = updateData.paidAmount ?? invoice.paidAmount ?? 0;
    Object.assign(updateData, { subtotal, taxAmount, discountAmount, total, balanceDue: total - paidAmount });
  }

  return invoiceRepository.updateById(id, updateData);
};

export const updateInvoiceStatus = async (id, status, user = null) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }

  validateStatusTransition(invoice.status, status);

  const updateData = { status };
  if (status === 'sent') {
    updateData.sentAt = new Date();
    sendInvoiceEmail(invoice).catch((err) => {
      logger.error(`Invoice email failed: ${err.message}`, { invoice: invoice.invoiceNumber });
    });
  }
  if (status === 'cancelled') updateData.cancelledAt = new Date();

  const updated = await invoiceRepository.updateById(id, updateData);

  if (status === 'sent' && user) {
    const notif = notificationService.buildNotification('system', {
      message: `Invoice #${invoice.invoiceNumber} has been sent to ${invoice.client?.contactPerson || 'client'}`,
    });
    const adminQuery = (await import('../auth/auth.model.js')).default;
    const admins = await adminQuery.find({ role: { $in: ['super_admin', 'admin'] }, isActive: true }).select('_id');
    const adminIds = admins.map((a) => String(a._id)).filter((aid) => String(aid) !== String(user._id));
    notificationService.createAndSendBulk(adminIds, {
      referenceId: invoice._id, referenceModel: 'Invoice',
      actionBy: user._id, link: `/invoices/${invoice._id}`,
      ...notif,
    }).catch(() => {});
  }

  return updated;
};

const sendInvoiceEmail = async (invoice) => {
  const clientEmail = invoice.client?.email;
  if (!clientEmail) {
    logger.warn(`Cannot send invoice ${invoice.invoiceNumber}: client has no email`);
    return;
  }

  logger.info(`Generating PDF for invoice ${invoice.invoiceNumber}...`);
  const pdfBuffer = await generateInvoicePdf(invoice);
  logger.info(`PDF generated (${(pdfBuffer.length / 1024).toFixed(1)} KB), sending email to ${clientEmail}...`);

  const client = invoice.client || {};

  const html = renderInvoiceEmail({
    clientName: client.contactPerson || 'Client',
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.total,
    dueDate: invoice.dueDate,
  });

  await sendEmail({
    to: clientEmail,
    subject: `Invoice ${invoice.invoiceNumber} from Rudhram Enterprises`,
    html,
    attachments: [{
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
};

export const deleteInvoice = async (id) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }

  if (invoice.status !== 'draft') {
    throw ApiError.badRequest('Only draft invoices can be deleted');
  }

  const paymentCount = await Payment.countDocuments({ invoice: id });
  if (paymentCount > 0) {
    throw ApiError.badRequest(
      'Cannot delete invoice with existing payments. Delete the payments first.',
    );
  }

  return invoiceRepository.deleteById(id);
};

export const sendInvoiceEmailById = async (id) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (!invoice.client?.email) throw ApiError.badRequest('Client has no email address');

  await sendInvoiceEmail(invoice);
};

export const getStats = async () => {
  const [statusCounts, revenueStats, total, overdueCount, brandCounts, revenueByBrand] = await Promise.all([
    invoiceRepository.countByStatus(),
    invoiceRepository.getRevenueStats(),
    invoiceRepository.countAll(),
    invoiceRepository.countOverdue(),
    invoiceRepository.countByBrand(),
    invoiceRepository.getRevenueByBrand(),
  ]);

  const statusBreakdown = { draft: 0, sent: 0, partially_paid: 0, paid: 0, overdue: 0, cancelled: 0 };
  statusCounts.forEach(({ _id, count }) => {
    statusBreakdown[_id] = count;
  });

  const byBrand = {};
  brandCounts.forEach(({ _id, count }) => {
    byBrand[_id || 'unassigned'] = count;
  });

  const revenueByBrandMap = {};
  revenueByBrand.forEach((item) => {
    const key = item._id || 'unassigned';
    revenueByBrandMap[key] = {
      count: item.count,
      totalRevenue: item.totalRevenue,
      totalPaid: item.totalPaid,
      totalPending: item.totalPending,
    };
  });

  return {
    total,
    ...statusBreakdown,
    overdueCount,
    revenue: revenueStats,
    byBrand,
    revenueByBrand: revenueByBrandMap,
  };
};
