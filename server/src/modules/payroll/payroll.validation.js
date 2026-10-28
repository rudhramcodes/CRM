import { z } from 'zod';

export const generatePayrollSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const reopenPayrollSchema = z.object({
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(1000),
});

export const payrollRunsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
