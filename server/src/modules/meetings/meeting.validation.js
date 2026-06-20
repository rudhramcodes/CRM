import { z } from 'zod';
import { MEETING_STATUS } from '../../constants/index.js';

const MEETING_STATUS_LIST = Object.values(MEETING_STATUS);
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createMeetingSchema = z
  .object({
    title: z
      .string()
      .min(2, 'Title must be at least 2 characters')
      .max(200, 'Title must not exceed 200 characters'),
    description: z.string().max(1000).optional().or(z.literal('')),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
    startTime: z.string().regex(TIME_REGEX, 'Start time must be in HH:mm format'),
    endTime: z.string().regex(TIME_REGEX, 'End time must be in HH:mm format'),
    meetingLink: z.string().url('Invalid meeting link URL').optional().or(z.literal('')),
    location: z.string().max(200).optional().or(z.literal('')),
    notes: z.string().max(2000).optional().or(z.literal('')),
    recordingLink: z.string().url('Invalid recording URL').optional().or(z.literal('')),
    lead: z.string().optional().nullable(),
    client: z.string().optional().nullable(),
    assignedTo: z.string().optional().nullable(),
    status: z.enum(MEETING_STATUS_LIST).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['endTime'] },
  );

export const updateMeetingSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(1000).optional().or(z.literal('')),
    date: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid date')
      .optional(),
    startTime: z.string().regex(TIME_REGEX, 'Start time must be in HH:mm format').optional(),
    endTime: z.string().regex(TIME_REGEX, 'End time must be in HH:mm format').optional(),
    meetingLink: z.string().url('Invalid meeting link URL').optional().or(z.literal('')),
    location: z.string().max(200).optional().or(z.literal('')),
    notes: z.string().max(2000).optional().or(z.literal('')),
    recordingLink: z.string().url('Invalid recording URL').optional().or(z.literal('')),
    lead: z.string().optional().nullable(),
    client: z.string().optional().nullable(),
    assignedTo: z.string().optional().nullable(),
    status: z.enum(MEETING_STATUS_LIST).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['endTime'] },
  );

export const meetingsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(MEETING_STATUS_LIST).optional(),
  lead: z.string().optional(),
  client: z.string().optional(),
  assignedTo: z.string().optional(),
  dateFrom: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid dateFrom')
    .optional(),
  dateTo: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid dateTo')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z.string().optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
