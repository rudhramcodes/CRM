import ApiError from '../../utils/ApiError.js';
import * as invoiceRepository from './invoice.repository.js';
import { sendEmail } from '../../services/emailService.js';
import { generateInvoicePdf, generateInvoiceHtml } from '../../services/pdfService.js';
import logger from '../../utils/logger.js';
import Client from '../clients/client.model.js';
import { VENTURE_CODES } from '../../constants/index.js';

const VALID_TRANSITIONS = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'cancelled'],
  paid: [],
  overdue: ['paid', 'cancelled'],
  cancelled: [],
};

export const generateInvoiceNumber = async (brand) => {
  const ventureCode = VENTURE_CODES[brand] || 'PG';
  const prefix = `INV-${ventureCode}-`;
  const count = await invoiceRepository.getInvoiceCountByPrefix(prefix);
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${seq}`;
};

const fmtCurrency = (val) => `INR ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

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

export const getInvoiceById = async (id) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }
  return invoice;
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

  return invoiceRepository.updateById(id, updateData);
};

export const updateInvoiceStatus = async (id, status) => {
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
  if (status === 'paid') updateData.paidAt = new Date();
  if (status === 'cancelled') updateData.cancelledAt = new Date();

  return invoiceRepository.updateById(id, updateData);
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

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:15px;color:#374151;line-height:1.7">Dear ${client.contactPerson || 'Client'},</p>
      <p style="font-size:15px;color:#374151;line-height:1.7">
        Please find attached the invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${fmtCurrency(invoice.total)}</strong>, due by <strong>${fmtDate(invoice.dueDate)}</strong>.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.7">The PDF copy of the invoice is attached to this email for your records.</p>
      <p style="font-size:15px;color:#374151;line-height:1.7">If you have any questions, feel free to reach out.</p>
      <br>
      <p style="font-size:15px;color:#374151;line-height:1.7">Best regards,<br><strong style="color:#B3752F">Rudhram Enterprises</strong></p>
    </div>
  `;

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

  return invoiceRepository.deleteById(id);
};

export const sendInvoiceEmailById = async (id) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (!invoice.client?.email) throw ApiError.badRequest('Client has no email address');

  await sendInvoiceEmail(invoice);
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
