import mongoose from 'mongoose';

// A saved group of people ("Edit team", "Shoot crew") to add to a task in one tap.
const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.model('Team', teamSchema);
