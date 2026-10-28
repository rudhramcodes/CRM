import ApiError from './ApiError.js';

export const deadlineChange = (oldDate, newDate, reason, user, field = 'dueDate') => {
  const oldValue = oldDate ? new Date(oldDate).toISOString() : '';
  const date = newDate ? new Date(newDate) : null;
  if (date && Number.isNaN(date.getTime())) throw ApiError.badRequest('Invalid deadline');
  const newValue = date ? date.toISOString() : '';
  if (oldValue === newValue) return null;
  if (oldValue && !reason?.trim()) throw ApiError.badRequest('A reason is required to change a deadline');
  return { action: 'deadline_changed', field, oldValue, newValue, reason: reason?.trim() || '', performedBy: user._id };
};
