import cron from 'node-cron';
import Task from '../modules/tasks/task.model.js';
import * as notificationService from '../modules/notifications/notification.service.js';
import { taskLink } from '../modules/tasks/task.service.js';
import logger from '../utils/logger.js';

// Once a day at 9 am IST: tasks due in the next 24 h, one notification per person.
// Each task is claimed per due date (dueSoonSentFor), so re-runs and restarts never repeat it; a reschedule re-arms it.
export const sendTaskDueReminders = async (now = new Date()) => {
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tasks = await Task.find({
    status: { $nin: ['done', 'review'] }, // in review it waits on the reviewer, not the doer
    dueDate: { $gte: now, $lte: in24Hours },
    assignedTo: { $ne: null },
    $expr: { $ne: ['$dueSoonSentFor', '$dueDate'] },
  }).select('title dueDate assignedTo helpers project priority').lean();

  const byUser = new Map();
  for (const t of tasks) {
    const { modifiedCount } = await Task.updateOne({ _id: t._id, dueSoonSentFor: { $ne: t.dueDate } }, { $set: { dueSoonSentFor: t.dueDate } });
    if (!modifiedCount) continue;
    // The owner and every helper get it.
    for (const k of new Set([t.assignedTo, ...(t.helpers || [])].map(String))) byUser.set(k, [...(byUser.get(k) || []), t]);
  }

  for (const [recipient, list] of byUser) {
    const one = list.length === 1 ? list[0] : null;
    const notif = notificationService.buildNotification('task_due_soon', {
      taskTitle: one ? one.title : `${list.length} tasks`,
      dueDate: one ? `on ${one.dueDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}` : 'in the next 24 hours',
    });
    await notificationService.createAndSend({
      recipient,
      ...(one ? { referenceId: one._id, referenceModel: 'Task', link: taskLink(one) } : { link: '/tasks' }),
      ...notif,
      ...(one ? {} : { message: `Due in the next 24 hours: ${list.map((t) => t.title).join(', ')}` }),
    }).catch((err) => logger.error(`Task due cron: ${err.message}`));
  }

  if (byUser.size) logger.info(`Task due cron: ${tasks.length} tasks, ${byUser.size} people notified`);
  return byUser.size;
};

export const startTaskDueCron = () => {
  cron.schedule('0 9 * * *', async () => {
    try {
      await sendTaskDueReminders();
    } catch (err) {
      logger.error('Task due cron failed', { error: err.message });
    }
  }, { timezone: 'Asia/Kolkata' });

  logger.info('Task due cron: scheduled daily at 09:00 IST');
};
