import { z } from 'zod';
import { INVOICE_STATUS } from '../../constants/index.js';

const INVOICE_STATUS_LIST = Object.values(INVOICE_STATUS);

const invoiceItemSchema = z.object({
  description: z
    .string()
    .min(1, 'Item description is required')
    .max(500, 'Description must not exceed 500 characters'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
});

const billingAddressSchema = z.object({
  street: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  pincode: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
});

export const createInvoiceSchema = z
  .object({
    client: z.string().min(1, 'Client is required'),
    project: z.string().optional().nullable(),
    issueDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid issue date')
      .optional(),
    dueDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid due date'),
    items: z
      .array(invoiceItemSchema)
      .min(1, 'At least one invoice item is required'),
    taxRate: z.coerce.number().min(0).max(100).optional().default(0),
    discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
    billingAddress: billingAddressSchema.optional(),
    notes: z.string().max(2000).optional().or(z.literal('')),
    termsConditions: z.string().max(2000).optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.issueDate && data.dueDate) {
        return new Date(data.dueDate) >= new Date(data.issueDate);
      }
      return true;
    },
    { message: 'Due date must be on or after issue date', path: ['dueDate'] },
  );

export const updateInvoiceSchema = z.object({
  client: z.string().optional(),
  project: z.string().optional().nullable(),
  issueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid issue date')
    .optional(),
  dueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid due date')
    .optional(),
  items: z
    .array(invoiceItemSchema)
    .min(1, 'At least one invoice item is required')
    .optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  billingAddress: billingAddressSchema.optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
  termsConditions: z.string().max(2000).optional().or(z.literal('')),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(INVOICE_STATUS_LIST, { required_error: 'Status is required' }),
});

export const invoicesQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(INVOICE_STATUS_LIST).optional(),
  client: z.string().optional(),
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
