import mongoose from 'mongoose';
import { INVOICE_STATUS } from '../../constants/index.js';

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
      maxlength: 500,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
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
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.DRAFT,
    },
    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: (v) => v && v.length > 0,
        message: 'At least one invoice item is required',
      },
    },
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0 },
    billingAddress: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'India' },
    },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    termsConditions: { type: String, trim: true, maxlength: 2000, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sentAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    lastPaymentDate: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    templateId: { type: String, default: 'default' },
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

invoiceSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach((item) => {
      item.amount = item.quantity * item.unitPrice;
    });
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  }
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  this.discountAmount = (this.subtotal * this.discountPercent) / 100;
  this.total = this.subtotal + this.taxAmount - this.discountAmount;
  this.balanceDue = this.total - this.paidAmount;
  next();
});

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ client: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ issueDate: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
