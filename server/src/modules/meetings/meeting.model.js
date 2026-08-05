import mongoose from 'mongoose';
import { MEETING_STATUS } from '../../constants/index.js';

const actionItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Action item text is required'],
      trim: true,
      maxlength: 500,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'done'],
      default: 'pending',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    convertedToTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
  },
  { timestamps: true },
);

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    date: {
      type: Date,
      required: [true, 'Meeting date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm format'],
    },
    status: {
      type: String,
      enum: Object.values(MEETING_STATUS),
      default: MEETING_STATUS.SCHEDULED,
    },
    meetingLink: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    recordingLink: {
      type: String,
      trim: true,
      default: '',
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    actionItems: [actionItemSchema],
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    seriesType: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    occurrenceIndex: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderAt: {
      type: Date,
      default: null,
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

meetingSchema.index({ date: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ lead: 1 });
meetingSchema.index({ client: 1 });
meetingSchema.index({ date: 1, startTime: 1 });
meetingSchema.index({ seriesId: 1 });

const Meeting = mongoose.model('Meeting', meetingSchema);

export default Meeting;
