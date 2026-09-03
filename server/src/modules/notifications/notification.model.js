import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: { type: String, default: '' },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceModel: {
      type: String,
      enum: [
        'Task', 'Project', 'Lead', 'Client',
        'Invoice', 'Payment', 'Meeting', 'User', 'LeaveRequest',
      ],
    },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed },

    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },

    read: { type: Boolean, default: false, index: true },
    readAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ referenceId: 1, referenceModel: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
