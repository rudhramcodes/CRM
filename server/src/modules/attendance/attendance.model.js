import mongoose from 'mongoose';

// --- Sub-schemas ---

const breakSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, default: null },
    duration: { type: Number, default: 0 }, // minutes
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    clockIn: {
      time: { type: Date, default: null },
      ip: { type: String, default: null },
      location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
    },
    clockOut: {
      time: { type: Date, default: null },
      location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
    },
    breaks: { type: [breakSchema], default: [] },
    workMinutes: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
  },
  { _id: false }
);

const regularizationSchema = new mongoose.Schema(
  {
    request: {
      reason: { type: String, default: null },
      clockInTime: { type: String, default: null },
      clockOutTime: { type: String, default: null },
      breakMinutes: { type: Number, default: 0, min: 0 },
      requestedAt: { type: Date, default: null },
    },
    approval: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: null,
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      approvedAt: { type: Date, default: null },
      comment: { type: String, default: null },
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'clock_in',
        'clock_out',
        'break_start',
        'break_end',
        'status_change',
        'regularization_request',
        'regularization_approved',
        'regularization_rejected',
        'auto_clock_out',
      ],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

// --- Main Attendance Schema ---

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: [true, 'Shift is required'],
    },
    // Legacy fields - kept for backward compatibility
    clockIn: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    clockOut: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    breaks: { type: [breakSchema], default: [] },
    // New sessions-based approach
    sessions: { type: [sessionSchema], default: [] },
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'wfh', 'leave', 'holiday', 'weekend'],
      default: 'absent',
    },
    workHours: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    totalBreakMinutes: { type: Number, default: 0 },
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    isWFH: { type: Boolean, default: false },
    wfhReason: { type: String, default: null },
    notes: { type: String, default: null },
    leave: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      default: null,
    },
    regularization: { type: regularizationSchema, default: () => ({}) },
    events: { type: [eventSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_doc, ret) { delete ret.__v; return ret; } },
  }
);

// Virtual: active session (session with clockIn but no clockOut)
attendanceSchema.virtual('activeSession').get(function () {
  if (!this.sessions || this.sessions.length === 0) return null;
  const last = this.sessions[this.sessions.length - 1];
  if (last.clockIn?.time && !last.clockOut?.time) return last;
  return null;
});

// Virtual: is currently clocked in
attendanceSchema.virtual('isClockedIn').get(function () {
  return this.activeSession !== null;
});

// Virtual: is on break
attendanceSchema.virtual('isOnBreak').get(function () {
  const session = this.activeSession;
  if (!session || !session.breaks || session.breaks.length === 0) return false;
  const lastBreak = session.breaks[session.breaks.length - 1];
  return lastBreak.start && !lastBreak.end;
});

// Indexes
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 }); // for daily overview queries across all employees
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ shift: 1 });
attendanceSchema.index({ createdAt: -1 });
attendanceSchema.index({ 'sessions.clockIn.time': 1 });
attendanceSchema.index({ 'sessions.clockOut.time': 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// --- Shift Schema ---

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Shift name is required'],
      trim: true,
      maxlength: 50,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format'],
    },
    duration: {
      type: Number,
      required: true,
    },
    gracePeriod: {
      type: Number,
      default: 15,
      min: 0,
      max: 120,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
  }
);

// Auto-calculate duration before save
shiftSchema.pre('validate', function (next) {
  if (this.startTime && this.endTime) {
    const [sh, sm] = this.startTime.split(':').map(Number);
    const [eh, em] = this.endTime.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60; // overnight shift
    this.duration = +(mins / 60).toFixed(2);
  }
  next();
});

const Shift = mongoose.model('Shift', shiftSchema);

// --- Leave Request Schema ---

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required'],
    },
    leaveType: {
      type: String,
      enum: ['sick', 'casual', 'earned', 'unpaid', 'maternity', 'paternity', 'comp_off', 'other'],
      required: [true, 'Leave type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      minlength: [10, 'Reason must be at least 10 characters'],
      maxlength: [1000, 'Reason must not exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: { type: Date, default: null },
    comment: { type: String, default: null },
    documents: [{ type: String }], // file URLs
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
  }
);

leaveRequestSchema.index({ employee: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

// --- Holiday Schema ---

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
      maxlength: 100,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      unique: true,
    },
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ['national', 'company', 'optional'],
      default: 'company',
    },
    isRecurring: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
  }
);

// date index is handled by unique: true above

const Holiday = mongoose.model('Holiday', holidaySchema);

// --- Leave Balance Schema ---

const balanceSubSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { _id: false }
);

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    sick: { type: balanceSubSchema, default: () => ({}) },
    casual: { type: balanceSubSchema, default: () => ({}) },
    earned: { type: balanceSubSchema, default: () => ({}) },
    unpaid: { type: balanceSubSchema, default: () => ({}) },
    comp_off: { type: balanceSubSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
  }
);

leaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

export { Attendance, Shift, LeaveRequest, Holiday, LeaveBalance };
