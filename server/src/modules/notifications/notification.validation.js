import { z } from 'zod';
import { NOTIFICATION_TYPES } from './notification.constants.js';

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  type: z.string().optional(),
  read: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().max(100).optional(),
});

export const createNotificationSchema = z.object({
  recipient: z.string(),
  type: z.enum(Object.values(NOTIFICATION_TYPES)),
  title: z.string().max(100).optional(),
  message: z.string().min(1).max(500),
  link: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  referenceId: z.string().optional(),
  referenceModel: z
    .enum([
      'Task', 'Project', 'Lead', 'Client',
      'Invoice', 'Payment', 'Meeting', 'User',
    ])
    .optional(),
  actionBy: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  channels: z
    .object({
      inApp: z.boolean().default(true),
      email: z.boolean().default(false),
    })
    .optional(),
});

export const notificationSettingsSchema = z.object({
  email: z.boolean().optional(),
  types: z.record(z.boolean()).optional(),
});
