export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_DUE_SOON: 'task_due_soon',
  TASK_STATUS_CHANGE: 'task_status_change',
  TASK_COMMENT: 'task_comment',
  TASK_DELETED: 'task_deleted',
  TASK_REVIEW_REQUESTED: 'task_review_requested',
  TASK_REVIEW_REMINDER: 'task_review_reminder',
  TASK_REVIEW_LATE: 'task_review_late',
  TASK_CHANGES_REQUESTED: 'task_changes_requested',
  TASK_APPROVED: 'task_approved',
  MENTION: 'mention',
  PROJECT_ASSIGNED: 'project_assigned',
  PROJECT_STATUS_CHANGE: 'project_status_change',
  PROJECT_STAGE_REVERTED: 'project_stage_reverted',
  PROJECT_CHAT: 'project_chat',
  LEAD_CREATED: 'lead_created',
  LEAD_ASSIGNED: 'lead_assigned',
  LEAD_CONVERTED: 'lead_converted',
  MEETING_SCHEDULED: 'meeting_scheduled',
  MEETING_REMINDER: 'meeting_reminder',
  MEETING_REQUESTED: 'meeting_requested',
  INVOICE_PAID: 'invoice_paid',
  INVOICE_OVERDUE: 'invoice_overdue',
  PAYMENT_RECEIVED: 'payment_received',
  CONTRACT_EXPIRY: 'contract_expiry',
  LEAVE_APPLIED: 'leave_applied',
  REGULARIZATION_REQUEST: 'regularization_request',
  REGULARIZATION_APPROVED: 'regularization_approved',
  REGULARIZATION_REJECTED: 'regularization_rejected',
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  SYSTEM: 'system',
};

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const REFERENCE_MODELS = [
  'Task', 'Project', 'Lead', 'Client', 'Attendance',
  'Invoice', 'Payment', 'Meeting', 'User', 'LeaveRequest',
];

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'inApp',
  EMAIL: 'email',
  CLIQ: 'cliq',
};

