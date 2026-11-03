import mongoose from 'mongoose';
import { QUOTATION_STATUS } from '../../constants/index.js';

const actor = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };
export const revisionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  artifacts: {
    html: { type: mongoose.Schema.Types.ObjectId, required: true },
    pdf: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  status: { type: String, enum: Object.values(QUOTATION_STATUS), default: 'draft' },
  revisionNote: { type: String, default: '' },
  changedFields: [String],
  createdBy: actor,
  createdByName: { type: String, default: '' },
  createdAt: { type: Date, required: true },
  sentAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  expiredAt: { type: Date, default: null },
  inFlightSend: { type: mongoose.Schema.Types.ObjectId, default: null },
  sendAttempts: { type: [mongoose.Schema.Types.Mixed], default: [] },
  statusEvents: { type: [mongoose.Schema.Types.Mixed], default: [] },
  provenance: { type: String, enum: ['native', 'legacy_reconstructed'], default: 'native' },
  originalArtifactAvailable: { type: Boolean, default: true },
}, { minimize: false });

export const workingCopySchema = new mongoose.Schema({
  sourceVersion: { type: Number, required: true },
  baseVersion: { type: Number, required: true },
  editVersion: { type: Number, required: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  createdBy: actor,
  updatedBy: actor,
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
}, { _id: false, minimize: false });
