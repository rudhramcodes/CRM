import { z } from 'zod';
import { quotationFields } from './quotation.validation.js';

const token = z.number().int().nonnegative();
export const tokensSchema = z.object({ baseVersion: token, editVersion: token }).strict();
export const startWorkingSchema = z.object({ sourceVersion: token.positive(), baseVersion: token }).strict();
export const editWorkingSchema = tokensSchema.extend({
  changes: z.object(quotationFields).partial().strict().refine((data) => Object.keys(data).length > 0, 'Changes are required'),
});
export const saveRevisionSchema = tokensSchema.extend({ revisionNote: z.string().trim().max(2000).optional().default('') });
export const archiveSchema = z.object({ baseVersion: token, archived: z.boolean() }).strict();
export const revisionStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
  expectedStatus: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
}).strict();
