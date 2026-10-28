import mongoose from 'mongoose';

const employeeProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      immutable: true,
    },
    designation: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    dateOfJoining: {
      type: Date,
      default: null,
    },
    dateOfLeaving: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
  },
);

employeeProfileSchema.index({ dateOfJoining: 1 });

const employeeCompensationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required'],
      unique: true,
    },
    monthlyGrossSalary: {
      type: Number,
      min: 0,
      default: 0,
      select: false,
    },
    salaryEffectiveFrom: {
      type: Date,
      default: null,
      select: false,
    },
    bankName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
      select: false,
    },
    bankAccountNumber: {
      type: String,
      trim: true,
      maxlength: 40,
      default: null,
      select: false,
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
      default: null,
      select: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete ret.__v; return ret; } },
  },
);

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

const EmployeeProfile = mongoose.model('EmployeeProfile', employeeProfileSchema);
const EmployeeCompensation = mongoose.model('EmployeeCompensation', employeeCompensationSchema);
const Counter = mongoose.model('Counter', counterSchema);

export { EmployeeProfile, EmployeeCompensation, Counter };