// Channel routing per notification type:
//   email — only main notifications (meetings, money) hit email; task alerts are push + in-app only
//   cliq  — only team-wide events broadcast to the Cliq channel (individual
//           assignments/comments stay in-app to avoid spamming the channel)
export const NOTIFICATION_TEMPLATES = {
  task_assigned: {
    title: 'Task Assigned',
    message: (d) => `${d.actorName} assigned you "${d.taskTitle}"`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: false, cliq: false },
  },
  task_due_soon: {
    title: 'Task Due Soon',
    message: (d) => `"${d.taskTitle}" is due ${d.dueDate}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: false, cliq: false },
  },
  task_status_change: {
    title: 'Status Updated',
    message: (d) => ({
      in_progress: `${d.actorName} started "${d.taskTitle}"`,
      todo: `${d.actorName} moved "${d.taskTitle}" back to To Do`,
      done: `${d.actorName} finished "${d.taskTitle}"`,
      review: `${d.actorName} sent "${d.taskTitle}" for review`,
    }[d.newStatus] || `${d.actorName} marked "${d.taskTitle}" as ${d.newStatus}`),
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
  },
  task_comment: {
    title: 'New Comment',
    message: (d) => `${d.actorName} commented on "${d.taskTitle}"`,
    priority: NOTIFICATION_PRIORITIES.LOW,
    channels: { email: false, cliq: false },
  },
  mention: {
    title: 'You were mentioned',
    message: (d) => `${d.actorName} mentioned you in "${d.entityTitle}"`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
  },
  project_assigned: {
    title: 'Project Assigned',
    message: (d) => `${d.actorName} added you to "${d.projectName}"`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
  },
  project_status_change: {
    title: 'Project Status Updated',
    message: (d) => `${d.actorName} marked "${d.projectName}" as ${d.newStatus}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: true },
    cliqChannel: 'projects',
  },
  project_stage_reverted: {
    title: 'Project Moved Back',
    message: (d) => `${d.actorName} moved "${d.projectName}" from ${d.fromStage} to ${d.toStage}. Reason: ${d.reason}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  project_chat: {
    title: 'New message',
    message: (d) => `${d.senderName}: ${d.message}`,
    priority: NOTIFICATION_PRIORITIES.LOW,
    channels: { email: false, cliq: false },
  },
  lead_created: {
    title: 'New Lead',
    message: (d) => `New lead "${d.leadName}" from ${d.source}`,
    priority: NOTIFICATION_PRIORITIES.LOW,
    channels: { email: false, cliq: true },
    cliqChannel: 'leads',
  },
  lead_assigned: {
    title: 'Lead Assigned',
    message: (d) => `${d.actorName} assigned you lead "${d.leadName}"`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  lead_converted: {
    title: 'Lead Converted',
    message: (d) => `"${d.leadName}" has been converted to a client`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: true },
    cliqChannel: 'leads',
  },
  meeting_scheduled: {
    title: 'Meeting Scheduled',
    message: (d) => `Meeting "${d.meetingTitle}" scheduled ${d.date}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: true, cliq: true },
    cliqChannel: 'management',
  },
  meeting_requested: {
    title: 'Meeting Request',
    message: (d) => `${d.requester} asked for a meeting: "${d.title}"${d.when ? ` (${d.when})` : ''}${d.note ? `. ${d.note}` : ''}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  meeting_reminder: {
    title: 'Meeting Reminder',
    message: (d) => `"${d.meetingTitle}" starts in ${d.timeLeft}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  invoice_paid: {
    title: 'Invoice Paid',
    message: (d) => `Invoice #${d.invoiceNumber} marked as paid`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: true, cliq: true },
    cliqChannel: 'finance',
  },
  invoice_overdue: {
    title: 'Invoice Overdue',
    message: (d) => `Invoice #${d.invoiceNumber} is overdue`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: true },
    cliqChannel: 'finance',
  },
  payment_received: {
    title: 'Payment Received',
    message: (d) => `₹${d.amount} payment received for #${d.invoiceNumber}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: true, cliq: true },
    cliqChannel: 'finance',
  },
  contract_expiry: {
    title: 'Contract Expiring',
    message: (d) => `${d.clientName} contract expires ${d.date}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: true },
    cliqChannel: 'finance',
  },
  // Review loop: push + in-app only, never email
  task_review_requested: {
    title: 'Review needed',
    message: (d) => `${d.actorName} sent "${d.taskTitle}" for review. Please check it ${d.dueText}.`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: false, cliq: false },
  },
  task_review_reminder: {
    title: 'Review due soon',
    message: (d) => `"${d.taskTitle}" is waiting for your review: 15 minutes left`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: false, cliq: false },
  },
  task_review_late: {
    title: 'Review is late',
    message: (d) => (d.reviewerName
      ? `${d.reviewerName} hasn't reviewed "${d.taskTitle}" yet (sent by ${d.ownerName})`
      : `"${d.taskTitle}" has waited more than 1 hour for your review`),
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: false, cliq: false },
  },
  task_changes_requested: {
    title: 'Changes needed',
    message: (d) => `${d.actorName} asked for changes on "${d.taskTitle}": ${d.note}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: false, cliq: false },
  },
  task_reassigned: {
    title: 'Task moved',
    message: (d) => `${d.actorName} moved "${d.taskTitle}" to ${d.newOwner}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
  },
  task_rescheduled: {
    title: 'Due date moved',
    message: (d) => `${d.actorName} moved "${d.taskTitle}" to ${d.newDate}${d.reason ? `: ${d.reason}` : ''}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
  },
  task_approved: {
    title: 'Task approved',
    message: (d) => `${d.actorName} approved "${d.taskTitle}"`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
  },
  task_deleted: {
    title: 'Task Deleted',
    message: (d) => `"${d.taskTitle}" was deleted by ${d.actorName}`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: { email: false, cliq: false },
  },
  leave_applied: {
    title: 'New Leave Request',
    message: (d) => `${d.employeeName || 'An employee'} applied for ${d.leaveType} (${d.duration})`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  regularization_request: {
    title: 'New Regularization Request',
    message: (d) => `${d.employeeName || 'An employee'} requested attendance regularization for ${d.date || 'an attendance record'}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  regularization_approved: {
    title: 'Regularization Approved',
    message: (d) => `Your attendance regularization for ${d.date || 'the requested date'} was approved by ${d.approvedBy || 'an admin'}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  regularization_rejected: {
    title: 'Regularization Rejected',
    message: (d) => `Your attendance regularization for ${d.date || 'the requested date'} was rejected${d.comment ? `: ${d.comment}` : ''}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  leave_approved: {
    title: 'Leave Approved',
    message: (d) => `Your ${d.leaveType} request for ${d.dates} has been approved`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  leave_rejected: {
    title: 'Leave Rejected',
    message: (d) => `Your ${d.leaveType} request was rejected: ${d.reason || 'No reason specified'}`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: { email: true, cliq: false },
  },
  system: {
    title: 'System Update',
    message: (d) => d.message,
    priority: NOTIFICATION_PRIORITIES.LOW,
    channels: { email: false, cliq: false },
  },
};
