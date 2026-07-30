import { z } from 'zod';
import { NOTIFICATION_TYPES } from '../notifications/notification.constants.js';
import { ROLES_LIST } from '../../constants/index.js';

const channelSchema = z.object({
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
});

const notifyTypeKeys = Object.values(NOTIFICATION_TYPES);

export const updateNotifPrefsSchema = z.object({
  notify: z.record(z.string(), channelSchema).refine(
    (val) => Object.keys(val).every((k) => notifyTypeKeys.includes(k)),
    { message: `Invalid notification type. Valid: ${notifyTypeKeys.join(', ')}` },
  ),
});

export const updateOrgSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  logo: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
});

export const updateRolesSchema = z.object({
  role: z.enum(ROLES_LIST),
  permissions: z.array(z.string()),
});

export const updateSecuritySchema = z.object({
  passwordMinLength: z.number().int().min(4).max(128).optional(),
  passwordRequireUpper: z.boolean().optional(),
  passwordRequireLower: z.boolean().optional(),
  passwordRequireNumber: z.boolean().optional(),
  passwordRequireSpecial: z.boolean().optional(),
  loginMaxAttempts: z.number().int().min(1).max(100).optional(),
  loginLockoutMinutes: z.number().int().min(1).max(1440).optional(),
});

export const updateIntegrationSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpSenderName: z.string().optional(),
  smtpSenderEmail: z.string().optional(),
});
