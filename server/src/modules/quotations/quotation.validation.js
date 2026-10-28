import { z } from 'zod';
import { QUOTATION_STATUS } from '../../constants/index.js';

const QUOTATION_STATUS_LIST = Object.values(QUOTATION_STATUS);

const optionalText = (max) =>
  z.preprocess(
    (v) => (v === null || v === undefined ? v : String(v).trim()),
    z.string().max(max),
  ).optional();

const scopeOfWorkSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string().max(500)).optional());

const quotationFields = {
  client: z.string().min(1, 'Client is required'),
  project: z.string().optional().nullable().or(z.literal('')),
  issueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid issue date')
    .optional(),
  validUntil: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid valid until date')
    .optional()
    .nullable()
    .or(z.literal('')),
  salutation: optionalText(200),
  subject: optionalText(300),
  letterBody: optionalText(10000),
  letterSignoff: optionalText(2000),
  scopeTitle: optionalText(300),
  scopeIntro: optionalText(2000),
  scopeOfWork: scopeOfWorkSchema,
  deliverables: optionalText(2000),
  note: optionalText(2000),
  budget: z.coerce.number().min(0, 'Budget cannot be negative').optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative').optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
};

export const createQuotationSchema = z
  .object(quotationFields)
  .refine(
    (data) => {
      if (data.issueDate && data.validUntil) {
        return new Date(data.validUntil) >= new Date(data.issueDate);
      }
      return true;
    },
    { message: 'Valid until must be on or after issue date', path: ['validUntil'] },
  );

export const updateQuotationSchema = z
  .object({
    ...quotationFields,
    client: z.string().min(1).optional(),
    budget: z.coerce.number().min(0).optional(),
    price: z.coerce.number().min(0).optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.issueDate && data.validUntil) {
        return new Date(data.validUntil) >= new Date(data.issueDate);
      }
      return true;
    },
    { message: 'Valid until must be on or after issue date', path: ['validUntil'] },
  );

export const updateQuotationStatusSchema = z.object({
  status: z.enum(QUOTATION_STATUS_LIST, { required_error: 'Status is required' }),
});

export const quotationsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(QUOTATION_STATUS_LIST).optional(),
  client: z.string().optional(),
  brand: z.string().optional(),
  dateFrom: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid dateFrom')
    .optional(),
  dateTo: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid dateTo')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
