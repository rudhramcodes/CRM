import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['mention', 'assigned', 'status_change', 'comment', 'due_soon'],
      required: true,
    },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceModel: { type: String, enum: ['Task', 'Project', 'Meeting'], default: 'Task' },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
