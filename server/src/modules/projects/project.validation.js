import { z } from 'zod';
import { PROJECT_STATUS } from '../../constants/index.js';

const PROJECT_STATUS_LIST = Object.values(PROJECT_STATUS);

export const createProjectSchema = z
  .object({
    title: z
      .string()
      .min(2, 'Title must be at least 2 characters')
      .max(200, 'Title must not exceed 200 characters'),
    description: z.string().max(2000).optional().or(z.literal('')),
    status: z.enum(PROJECT_STATUS_LIST).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    budget: z.coerce.number().min(0, 'Budget must be a positive number').optional(),
    currency: z.string().optional(),
    startDate: z.string().optional(),
    deadline: z.string().optional(),
    teamMembers: z
      .array(
        z.object({
          user: z.string(),
          role: z.string().optional(),
        }),
      )
      .optional(),
    milestones: z
      .array(
        z.object({
          title: z.string().min(2, 'Milestone title must be at least 2 characters'),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          status: z.enum(['pending', 'in_progress', 'completed']).optional(),
        }),
      )
      .optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.deadline) {
        return new Date(data.deadline) >= new Date(data.startDate);
      }
      return true;
    },
    { message: 'Deadline must be after start date', path: ['deadline'] },
  );

export const updateProjectSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(2000).optional().or(z.literal('')),
    status: z.enum(PROJECT_STATUS_LIST).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    budget: z.coerce.number().min(0).optional(),
    currency: z.string().optional(),
    startDate: z.string().optional(),
    deadline: z.string().optional(),
    teamMembers: z
      .array(
        z.object({
          user: z.string(),
          role: z.string().optional(),
        }),
      )
      .optional(),
    milestones: z
      .array(
        z.object({
          title: z.string().min(2).optional(),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          status: z.enum(['pending', 'in_progress', 'completed']).optional(),
        }),
      )
      .optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.deadline) {
        return new Date(data.deadline) >= new Date(data.startDate);
      }
      return true;
    },
    { message: 'Deadline must be after start date', path: ['deadline'] },
  );

export const projectsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(PROJECT_STATUS_LIST).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
