// How each notification looks and behaves on a phone, like a normal app's:
// - channelId: Android "Notification categories" the user can mute one by one in system settings
// - interruptionLevel (iOS): 'time-sensitive' breaks through Focus (late review, meeting soon),
//   'passive' lands quietly in the list (FYI updates), 'active' is a normal banner + sound
// - categoryId: the buttons under the notification (the app registers the same ids)
// - threadId: notifications about the same task/lead/project stack together on the lock screen
const STYLES = {
  // Reviews: someone is waiting on you.
  task_review_requested: { channelId: 'reviews', interruptionLevel: 'active', categoryId: 'review' },
  task_review_reminder: { channelId: 'reviews', interruptionLevel: 'time-sensitive', categoryId: 'review' },
  task_review_late: { channelId: 'reviews', interruptionLevel: 'time-sensitive', categoryId: 'review' },
  task_changes_requested: { channelId: 'tasks', interruptionLevel: 'active', categoryId: 'open' },
  // Tasks
  task_assigned: { channelId: 'tasks', interruptionLevel: 'active', categoryId: 'task_new' },
  task_due_soon: { channelId: 'tasks', interruptionLevel: 'active', categoryId: 'open' },
  task_approved: { channelId: 'tasks', interruptionLevel: 'active' },
  task_reassigned: { channelId: 'tasks', interruptionLevel: 'active', categoryId: 'open' },
  task_rescheduled: { channelId: 'tasks', interruptionLevel: 'active', categoryId: 'open' },
  task_status_change: { channelId: 'tasks', interruptionLevel: 'passive' },
  task_deleted: { channelId: 'tasks', interruptionLevel: 'passive' },
  // Messages
  task_comment: { channelId: 'chat', interruptionLevel: 'active', categoryId: 'chat' },
  mention: { channelId: 'chat', interruptionLevel: 'active', categoryId: 'chat' },
  project_chat: { channelId: 'chat', interruptionLevel: 'active' },
  // Sales and meetings
  lead_assigned: { channelId: 'sales', interruptionLevel: 'active', categoryId: 'open' },
  lead_created: { channelId: 'sales', interruptionLevel: 'passive' },
  lead_converted: { channelId: 'sales', interruptionLevel: 'passive' },
  meeting_scheduled: { channelId: 'sales', interruptionLevel: 'active' },
  meeting_requested: { channelId: 'sales', interruptionLevel: 'active', categoryId: 'open' },
  meeting_reminder: { channelId: 'sales', interruptionLevel: 'time-sensitive', categoryId: 'open' },
  // Money
  invoice_paid: { channelId: 'money', interruptionLevel: 'active' },
  payment_received: { channelId: 'money', interruptionLevel: 'active' },
  invoice_overdue: { channelId: 'money', interruptionLevel: 'active' },
  contract_expiry: { channelId: 'money', interruptionLevel: 'active' },
  // Attendance and leave
  leave_applied: { channelId: 'people', interruptionLevel: 'active', categoryId: 'open' },
  regularization_request: { channelId: 'people', interruptionLevel: 'active', categoryId: 'open' },
  leave_approved: { channelId: 'people', interruptionLevel: 'active' },
  leave_rejected: { channelId: 'people', interruptionLevel: 'active' },
  leave_cancelled: { channelId: 'people', interruptionLevel: 'active' },
  regularization_approved: { channelId: 'people', interruptionLevel: 'active' },
  regularization_rejected: { channelId: 'people', interruptionLevel: 'active' },
  // Projects
  project_assigned: { channelId: 'tasks', interruptionLevel: 'active' },
  project_status_change: { channelId: 'tasks', interruptionLevel: 'passive' },
  project_stage_reverted: { channelId: 'tasks', interruptionLevel: 'active' },
  system: { channelId: 'default', interruptionLevel: 'passive' },
};

// Short module name shown above the text on iOS ("Tasks", "Review").
const SUBTITLES = { reviews: 'Review', tasks: 'Tasks', chat: 'Message', sales: 'Sales', money: 'Payments', people: 'Attendance' };

export const pushStyle = ({ type, referenceModel, referenceId }) => {
  const s = STYLES[type] || { channelId: 'default', interruptionLevel: 'active' };
  return {
    ...s,
    subtitle: SUBTITLES[s.channelId],
    threadId: referenceId ? `${referenceModel || 'item'}:${referenceId}` : s.channelId,
    priority: s.interruptionLevel === 'passive' ? 'normal' : 'high',
  };
};
