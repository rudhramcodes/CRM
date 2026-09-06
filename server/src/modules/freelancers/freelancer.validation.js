import { z } from 'zod';
import { RATE_BASES, RATE_CURRENCIES, VENTURE_SERVICE_CATALOG } from './freelancer.catalog.js';

const ventureValues = ['panigrahna', 'aghori', 'house_of_joggi', 'damrru', 'tandavs', 'kapaalik', 'kalyannam', 'storage_media_solution'];
const optionalString = z.string().trim().optional().default('');
const stringArray = z.array(z.string().trim().min(1)).optional().default([]);
const rateCard = z.object({
  rateBasis: z.enum(RATE_BASES),
  amount: z.coerce.number().min(0),
  currency: z.enum(RATE_CURRENCIES).optional().default('INR'),
  effectiveFrom: z.string().trim().min(1),
  effectiveUntil: z.string().trim().optional().nullable().default(null),
  notes: optionalString,
}).superRefine((rate, ctx) => {
  if (rate.effectiveUntil && new Date(rate.effectiveUntil) < new Date(rate.effectiveFrom)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveUntil'], message: 'Effective until must be on or after effective from' });
  }
});

const ventureProfile = z.object({
  venture: z.enum(ventureValues),
  internalTitle: optionalString,
  serviceCategories: stringArray,
  skillLevel: z.enum(['junior', 'mid', 'senior', 'specialist', 'lead']).optional().default('mid'),
  experienceSummary: z.string().trim().max(1000).optional().default(''),
  active: z.boolean().optional().default(true),
  notes: z.string().trim().max(1000).optional().default(''),
  rateCards: z.array(rateCard).optional().default([]),
});

const address = z.object({
  street: optionalString,
  city: optionalString,
  state: optionalString,
  pincode: optionalString,
  country: optionalString,
}).optional().default({});

export const createFreelancerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  displayName: optionalString,
  profilePhoto: optionalString,
  phone: z.string().trim().min(5).max(30),
  alternatePhone: optionalString,
  email: z.string().trim().email().optional().or(z.literal('')).default(''),
  whatsappNumber: optionalString,
  preferredContactChannel: z.enum(['phone', 'whatsapp', 'email']).optional().default('phone'),
  city: optionalString,
  serviceAreas: stringArray,
  address,
  freelancerType: z.enum(['individual', 'team', 'agency', 'vendor']).optional().default('individual'),
  experienceYears: z.coerce.number().min(0).max(80).optional().default(0),
  bio: z.string().trim().max(2000).optional().default(''),
  languages: stringArray,
  portfolioLinks: stringArray,
  internalTags: stringArray,
  emergencyContact: z.object({ name: optionalString, relationship: optionalString, phone: optionalString }).optional().default({}),
  ventureProfiles: z.array(ventureProfile).min(1, 'At least one venture profile is required'),
});

export const updateFreelancerSchema = createFreelancerSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const freelancersQuerySchema = z.preprocess((value) => Object.fromEntries(Object.entries(value || {}).map(([key, item]) => [key, item === '' ? undefined : item])), z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sort: z.string().optional(),
  search: z.string().trim().optional(),
  venture: z.enum(ventureValues).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  includeArchived: z.enum(['true', 'false']).optional().default('false'),
}));
