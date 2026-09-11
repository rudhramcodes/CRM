import mongoose from 'mongoose';
import { PROJECT_STATUS } from '../../constants/index.js';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: Date,
    completedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true, timestamps: true },
);

const activitySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    field: String,
    oldValue: String,
    newValue: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true },
);

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    completedAt: Date,
  },
  { _id: true },
);

const messageSchema = new mongoose.Schema(
  {
    text: { type: String, default: '' },
    images: [{
      url: String,
      fileId: String,
      name: String,
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: mongoose.Schema.Types.ObjectId,
    taskTitle: String,
  },
  { _id: true, timestamps: true },
);

const teamMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false },
);

const customFieldSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    value: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const deliverableSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deliverable title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['photo', 'video', 'others'],
      default: 'others',
    },
    details: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'ready', 'delivered'],
      default: 'pending',
    },
    driveUrl: {
      type: String,
      trim: true,
      default: '',
    },
    deliveredAt: Date,
  },
  { _id: true, timestamps: true },
);

const inwardDataSchema = new mongoose.Schema(
  {
    photo: { type: Boolean, default: false },
    video: { type: Boolean, default: false },
    source: { type: String, trim: true, default: '' },
    storageLocation: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'received', 'partially_received', 'verified'],
      default: 'pending',
    },
    receivedDate: Date,
    notes: { type: String, trim: true, default: '' },
    customFields: [customFieldSchema],
  },
  { _id: false },
);

const crewMemberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
    contact: { type: String, trim: true, default: '' },
    isFreelancer: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true },
);

const teamDeploymentSchema = new mongoose.Schema(
  {
    counts: {
      photographers: { type: Number, default: 0, min: 0 },
      videographers: { type: Number, default: 0, min: 0 },
      cinematographers: { type: Number, default: 0, min: 0 },
      dronePilots: { type: Number, default: 0, min: 0 },
      sameDayEditors: { type: Number, default: 0, min: 0 },
      editors: { type: Number, default: 0, min: 0 },
      others: { type: Number, default: 0, min: 0 },
    },
    crewMembers: [crewMemberSchema],
    customDetails: [customFieldSchema],
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.PLANNING,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    budget: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    startDate: Date,
    deadline: Date,
    completedAt: Date,
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
    },
    teamMembers: [teamMemberSchema],
    milestones: [milestoneSchema],
    tasks: [taskSchema],
    activities: [activitySchema],
    messages: [messageSchema],
    tags: [String],
    projectCode: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    duration: {
      type: String,
      trim: true,
      default: '',
    },
    inwardData: {
      type: inwardDataSchema,
      default: () => ({}),
    },
    deliverables: [deliverableSchema],
    teamDeployment: {
      type: teamDeploymentSchema,
      default: () => ({ counts: {} }),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

projectSchema.index({ status: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ deadline: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ createdAt: -1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;
