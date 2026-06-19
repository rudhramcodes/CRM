import { z } from 'zod';

export const emailSchema = z
  .string()
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must not exceed 128 characters');

export const phoneSchema = z
  .string()
  .regex(/^[+]?[\d\s()-]{10,15}$/, 'Please enter a valid phone number')
  .optional();

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters');
