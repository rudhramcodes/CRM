import { z } from 'zod';
import { TASK_STATUS, TASK_PRIORITY } from '../../constants/index.js';

export const createTaskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().optional(),
  status: z.nativeEnum(TASK_STATUS).optional(),
  priority: z.nativeEnum(TASK_PRIORITY).optional(),
  assignedTo: z.string().optional().transform(v => v || undefined),
  project: z.string().optional().transform(v => v || undefined),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TASK_STATUS).optional(),
  priority: z.nativeEnum(TASK_PRIORITY).optional(),
  assignedTo: z.string().nullable().optional().transform(v => v === '' ? null : v),
  project: z.string().nullable().optional().transform(v => v === '' ? null : v),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
});

export const tasksQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  project: z.string().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment cannot be empty'),
});

export const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one task ID required'),
  status: z.nativeEnum(TASK_STATUS).optional(),
  priority: z.nativeEnum(TASK_PRIORITY).optional(),
  assignedTo: z.string().optional().transform(v => v || undefined),
});

export const reorderSchema = z.object({
  status: z.string(),
  orderedIds: z.array(z.string()).min(1),
});
