import ApiError from '../../utils/ApiError.js';
import * as invoiceRepository from './invoice.repository.js';
import Client from '../clients/client.model.js';
import Quotation from '../quotations/quotation.model.js';
import { VENTURE_CODES } from '../../constants/index.js';
import { INVOICE_PRINTED_FIELDS } from './invoice.printed-fields.js';

export const generateInvoiceNumber = async (brand) => {
  const prefix = `INV-${VENTURE_CODES[brand] || 'PG'}-`;
  const count = await invoiceRepository.getInvoiceCountByPrefix(prefix);
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const resolveSource = async (data) => {
  if (data.sourceRevision && !data.sourceQuotation) {
    throw ApiError.badRequest('Source revision requires a source quotation');
  }
  if (!data.sourceQuotation) return {};
  const quotation = await Quotation.findById(data.sourceQuotation).select('client project schemaVersion archivedAt');
  if (!quotation) throw ApiError.notFound('Quotation not found');
  if (quotation.archivedAt) throw ApiError.badRequest('Archived quotations cannot be invoiced');
  let clientId = quotation.client;
  let projectId = quotation.project;
  let revisionFields = {};
  if (quotation.schemaVersion === 2 || data.sourceRevision) {
    if (!data.sourceRevision) throw ApiError.badRequest('A saved source revision is required');
    const { getInvoiceSource } = await import('../quotations/quotationRevision.service.js');
    const source = await getInvoiceSource(data.sourceQuotation, data.sourceRevision);
    clientId = source.content.client._id;
    projectId = source.content.project?._id || null;
    revisionFields = { sourceRevision: source.revisionId, sourceRevisionVersion: source.version };
    if (String(projectId || '') !== String(data.project || '')) {
      throw ApiError.badRequest('Quotation does not belong to the selected project');
    }
  }
  if (String(clientId) !== String(data.client)) {
    throw ApiError.badRequest('Quotation does not belong to the selected client');
  }
  if (projectId && String(projectId) !== String(data.project)) {
    throw ApiError.badRequest('Quotation does not belong to the selected project');
  }
  if (await invoiceRepository.findBySourceQuotation(data.sourceQuotation)) {
    throw ApiError.conflict('An invoice already exists for this quotation');
  }
  return { sourceQuotation: data.sourceQuotation, ...revisionFields };
};

export const createInvoice = async (data, user) => {
  const clientDoc = await Client.findById(data.client).select('brand');
  if (!clientDoc) throw ApiError.notFound('Client not found');
  const source = await resolveSource(data);
  const invoiceNumber = await generateInvoiceNumber(clientDoc.brand);
  const payload = {
    ...Object.fromEntries(Object.keys(INVOICE_PRINTED_FIELDS)
      .filter((field) => data[field] !== undefined)
      .map((field) => [field, data[field]])),
    invoiceNumber,
    client: data.client,
    project: data.project || null,
    ...source,
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
  try {
    return await invoiceRepository.create(payload);
  } catch (error) {
    if (error instanceof Error && error.code === 11000 && data.sourceQuotation &&
        (error.keyPattern?.sourceQuotation ||
         await invoiceRepository.findBySourceQuotation(data.sourceQuotation))) {
      throw ApiError.conflict('An invoice already exists for this quotation');
    }
    throw error;
  }
};
