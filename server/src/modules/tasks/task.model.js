import mongoose from 'mongoose';
import { TASK_STATUS, TASK_PRIORITY } from '../../constants/index.js';

const commentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

const timeEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0.25 },
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true },
);

const checklistSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    checked: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true },
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.TODO,
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITY),
      default: TASK_PRIORITY.MEDIUM,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    // ponytail: milestone lives embedded in Project.milestones; store its subdoc _id only
    milestone: { type: mongoose.Schema.Types.ObjectId },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: Date,
    startDate: Date,
    completedAt: Date,
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    totalLoggedHours: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    tags: [String],

    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    checklists: [checklistSchema],
    checklistProgress: { type: Number, default: 0 },

    timeEntries: [timeEntrySchema],
    activeTimers: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      startedAt: { type: Date, required: true },
    }],

    recurring: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'] },
      interval: { type: Number, default: 1 },
      daysOfWeek: [Number],
      dayOfMonth: Number,
      cronExpression: String,
      endDate: Date,
      maxOccurrences: Number,
      nextOccurrence: Date,
      templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    },

    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      fileSize: Number,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],

    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },

    comments: [commentSchema],
    activities: [activitySchema],

    customFields: [{
      fieldId: String,
      value: mongoose.Schema.Types.Mixed,
    }],
  },
  { timestamps: true },
);

taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ status: 1, order: 1 });
taskSchema.index({ parent: 1 });
taskSchema.index({ dependsOn: 1 });
taskSchema.index({ watchers: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ sprint: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
