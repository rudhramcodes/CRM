import { z } from 'zod';
import { PAYMENT_STATUS, PAYMENT_METHODS, PAYMENT_TYPES } from '../../constants/index.js';

const PAYMENT_STATUS_LIST = Object.values(PAYMENT_STATUS);
const PAYMENT_METHODS_LIST = Object.values(PAYMENT_METHODS);
const PAYMENT_TYPES_LIST = Object.values(PAYMENT_TYPES);

export const createPaymentSchema = z.object({
  invoice: z.string({ required_error: 'Invoice is required' }),
  amount: z.coerce
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than 0'),
  paymentMethod: z.enum(PAYMENT_METHODS_LIST, { required_error: 'Payment method is required' }),
  paymentType: z.enum(PAYMENT_TYPES_LIST).optional(),
  referenceNo: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  paymentDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid payment date')
    .optional(),
  status: z.enum(PAYMENT_STATUS_LIST).optional(),
});

export const updatePaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0').optional(),
  paymentMethod: z.enum(PAYMENT_METHODS_LIST).optional(),
  paymentType: z.enum(PAYMENT_TYPES_LIST).optional(),
  referenceNo: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  paymentDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid payment date')
    .optional(),
  status: z.enum(PAYMENT_STATUS_LIST).optional(),
});

export const paymentsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(PAYMENT_STATUS_LIST).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS_LIST).optional(),
  paymentType: z.enum(PAYMENT_TYPES_LIST).optional(),
  invoice: z.string().optional(),
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
  sortBy: z.string().optional().default('paymentDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
