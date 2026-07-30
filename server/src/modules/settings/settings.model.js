import mongoose from 'mongoose';

const userPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  notify: {
    type: Map,
    of: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
    default: {},
  },
}, { timestamps: true });

export const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

export const Setting = mongoose.model('Setting', settingSchema);
