import mongoose from 'mongoose';
import { QUOTATION_STATUS } from '../../constants/index.js';

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(QUOTATION_STATUS),
      default: QUOTATION_STATUS.DRAFT,
    },
    templateId: { type: String, enum: ['standard', 'panigrahna'] },
    recipientName: { type: String, trim: true, maxlength: 200 },
    recipientAddress: { type: String, trim: true, maxlength: 2000 },
    recipientEmail: { type: String, trim: true, maxlength: 320 },
    recipientPhone: { type: String, trim: true, maxlength: 100 },
    recipientGst: { type: String, trim: true, maxlength: 100 },
    clientReference: { type: String, trim: true, maxlength: 200 },
    projectReference: { type: String, trim: true, maxlength: 200 },
    issuerName: { type: String, trim: true, maxlength: 200 },
    issuerAddress: { type: String, trim: true, maxlength: 2000 },
    issuerEmail: { type: String, trim: true, maxlength: 320 },
    issuerPhone: { type: String, trim: true, maxlength: 100 },
    issuerWebsite: { type: String, trim: true, maxlength: 500 },
    issuerGst: { type: String, trim: true, maxlength: 100 },
    bankName: { type: String, trim: true, maxlength: 200 },
    bankAccountName: { type: String, trim: true, maxlength: 200 },
    bankAccountNumber: { type: String, trim: true, maxlength: 100 },
    bankIfsc: { type: String, trim: true, maxlength: 100 },
    bankGst: { type: String, trim: true, maxlength: 100 },
    bankUpi: { type: String, trim: true, maxlength: 200 },
    signatoryName: { type: String, trim: true, maxlength: 200 },
    closingNote: { type: String, trim: true, maxlength: 5000 },
    paymentTerms: { type: String, trim: true, maxlength: 10000 },
    conditions: { type: String, trim: true, maxlength: 20000 },
    salutation: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    letterBody: {
      type: String,
      trim: true,
      maxlength: 10000,
      default: '',
    },
    letterSignoff: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    scopeTitle: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    scopeIntro: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    scopeOfWork: {
      type: [String],
      default: [],
    },
    deliverables: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    note: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sentAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

quotationSchema.pre('save', function (next) {
  this.taxAmount = (Number(this.price || 0) * Number(this.taxRate || 0)) / 100;
  this.total = Number(this.price || 0) + this.taxAmount;
  next();
});

quotationSchema.index({ client: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ issueDate: -1 });

const Quotation = mongoose.model('Quotation', quotationSchema);

export default Quotation;
