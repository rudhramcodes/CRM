import { z } from 'zod';
import { ROLES_LIST } from '../../constants/index.js';

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(ROLES_LIST).optional(),
  phone: z.string().optional(),
  designation: z.string().max(100).nullable().optional(),
  dateOfJoining: z.string().nullable().optional(),
  dateOfLeaving: z.string().nullable().optional(),
  monthlyGrossSalary: z.coerce.number().min(0).optional(),
  salaryEffectiveFrom: z.string().nullable().optional(),
  bankName: z.string().max(100).nullable().optional(),
  bankAccountNumber: z.string().max(40).nullable().optional(),
  ifscCode: z.string().max(20).nullable().optional(),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(ROLES_LIST).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  designation: z.string().max(100).nullable().optional(),
  dateOfJoining: z.string().nullable().optional(),
  dateOfLeaving: z.string().nullable().optional(),
  monthlyGrossSalary: z.coerce.number().min(0).optional(),
  salaryEffectiveFrom: z.string().nullable().optional(),
  bankName: z.string().max(100).nullable().optional(),
  bankAccountNumber: z.string().max(40).nullable().optional(),
  ifscCode: z.string().max(20).nullable().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES_LIST, { message: 'Invalid role' }),
});

export const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(500).optional().default(10),
  search: z.string().optional(),
  role: z.enum(ROLES_LIST).optional(),
  isActive: z.coerce.boolean().optional(),
  sort: z.string().optional().default('-createdAt'),
});
