import mongoose from 'mongoose';
import { MEETING_STATUS } from '../../constants/index.js';

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
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
      maxlength: 2000,
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
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
meetingSchema.index({ assignedTo: 1 });
meetingSchema.index({ date: 1, startTime: 1 });

const Meeting = mongoose.model('Meeting', meetingSchema);

export default Meeting;
