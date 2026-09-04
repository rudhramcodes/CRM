import { z } from 'zod';

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const holidayQuerySchema = paginationQuerySchema.extend({
  year: z.coerce.number().int().optional(),
});

// --- Attendance ---

export const clockInSchema = z.object({
  location: z
    .object({
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    })
    .optional(),
  isWFH: z.boolean().optional(),
  wfhReason: z.string().max(500).optional(),
});

export const clockOutSchema = z.object({
  location: z
    .object({
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    })
    .optional(),
});

export const manualEntrySchema = z.object({
  recordId: z.string().optional(),
  employee: z.string().min(1, 'Employee is required'),
  date: z.string().min(1, 'Date is required'),
  clockInTime: z.string().optional(),
  clockOutTime: z.string().optional(),
  status: z.enum(['present', 'absent', 'half_day', 'wfh', 'leave', 'holiday', 'weekend']).optional(),
  notes: z.string().max(500).optional(),
  isWFH: z.boolean().optional(),
});

export const attendanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  employee: z.string().optional(),
  status: z.enum(['present', 'absent', 'half_day', 'wfh', 'leave', 'holiday', 'weekend', 'late']).optional(),
  isLate: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional().default('-date'),
});

export const attendanceUpdateSchema = z.object({
  status: z.enum(['present', 'absent', 'half_day', 'wfh', 'leave', 'holiday', 'weekend']).optional(),
  workHours: z.number().min(0).optional(),
  isLate: z.boolean().optional(),
  lateMinutes: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  clockInTime: z.string().optional(),
  clockOutTime: z.string().optional(),
  isWFH: z.boolean().optional(),
  date: z.string().optional(),
});

export const regularizeSchema = z.object({
  attendanceId: z.string().min(1, 'Attendance ID is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

export const regularizeActionSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  comment: z.string().max(500).optional(),
});

// --- Shift ---

export const createShiftSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50),
    startTime: z.string().regex(HHMM_REGEX, 'Start time must be HH:mm'),
    endTime: z.string().regex(HHMM_REGEX, 'End time must be HH:mm'),
    gracePeriod: z.number().int().min(0).max(120).optional().default(15),
    isDefault: z.boolean().optional(),
  })
  .refine((data) => data.startTime !== data.endTime, {
    message: 'Start and end time cannot be the same',
  });

export const updateShiftSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  startTime: z.string().regex(HHMM_REGEX).optional(),
  endTime: z.string().regex(HHMM_REGEX).optional(),
  gracePeriod: z.number().int().min(0).max(120).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// --- Leave ---

export const createLeaveSchema = z
  .object({
    leaveType: z.enum(['sick', 'casual', 'earned', 'unpaid', 'maternity', 'paternity', 'comp_off', 'other']),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
    documents: z.array(z.string().url()).max(5).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    { message: 'End date must be on or after start date', path: ['endDate'] }
  );

export const leaveQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  employee: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  leaveType: z.enum(['sick', 'casual', 'earned', 'unpaid', 'maternity', 'paternity', 'comp_off', 'other']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const leaveActionSchema = z.object({
  comment: z.string().max(500).optional(),
});

// --- Holiday ---

export const createHolidaySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  date: z.string().min(1, 'Date is required'),
  description: z.string().max(500).optional(),
  type: z.enum(['national', 'company', 'optional']).optional().default('company'),
  isRecurring: z.boolean().optional(),
});

export const updateHolidaySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  date: z.string().optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['national', 'company', 'optional']).optional(),
  isRecurring: z.boolean().optional(),
});

// --- Reports ---

export const reportQuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  employee: z.string().optional(),
  department: z.string().optional(),
});
