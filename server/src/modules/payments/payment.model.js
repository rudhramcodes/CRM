import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_METHODS, PAYMENT_TYPES } from '../../constants/index.js';

const paymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice is required'],
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    paymentType: {
      type: String,
      enum: Object.values(PAYMENT_TYPES),
      default: PAYMENT_TYPES.PARTIAL,
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: [true, 'Payment method is required'],
    },
    referenceNo: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.COMPLETED,
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

paymentSchema.index({ invoice: 1 });
paymentSchema.index({ client: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentType: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
