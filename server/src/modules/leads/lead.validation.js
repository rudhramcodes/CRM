import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { LEAD_STATUS, LEAD_BRANDS } from '../../constants/index.js';

const LEAD_STATUS_LIST = Object.values(LEAD_STATUS);

// Bulk status changes intentionally exclude 'won' (auto-converts to client)
// and 'lost' (requires a per-lead reason).
const BULK_STATUS_LIST = LEAD_STATUS_LIST.filter((s) => s !== 'won' && s !== 'lost');

const LEAD_SOURCES = [
  'google_ads',
  'referral',
  'instagram',
  'linkedin',
  'website',
  'email',
  'call',
  'other',
];

export const createLeadSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters'),
  email: z.string().min(1, 'Email address is required').email('Invalid email address'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine((val) => !!val && isValidPhoneNumber(val.trim(), 'IN'), {
      message: 'Please enter a valid phone number',
    }),
  brand: z.preprocess((v) => (v === '' || v === undefined ? undefined : v), z.enum(LEAD_BRANDS, { required_error: 'Please select a brand/venture' })).optional().nullable(),
  company: z
    .string()
    .max(200, 'Company must not exceed 200 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  source: z.enum(LEAD_SOURCES, { errorMap: () => ({ message: 'Please select a valid source' }) }).optional().default('other'),
  status: z
    .enum(LEAD_STATUS_LIST, { message: 'Invalid lead status' })
    .refine((val) => val !== 'lost', { message: 'New leads cannot be marked as lost directly. They must be contacted first.' })
    .optional()
    .default(LEAD_STATUS.NEW),
  assignedTo: z.string().optional().nullable(),
  lostReason: z.string().max(500).optional().nullable().or(z.literal('')),
  followUpDate: z.string().datetime({ offset: true }).optional().nullable().or(z.literal('')),
  notes: z
    .array(
      z.object({
        text: z.string().min(1).max(2000),
      }),
    )
    .optional()
    .default([]),
});

export const updateLeadSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters')
    .optional(),
  email: z.preprocess((v) => (v === '' || v === undefined ? undefined : v), z.string().email('Invalid email address')).optional().nullable(),
  phone: z
    .string()
    .refine((val) => !val || val === '' || isValidPhoneNumber(val.trim(), 'IN'), {
      message: 'Please enter a valid phone number',
    })
    .optional()
    .nullable()
    .or(z.literal('')),
  brand: z.enum(LEAD_BRANDS).optional().nullable(),
  company: z
    .string()
    .max(200, 'Company must not exceed 200 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  source: z.enum(LEAD_SOURCES, { message: 'Invalid lead source' }).optional(),
  status: z.enum(LEAD_STATUS_LIST, { message: 'Invalid lead status' }).optional(),
  assignedTo: z.string().optional().nullable(),
  lostReason: z.string().max(500).optional().nullable().or(z.literal('')),
  followUpDate: z.string().datetime({ offset: true }).optional().nullable().or(z.literal('')),
});

export const addNoteSchema = z.object({
  text: z
    .string()
    .min(1, 'Note text is required')
    .max(2000, 'Note must not exceed 2000 characters'),
});

export const leadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  brand: z.enum(LEAD_BRANDS).optional(),
  status: z.enum(LEAD_STATUS_LIST).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  assignedTo: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const bulkIdsSchema = z
  .array(z.string().min(1))
  .min(1, 'Select at least one lead')
  .max(500, 'Cannot select more than 500 leads');

export const bulkDeleteSchema = z.object({
  ids: bulkIdsSchema,
});

export const bulkUpdateSchema = z.object({
  ids: bulkIdsSchema,
  data: z.object({
    status: z.enum(BULK_STATUS_LIST, { message: 'Invalid lead status' }),
  }),
});
