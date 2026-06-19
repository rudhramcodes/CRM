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
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters'),
  role: z.enum(ROLES_LIST).optional(),
  phone: z.string().optional(),
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
});

export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES_LIST, { message: 'Invalid role' }),
});

export const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  role: z.enum(ROLES_LIST).optional(),
  isActive: z.coerce.boolean().optional(),
  sort: z.string().optional().default('-createdAt'),
});
