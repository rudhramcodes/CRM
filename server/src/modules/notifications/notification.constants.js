export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_DUE_SOON: 'task_due_soon',
  TASK_STATUS_CHANGE: 'task_status_change',
  TASK_COMMENT: 'task_comment',
  MENTION: 'mention',
  PROJECT_ASSIGNED: 'project_assigned',
  LEAD_CREATED: 'lead_created',
  LEAD_ASSIGNED: 'lead_assigned',
  LEAD_CONVERTED: 'lead_converted',
  MEETING_SCHEDULED: 'meeting_scheduled',
  MEETING_REMINDER: 'meeting_reminder',
  INVOICE_PAID: 'invoice_paid',
  INVOICE_OVERDUE: 'invoice_overdue',
  PAYMENT_RECEIVED: 'payment_received',
  CONTRACT_EXPIRY: 'contract_expiry',
  SYSTEM: 'system',
};

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const REFERENCE_MODELS = [
  'Task', 'Project', 'Lead', 'Client',
  'Invoice', 'Payment', 'Meeting', 'User',
];

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'inApp',
  EMAIL: 'email',
  CLIQ: 'cliq',
};

// Channel routing per notification type:
//   email — only main notifications (meetings, money, assignments) hit email
//   cliq  — only team-wide events broadcast to the Cliq channel (individual
//           assignments/comments stay in-app to avoid spamming the channel)
export const NOTIFICATION_TEMPLATES = {
  task_assigned: {
    title: 'Task Assigned',
    message: (d) => `${d.actorName} assigned you "${d.taskTitle}"`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
    emoji: '📋',
  },
  task_due_soon: {
    title: 'Task Due Soon',
    message: (d) => `"${d.taskTitle}" is due ${d.dueDate}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
    emoji: '⏰',
  },
  task_status_change: {
    title: 'Status Updated',
    message: (d) => `${d.actorName} marked "${d.taskTitle}" as ${d.newStatus}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
    emoji: '🔄',
  },
  task_comment: {
    title: 'New Comment',
    message: (d) => `${d.actorName} commented on "${d.taskTitle}"`,
    priority: NOTIFICATION_PRIORITIES.LOW,
    channels: { email: false, cliq: false },
    emoji: '💬',
  },
  mention: {
    title: 'You were mentioned',
    message: (d) => `${d.actorName} mentioned you in "${d.entityTitle}"`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
    emoji: '📣',
  },
  project_assigned: {
    title: 'Project Assigned',
    message: (d) => `${d.actorName} added you to "${d.projectName}"`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
    emoji: '📁',
  },
  project_status_change: {
    title: 'Project Status Updated',
    message: (d) => `${d.actorName} marked "${d.projectName}" as ${d.newStatus}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: true },
    emoji: '📊',
  },
  lead_created: {
    title: 'New Lead',
    message: (d) => `New lead "${d.leadName}" from ${d.source}`,
    priority: NOTIFICATION_PRIORITIES.LOW,
    channels: { email: false, cliq: true },
    emoji: '🔔',
  },
  lead_assigned: {
    title: 'Lead Assigned',
    message: (d) => `${d.actorName} assigned you lead "${d.leadName}"`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
    emoji: '🎯',
  },
  lead_converted: {
    title: 'Lead Converted',
    message: (d) => `"${d.leadName}" converted to client`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: true, cliq: true },
    emoji: '🎉',
  },
  meeting_scheduled: {
    title: 'Meeting Scheduled',
    message: (d) => `Meeting "${d.meetingTitle}" scheduled ${d.date}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: true, cliq: true },
    emoji: '📅',
  },
  meeting_reminder: {
    title: 'Meeting Reminder',
    message: (d) => `"${d.meetingTitle}" starts in ${d.timeLeft}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
    emoji: '⏰',
  },
  invoice_paid: {
    title: 'Invoice Paid',
    message: (d) => `Invoice #${d.invoiceNumber} marked as paid`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: true, cliq: true },
    emoji: '💰',
  },
  invoice_overdue: {
    title: 'Invoice Overdue',
    message: (d) => `Invoice #${d.invoiceNumber} is overdue`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: true },
    emoji: '🚨',
  },
  payment_received: {
    title: 'Payment Received',
    message: (d) => `₹${d.amount} payment received for #${d.invoiceNumber}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: true, cliq: true },
    emoji: '💵',
  },
  contract_expiry: {
    title: 'Contract Expiring',
    message: (d) => `${d.clientName} contract expires ${d.date}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: true },
    emoji: '📄',
  },
  system: {
    title: 'System Update',
    message: (d) => d.message,
    priority: NOTIFICATION_PRIORITIES.LOW,
    channels: { email: false, cliq: false },
    emoji: '⚙️',
  },
};
