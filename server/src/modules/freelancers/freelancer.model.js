import mongoose from 'mongoose';

const ventureProfileSchema = new mongoose.Schema({
  venture: {
    type: String,
    enum: ['panigrahna', 'aghori', 'house_of_joggi', 'damrru', 'tandavs', 'kapaalik', 'kalyannam', 'storage_media_solution'],
    required: true,
  },
  internalTitle: { type: String, trim: true, default: '' },
  serviceCategories: [{ type: String, trim: true }],
  skillLevel: { type: String, enum: ['junior', 'mid', 'senior', 'specialist', 'lead'], default: 'mid' },
  experienceSummary: { type: String, trim: true, maxlength: 1000, default: '' },
  active: { type: Boolean, default: true },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  rateCards: [{
    rateBasis: { type: String, enum: ['per_hour', 'per_shift', 'per_day', 'per_function', 'per_event', 'per_deliverable', 'monthly', 'custom'], required: true },
    amount: { type: Number, min: 0, required: true },
    currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
    effectiveFrom: { type: Date, required: true },
    effectiveUntil: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    createdAt: { type: Date, default: Date.now },
  }],
}, { _id: true });

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  relationship: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  pincode: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: 'India' },
}, { _id: false });

const freelancerSchema = new mongoose.Schema({
  freelancerCode: { type: String, unique: true, trim: true, index: true },
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  displayName: { type: String, trim: true, default: '' },
  profilePhoto: { type: String, default: '' },
  phone: { type: String, required: true, trim: true },
  alternatePhone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  whatsappNumber: { type: String, trim: true, default: '' },
  preferredContactChannel: { type: String, enum: ['phone', 'whatsapp', 'email'], default: 'phone' },
  city: { type: String, trim: true, default: '' },
  serviceAreas: [{ type: String, trim: true }],
  address: { type: addressSchema, default: () => ({}) },
  freelancerType: { type: String, enum: ['individual', 'team', 'agency', 'vendor'], default: 'individual' },
  experienceYears: { type: Number, min: 0, default: 0 },
  bio: { type: String, trim: true, maxlength: 2000, default: '' },
  languages: [{ type: String, trim: true }],
  portfolioLinks: [{ type: String, trim: true }],
  internalTags: [{ type: String, trim: true }],
  emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
  ventureProfiles: { type: [ventureProfileSchema], default: [] },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) { delete ret.__v; return ret; },
  },
});

freelancerSchema.index({ fullName: 'text', displayName: 'text', phone: 'text', city: 'text', 'ventureProfiles.serviceCategories': 'text' });
freelancerSchema.index({ 'ventureProfiles.venture': 1, status: 1 });
freelancerSchema.index({ createdAt: -1 });

export default mongoose.model('Freelancer', freelancerSchema);
