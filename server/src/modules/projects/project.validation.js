import { z } from 'zod';
import { PROJECT_STATUS } from '../../constants/index.js';

const PROJECT_STATUS_LIST = Object.values(PROJECT_STATUS);

const taskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

const customFieldSchema = z.object({
  label: z.string().optional().or(z.literal('')),
  value: z.string().optional().or(z.literal('')),
});

const deliverableValidationSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, 'Deliverable title is required'),
  category: z.enum(['photo', 'video', 'others']).optional(),
  details: z.string().optional().or(z.literal('')),
  status: z.enum(['pending', 'in_progress', 'ready', 'delivered']).optional(),
  driveUrl: z.string().optional().or(z.literal('')),
  deliveredAt: z.string().optional().nullable(),
});

const inwardDataValidationSchema = z.object({
  photo: z.boolean().optional(),
  video: z.boolean().optional(),
  source: z.string().optional().or(z.literal('')),
  storageLocation: z.string().optional().or(z.literal('')),
  status: z.enum(['pending', 'received', 'partially_received', 'verified']).optional(),
  receivedDate: z.string().optional().nullable(),
  notes: z.string().optional().or(z.literal('')),
  customFields: z.array(customFieldSchema).optional(),
});

const crewMemberValidationSchema = z.object({
  _id: z.string().optional(),
  name: z.string().optional().or(z.literal('')),
  role: z.string().optional().or(z.literal('')),
  contact: z.string().optional().or(z.literal('')),
  isFreelancer: z.boolean().optional(),
  notes: z.string().optional().or(z.literal('')),
});

const teamDeploymentValidationSchema = z.object({
  counts: z
    .object({
      photographers: z.coerce.number().min(0).optional(),
      videographers: z.coerce.number().min(0).optional(),
      cinematographers: z.coerce.number().min(0).optional(),
      dronePilots: z.coerce.number().min(0).optional(),
      sameDayEditors: z.coerce.number().min(0).optional(),
      editors: z.coerce.number().min(0).optional(),
      others: z.coerce.number().min(0).optional(),
    })
    .optional(),
  crewMembers: z.array(crewMemberValidationSchema).optional(),
  customDetails: z.array(customFieldSchema).optional(),
});

export const createProjectSchema = z
  .object({
    title: z.string().min(2).max(200),
    client: z.string().min(1, 'Please select a client'),
    projectCode: z.string().optional().or(z.literal('')),
    location: z.string().optional().or(z.literal('')),
    duration: z.string().optional().or(z.literal('')),
    description: z.string().max(2000).optional().or(z.literal('')),
    status: z.enum(PROJECT_STATUS_LIST).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    budget: z.coerce.number().min(0).optional(),
    currency: z.string().optional(),
    startDate: z.string().optional(),
    deadline: z.string().optional(),
    teamMembers: z
      .array(z.object({ user: z.string(), role: z.string().optional() }))
      .optional(),
    milestones: z
      .array(
        z.object({
          title: z.string().min(2),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          status: z.enum(['pending', 'in_progress', 'completed']).optional(),
        }),
      )
      .optional(),
    tasks: z.array(taskSchema).optional(),
    tags: z.array(z.string()).optional(),
    inwardData: inwardDataValidationSchema.optional(),
    deliverables: z.array(deliverableValidationSchema).optional(),
    teamDeployment: teamDeploymentValidationSchema.optional(),
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
    client: z.string().min(1, 'Please select a client').optional(),
    description: z.string().max(2000).optional().or(z.literal('')),
    status: z.enum(PROJECT_STATUS_LIST).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    budget: z.coerce.number().min(0).optional(),
    currency: z.string().optional(),
    startDate: z.string().optional(),
    deadline: z.string().optional(),
    teamMembers: z
      .array(z.object({ user: z.string(), role: z.string().optional() }))
      .optional(),
    milestones: z
      .array(
        z.object({
          _id: z.string().optional(),
          title: z.string().min(2).optional(),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          status: z.enum(['pending', 'in_progress', 'completed']).optional(),
        }),
      )
      .optional(),
    tasks: z.array(taskSchema).optional(),
    tags: z.array(z.string()).optional(),
    projectCode: z.string().optional().or(z.literal('')),
    location: z.string().optional().or(z.literal('')),
    duration: z.string().optional().or(z.literal('')),
    inwardData: inwardDataValidationSchema.optional(),
    deliverables: z.array(deliverableValidationSchema).optional(),
    teamDeployment: teamDeploymentValidationSchema.optional(),
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
  brand: z.string().optional(),
  employeeFilter: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const addTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});
