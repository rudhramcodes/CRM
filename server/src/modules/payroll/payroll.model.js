import mongoose from 'mongoose';

const payrollTotalsSchema = new mongoose.Schema(
  {
    employees: { type: Number, default: 0, min: 0 },
    ready: { type: Number, default: 0, min: 0 },
    issues: { type: Number, default: 0, min: 0 },
    gross: { type: Number, default: 0, min: 0 },
    preJoiningDeduction: { type: Number, default: 0, min: 0 },
    leavingDeduction: { type: Number, default: 0, min: 0 },
    lopDeduction: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    net: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const payrollRunSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 2000,
      max: 2100,
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: 1,
      max: 12,
    },
    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
      index: true,
    },
    revision: {
      type: Number,
      default: 1,
      min: 1,
    },
    payrollDays: {
      type: Number,
      default: 30,
      min: 1,
    },
    totals: {
      type: payrollTotalsSchema,
      default: () => ({}),
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    reopenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
    reopenReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
  },
);

payrollRunSchema.index({ year: 1, month: 1 }, { unique: true });

const salarySlipSchema = new mongoose.Schema(
  {
    payrollRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employeeId: { type: String, default: null, trim: true },
    employeeName: { type: String, required: true, trim: true },
    employeeEmail: { type: String, default: null, trim: true, lowercase: true },
    role: { type: String, default: null },
    designation: { type: String, default: null, trim: true },
    dateOfJoining: { type: Date, default: null },
    dateOfLeaving: { type: Date, default: null },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    payrollDays: { type: Number, default: 30, min: 1 },
    monthlySalary: { type: Number, default: 0, min: 0 },
    perDayRate: { type: Number, default: 0, min: 0 },
    presentDays: { type: Number, default: 0, min: 0 },
    wfhDays: { type: Number, default: 0, min: 0 },
    paidLeaveDays: { type: Number, default: 0, min: 0 },
    absentDays: { type: Number, default: 0, min: 0 },
    halfDays: { type: Number, default: 0, min: 0 },
    holidayDays: { type: Number, default: 0, min: 0 },
    weekendDays: { type: Number, default: 0, min: 0 },
    missingDays: { type: Number, default: 0, min: 0 },
    preJoiningDays: { type: Number, default: 0, min: 0 },
    leavingDays: { type: Number, default: 0, min: 0 },
    lopDays: { type: Number, default: 0, min: 0 },
    paidDays: { type: Number, default: 0, min: 0 },
    grossEarnings: { type: Number, default: 0, min: 0 },
    preJoiningDeduction: { type: Number, default: 0, min: 0 },
    leavingDeduction: { type: Number, default: 0, min: 0 },
    lopDeduction: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    netPay: { type: Number, default: 0, min: 0 },
    bankName: { type: String, default: null, trim: true },
    bankAccountNumber: { type: String, default: null, trim: true },
    ifscCode: { type: String, default: null, trim: true },
    issues: { type: [String], default: [] },
    ready: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
  },
);

salarySlipSchema.index({ payrollRun: 1, employee: 1 }, { unique: true });
salarySlipSchema.index({ employee: 1, status: 1, createdAt: -1 });

const PayrollRun = mongoose.model('PayrollRun', payrollRunSchema);
const SalarySlip = mongoose.model('SalarySlip', salarySlipSchema);

export { PayrollRun, SalarySlip };
