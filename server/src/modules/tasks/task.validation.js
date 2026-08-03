import { z } from 'zod';
import { TASK_STATUS, TASK_PRIORITY } from '../../constants/index.js';

const statusValues = Object.values(TASK_STATUS);
const priorityValues = Object.values(TASK_PRIORITY);

export const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional().default(''),
  status: z.enum(statusValues).optional().default(TASK_STATUS.TODO),
  priority: z.enum(priorityValues).optional().default(TASK_PRIORITY.MEDIUM),
  assignedTo: z.string().optional(),
  project: z.string().min(1, 'Project is required'),
  milestone: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  estimatedHours: z.number().min(0).optional().default(0),
  tags: z.array(z.string()).optional().default([]),
  parent: z.string().optional(),
  dependsOn: z.array(z.string()).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(statusValues).optional(),
  priority: z.enum(priorityValues).optional(),
  assignedTo: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  milestone: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  parent: z.string().nullable().optional(),
  dependsOn: z.array(z.string()).optional(),
  order: z.number().optional(),
});

export const tasksQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  project: z.string().optional(),
  tags: z.string().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  parent: z.string().optional(),
  sort: z.string().optional().default('-createdAt'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const addDependencySchema = z.object({
  dependsOn: z.array(z.string()).min(1, 'At least one dependency required'),
});

export const addTimeEntrySchema = z.object({
  date: z.string().datetime(),
  hours: z.number().min(0.25).max(24),
  description: z.string().optional().default(''),
});

export const addChecklistSchema = z.object({
  text: z.string().min(1).max(500),
});

export const updateChecklistSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  checked: z.boolean().optional(),
});

export const reorderChecklistSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export const reorderTasksSchema = z.object({
  status: z.enum(statusValues),
  orderedIds: z.array(z.string()).min(1),
});

export const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1),
  data: z.object({
    status: z.enum(statusValues).optional(),
    priority: z.enum(priorityValues).optional(),
    assignedTo: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const addCommentSchema = z.object({
  text: z.string().min(1).max(5000),
});
