import ApiError from '../../utils/ApiError.js';
import * as quotationRepository from './quotation.repository.js';
import { generateQuotationHtml, generateQuotationPdf } from '../../services/pdfService.js';
import { sendEmail, renderQuotationEmail } from '../../services/emailService.js';
import logger from '../../utils/logger.js';
import Client from '../clients/client.model.js';
import Project from '../projects/project.model.js';
import { VENTURE_CODES, QUOTATION_STATUS } from '../../constants/index.js';

const VALID_TRANSITIONS = {
  draft: ['sent', 'accepted', 'rejected', 'expired'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: [],
};

const DEFAULT_SCOPE_INTRO =
  'The assignment covers the development of a comprehensive and cohesive Brand Identity System, including:';

const DEFAULT_SCOPE = [
  'Logo Identity – Creation of a distinctive and versatile professional logo.',
  'Colour Palette – Defining primary and secondary brand colours with usage specifications.',
  'Typography – Selection of appropriate fonts and typographic hierarchy.',
  'Visual Language – Development of supporting graphic elements, imagery style, patterns, and overall visual direction.',
  'Brand Applications – Application of the identity across selected print and digital brand touchpoints.',
  'Brand Guidelines – Preparation of guidelines covering logo usage, colours, typography, visual elements, and brand applications to ensure consistency across all communications.',
  'Brand Positioning – Defining the brand’s market positioning and differentiation.',
  'Target Audience – Identifying key audience segments and their needs.',
  'Brand Personality & Tone of Voice – Establishing the brand character and communication style.',
  'Brand Messaging – Developing clear and consistent core brand messaging.',
  'USP & Communication Pillars – Defining key differentiators and strategic communication themes.',
  'Tagline Development – Creating relevant and distinctive tagline options.',
  'Domain Purchase & Registration – Assistance with domain selection, purchase, and registration.',
  'Mascot Design – Creation of a distinctive and engaging brand mascot aligned with the brand’s personality, identity, and communication style.',
];

const DEFAULT_LETTER_BODY =
  'Hello…\n\nThank you for giving us the opportunity to present our proposal. We have carefully understood your brief and the direction you want to take.\n\nThe enclosed quotation covers the complete scope outlined on the following pages, with a clear focus on quality, consistency, and execution.\n\nOur approach is simple — understand the brand deeply, translate that understanding into a distinctive visual and verbal language, and deliver a system that stays consistent across every touchpoint.\n\nWe are excited about the possibility of building this together and would be glad to walk you through the scope in detail.\n\nThank you for your trust.';

const DEFAULT_SIGNOFF = 'Warm regards,\nRudhram Enterprises';

export const generateQuotationNumber = async (brand) => {
  const ventureCode = VENTURE_CODES[brand] || 'PG';
  const prefix = `QTN-${ventureCode}-`;
  const count = await quotationRepository.getQuotationCountByPrefix(prefix);
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${seq}`;
};

const getClientAndProject = async (clientId, projectId) => {
  const client = await Client.findById(clientId).select('brand companyName');
  if (!client) throw ApiError.badRequest('Client not found');

  let project = null;
  if (projectId) {
    project = await Project.findById(projectId).select('client title budget projectCode');
    if (!project) throw ApiError.badRequest('Project not found');
    if (String(project.client) !== String(clientId)) {
      throw ApiError.badRequest('Selected project does not belong to this client');
    }
  }

  return { client, project };
};

const normalizeDate = (value) => (value ? new Date(value) : null);

const assertStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return;
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw ApiError.badRequest(
      `Cannot transition quotation from '${currentStatus}' to '${newStatus}'`,
    );
  }
};

export const createQuotation = async (data, user) => {
  const { client, project } = await getClientAndProject(data.client, data.project);
  const quotationNumber = await generateQuotationNumber(client.brand);
  const scopeTitle = data.scopeTitle || project?.title || 'Brand Kit';

  const payload = {
    quotationNumber,
    client: data.client,
    project: data.project || null,
    issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
    validUntil: normalizeDate(data.validUntil),
    salutation: data.salutation || `Dear ${client.companyName},`,
    subject:
      data.subject ||
      `Submission of Quotation for Professional ${scopeTitle}.`,
    letterBody: data.letterBody || DEFAULT_LETTER_BODY,
    letterSignoff: data.letterSignoff || DEFAULT_SIGNOFF,
    scopeTitle,
    scopeIntro: data.scopeIntro || DEFAULT_SCOPE_INTRO,
    scopeOfWork:
      Array.isArray(data.scopeOfWork) && data.scopeOfWork.length > 0
        ? data.scopeOfWork
        : DEFAULT_SCOPE,
    deliverables: data.deliverables || 'As per the letterhead',
    note: data.note || '',
    budget: data.budget ?? project?.budget ?? 0,
    price: data.price ?? 0,
    taxRate: data.taxRate ?? 18,
    createdBy: user._id,
  };

  return quotationRepository.create(payload);
};

export const getQuotations = async (query) => {
  const { page, limit, sortBy, sortOrder, ...filters } = query;
  return quotationRepository.findAll(filters, { page, limit, sortBy, sortOrder });
};

export const getQuotationById = async (id) => {
  const quotation = await quotationRepository.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');
  return quotation;
};

export const getQuotationHtml = async (id) => {
  const quotation = await getQuotationById(id);
  return generateQuotationHtml(quotation);
};

export const getQuotationPdf = async (id) => {
  const quotation = await getQuotationById(id);
  return generateQuotationPdf(quotation);
};

export const updateQuotation = async (id, data) => {
  const quotation = await quotationRepository.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');
  if (quotation.status !== QUOTATION_STATUS.DRAFT) {
    throw ApiError.badRequest('Only draft quotations can be edited');
  }

  const clientId = data.client || quotation.client?._id || quotation.client;
  let projectId = data.project === undefined ? quotation.project?._id || quotation.project : data.project;
  if (projectId === '') projectId = null;

  if (data.client || data.project !== undefined) {
    await getClientAndProject(clientId, projectId);
  }

  const updateData = { ...data };
  if (updateData.project === '') updateData.project = null;
  if (data.issueDate) updateData.issueDate = new Date(data.issueDate);
  if (data.validUntil !== undefined) updateData.validUntil = normalizeDate(data.validUntil);
  if (updateData.scopeOfWork && !Array.isArray(updateData.scopeOfWork)) {
    updateData.scopeOfWork = [];
  }

  const nextPrice = data.price ?? quotation.price ?? 0;
  const nextTaxRate = data.taxRate ?? quotation.taxRate ?? 0;
  if (data.price !== undefined || data.taxRate !== undefined) {
    updateData.taxAmount = (Number(nextPrice) * Number(nextTaxRate)) / 100;
    updateData.total = Number(nextPrice) + updateData.taxAmount;
  }

  return quotationRepository.updateById(id, updateData);
};

export const updateQuotationStatus = async (id, status) => {
  const quotation = await quotationRepository.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  assertStatusTransition(quotation.status, status);

  const updateData = { status };
  if (status === QUOTATION_STATUS.SENT) {
    updateData.sentAt = new Date();
    sendQuotationEmail(quotation).catch((err) => {
      logger.error(`Quotation email failed: ${err.message}`, {
        quotation: quotation.quotationNumber,
      });
    });
  }
  if (status === QUOTATION_STATUS.ACCEPTED) updateData.acceptedAt = new Date();
  if (status === QUOTATION_STATUS.REJECTED) updateData.rejectedAt = new Date();
  if (status === QUOTATION_STATUS.EXPIRED) updateData.expiredAt = new Date();

  return quotationRepository.updateById(id, updateData);
};

const sendQuotationEmail = async (quotation) => {
  const clientEmail = quotation.client?.email;
  if (!clientEmail) {
    logger.warn(`Cannot send quotation ${quotation.quotationNumber}: client has no email`);
    return;
  }

  const pdfBuffer = await generateQuotationPdf(quotation);
  const client = quotation.client || {};

  const html = renderQuotationEmail({
    clientName: client.contactPerson || client.companyName || 'Client',
    quotationNumber: quotation.quotationNumber,
    total: quotation.total,
    validUntil: quotation.validUntil,
  });

  await sendEmail({
    to: clientEmail,
    subject: `Quotation ${quotation.quotationNumber} from Rudhram Enterprises`,
    html,
    attachments: [
      {
        filename: `quotation-${quotation.quotationNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

export const resendQuotationEmail = async (id) => {
  const quotation = await getQuotationById(id);
  if (!quotation.client?.email) {
    throw ApiError.badRequest('Client has no email address');
  }
  await sendQuotationEmail(quotation);
};

export const deleteQuotation = async (id) => {
  const quotation = await quotationRepository.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');
  if (quotation.status !== QUOTATION_STATUS.DRAFT) {
    throw ApiError.badRequest('Only draft quotations can be deleted');
  }
  return quotationRepository.deleteById(id);
};

export const getStats = async () => {
  const [statusCounts, financials, accepted, total, brandCounts] = await Promise.all([
    quotationRepository.countByStatus(),
    quotationRepository.getFinancialStats(),
    quotationRepository.getAcceptedStats(),
    quotationRepository.countAll(),
    quotationRepository.countByBrand(),
  ]);

  const statusBreakdown = { draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0 };
  statusCounts.forEach(({ _id, count }) => {
    statusBreakdown[_id] = count;
  });

  const byBrand = {};
  brandCounts.forEach(({ _id, count }) => {
    byBrand[_id || 'unassigned'] = count;
  });

  const decided = statusBreakdown.accepted + statusBreakdown.rejected;
  const conversionRate = decided > 0
    ? Math.round((statusBreakdown.accepted / decided) * 100)
    : 0;

  return {
    total,
    ...statusBreakdown,
    conversionRate,
    financials: {
      totalBudget: financials.totalBudget,
      totalQuoted: financials.totalQuoted,
      totalTax: financials.totalTax,
      totalValue: financials.totalValue,
      acceptedValue: accepted.acceptedValue,
    },
    byBrand,
  };
};
