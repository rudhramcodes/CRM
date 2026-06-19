import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  pincode: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
});

export const createClientSchema = z.object({
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(200, 'Company name must not exceed 200 characters'),
  contactPerson: z
    .string()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(100, 'Contact person name must not exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^[+]?[\d\s()-]{7,15}$/, 'Invalid phone number')
    .nullable()
    .optional()
    .or(z.literal('')),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number format')
    .nullable()
    .optional()
    .or(z.literal('')),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format')
    .nullable()
    .optional()
    .or(z.literal('')),
  address: addressSchema.optional(),
  status: z.enum(['active', 'inactive']).optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = z.object({
  companyName: z
    .string()
    .min(2)
    .max(200)
    .optional(),
  contactPerson: z
    .string()
    .min(2)
    .max(100)
    .optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^[+]?[\d\s()-]{7,15}$/)
    .nullable()
    .optional()
    .or(z.literal('')),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .nullable()
    .optional()
    .or(z.literal('')),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .nullable()
    .optional()
    .or(z.literal('')),
  address: addressSchema.optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const clientsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sort: z.string().optional(),
});
