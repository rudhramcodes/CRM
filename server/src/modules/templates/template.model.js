import mongoose from 'mongoose';
import { BRANDS } from '../../constants/index.js';

const templateSchema = new mongoose.Schema(
  {
    venture: {
      type: String,
      enum: BRANDS,
      required: [true, 'Venture is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    config: {
      primaryColor: { type: String, default: '#1e40af' },
      secondaryColor: { type: String, default: '#f8fafc' },
      fontFamily: { type: String, default: 'Inter, sans-serif' },
      logoUrl: { type: String, default: '' },
      accentColor: { type: String, default: '#0f172a' },
      showGst: { type: Boolean, default: true },
      showDiscount: { type: Boolean, default: true },
      showTerms: { type: Boolean, default: true },
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

const Template = mongoose.model('Template', templateSchema);

export default Template;
