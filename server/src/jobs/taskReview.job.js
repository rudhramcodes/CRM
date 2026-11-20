import cron from 'node-cron';
import Task from '../modules/tasks/task.model.js';
import User from '../modules/auth/auth.model.js';
import * as notificationService from '../modules/notifications/notification.service.js';
import { addWorkingMinutes } from '../utils/workingHours.js';
import logger from '../utils/logger.js';

// Review promise: reviewers check within 1 office hour. 15 minutes before: a reminder. At the deadline: the
// reviewer and the admins hear it is late. reviewNudges (0 → 1 → 2) makes each push go out once, even with
// several server processes, because only one of them can win the conditional update.
const claim = (task, from, to) => Task.updateOne({ _id: task._id, status: 'review', reviewNudges: from }, { $set: { reviewNudges: to } });

const notify = (recipient, type, task, data = {}) => notificationService.createAndSend({
  recipient, referenceId: task._id, referenceModel: 'Task', dedup: false,
  link: task.project ? `/projects/${task.project}` : '/tasks',
  ...notificationService.buildNotification(type, { taskTitle: task.title, ...data }),
}).catch(() => {});

export const sendReviewNudges = async (now = new Date()) => {
  const soon = addWorkingMinutes(now, 15);
  const tasks = await Task.find({ status: 'review', reviewDueAt: { $ne: null, $lte: soon }, reviewNudges: { $lt: 2 } })
    .select('title project reviewer createdBy assignedTo reviewDueAt reviewNudges')
    .populate('reviewer', 'name').populate('createdBy', 'name').populate('assignedTo', 'name')
    .lean();
  let admins;
  for (const task of tasks) {
    const reviewer = task.reviewer || task.createdBy;
    if (!reviewer) continue;
    if (task.reviewDueAt <= now) {
      if (!(await claim(task, task.reviewNudges, 2)).modifiedCount) continue;
      await notify(reviewer._id, 'task_review_late', task);
      admins ||= await User.find({ role: { $in: ['admin', 'super_admin'] }, isActive: { $ne: false } }).select('_id').lean();
      for (const a of admins) {
        if (String(a._id) === String(reviewer._id)) continue;
        await notify(a._id, 'task_review_late', task, { reviewerName: reviewer.name, ownerName: task.assignedTo?.name || 'the team' });
      }
    } else if (task.reviewNudges === 0) {
      if (!(await claim(task, 0, 1)).modifiedCount) continue;
      await notify(reviewer._id, 'task_review_reminder', task);
    }
  }
  return tasks.length;
};

export const startTaskReviewCron = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const n = await sendReviewNudges();
      if (n) logger.info(`Task review cron: checked ${n} reviews`);
    } catch (err) {
      logger.error('Task review cron failed', { error: err.message });
    }
  });
  logger.info('Task review cron: every 5 minutes');
};
