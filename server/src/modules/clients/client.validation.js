import { z } from 'zod';

const cleanAddressString = (max) =>
  z
    .preprocess((v) => (v === null || v === undefined ? '' : String(v).trim()), z.string().max(max))
    .optional()
    .default('');

const addressObjectSchema = z.object({
  street: cleanAddressString(1000),
  city: cleanAddressString(200),
  state: cleanAddressString(200),
  pincode: cleanAddressString(100),
  country: z
    .preprocess((v) => (v === null || v === undefined || v === '' ? 'India' : String(v).trim()), z.string().max(200))
    .optional()
    .default('India'),
});

const addressSchema = z.preprocess((val) => {
  if (val === null || val === undefined) return {};
  if (typeof val === 'string') {
    return { street: val, city: '', state: '', pincode: '', country: 'India' };
  }
  return val;
}, addressObjectSchema.optional());

const BRANDS = ['panigrahna', 'aghori', 'house_of_joggi', 'damrru', 'tandavs', 'kapaalik', 'kalyannam', 'storage_media_solution'];

export const createClientSchema = z.object({
  brand: z.preprocess((v) => (v === '' || v === undefined ? undefined : v), z.enum(BRANDS, { required_error: 'Please select a brand/venture' })),
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
    .refine(
      (val) => !val || val.replace(/^\+?\d{1,3}\s*/, '').replace(/[^\d]/g, '').length >= 10,
      { message: 'Phone number must have at least 10 digits' }
    )
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
  brand: z.preprocess((v) => (v === '' || v === undefined ? undefined : v), z.enum(BRANDS, { required_error: 'Please select a brand/venture' })).optional(),
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
    .refine(
      (val) => !val || val.replace(/^\+?\d{1,3}\s*/, '').replace(/[^\d]/g, '').length >= 10,
      { message: 'Phone number must have at least 10 digits' }
    )
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
  brand: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(500).optional().default(10),
  sort: z.string().optional(),
});
