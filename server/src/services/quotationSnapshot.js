import { createQuotationSchema, quotationFields } from '../modules/quotations/quotation.validation.js';
import { buildQuotationDefaults } from '../modules/quotations/quotation.defaults.js';
import Client from '../modules/clients/client.model.js';
import Project from '../modules/projects/project.model.js';
import ApiError from '../utils/ApiError.js';
import mongoose from 'mongoose';

export const contentFields = Object.keys(quotationFields);
export const idOf = (value) => value?._id ?? value;
const plain = (value) => value?.toObject ? value.toObject() : value;

export const snapshotContent = async (input) => {
  const candidate = { ...input, client: String(idOf(input.client)), project: input.project ? String(idOf(input.project)) : null };
  for (const field of ['issueDate', 'validUntil']) {
    if (candidate[field] instanceof Date) candidate[field] = candidate[field].toISOString();
  }
  const parsed = createQuotationSchema.safeParse(candidate);
  if (!parsed.success) throw ApiError.badRequest('Invalid quotation content', parsed.error.issues);
  const data = parsed.data;
  if (!mongoose.isValidObjectId(data.client) || (data.project && !mongoose.isValidObjectId(data.project))) {
    throw ApiError.badRequest('Invalid client or project ID');
  }
  const client = await Client.findById(data.client).select('brand clientId companyName contactPerson email phone gstNumber address');
  if (!client) throw ApiError.badRequest('Client not found');
  const project = data.project ? await Project.findById(data.project).select('client title budget projectCode status deadline') : null;
  if (data.project && !project) throw ApiError.badRequest('Project not found');
  if (project && String(idOf(project.client)) !== data.client) {
    throw ApiError.badRequest('Selected project does not belong to this client');
  }
  const defaults = buildQuotationDefaults({ client, project, templateId: data.templateId });
  const resolved = { ...defaults, ...data };
  const issueDate = new Date(resolved.issueDate);
  const validUntil = resolved.validUntil ? new Date(resolved.validUntil) : null;
  if (validUntil && validUntil < issueDate) throw ApiError.badRequest('Valid until must be on or after issue date');
  const taxAmount = resolved.price * resolved.taxRate / 100;
  const sourceClient = plain(input.client);
  const sourceProject = plain(input.project);
  return {
    ...resolved, quotationNumber: input.quotationNumber,
    client: typeof sourceClient?.brand === 'string' ? sourceClient : plain(client),
    project: typeof sourceProject?.title === 'string' ? sourceProject : plain(project), issueDate, validUntil,
    taxAmount, total: resolved.price + taxAmount,
  };
};

export const latestProjection = (content) => ({
  ...Object.fromEntries(contentFields.map((field) => [field, content[field]])),
  client: idOf(content.client), project: idOf(content.project) || null,
  taxAmount: content.taxAmount, total: content.total,
});

export const serializeQuotation = (document) => {
  const value = plain(document);
  if (value.schemaVersion !== 2) return value;
  return {
    ...value, hasWorkingCopy: Boolean(value.workingCopy),
    revisions: (value.revisions || []).map(({ content, artifacts, inFlightSend, ...summary }) => summary),
  };
};

export const serializeRevision = (revision) => {
  const { artifacts, inFlightSend, ...detail } = plain(revision);
  return detail;
};
