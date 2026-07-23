import { z } from 'zod';

export const reportsQuerySchema = z.object({
  type: z.enum(['revenue', 'pipeline', 'clients', 'invoices', 'productivity'], {
    required_error: 'Report type is required',
  }),
  from: z.string().optional(),
  to: z.string().optional(),
});
