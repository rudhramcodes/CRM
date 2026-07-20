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

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
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
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: Date,
    completedAt: Date,
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    tags: [String],
    comments: [commentSchema],
    activities: [activitySchema],
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

const Task = mongoose.model('Task', taskSchema);

export default Task;
