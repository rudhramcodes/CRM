import cron from 'node-cron';
import Task from '../modules/tasks/task.model.js';
import * as notificationService from '../modules/notifications/notification.service.js';
import logger from '../utils/logger.js';

const sendTaskDueReminders = async () => {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await Task.find({
    status: { $ne: 'done' },
    dueDate: { $gte: now, $lte: in24Hours },
    assignedTo: { $ne: null },
  }).populate('assignedTo', '_id');

  for (const task of tasks) {
    if (task.assignedTo?._id) {
      const notif = notificationService.buildNotification('task_due_soon', {
        taskTitle: task.title,
        dueDate: task.dueDate?.toLocaleDateString('en-IN') || 'soon',
      });
      await notificationService.createAndSend({
        recipient: task.assignedTo._id,
        referenceId: task._id,
        referenceModel: 'Task',
        link: `/projects/${task.project}`,
        ...notif,
      }).catch(() => {});
    }
  }

  if (tasks.length > 0) {
    logger.info(`Task due cron: ${tasks.length} due-soon notifications sent`);
  }
};

export const startTaskDueCron = () => {
  cron.schedule('0 6 * * *', async () => {
    logger.info('Task due cron: starting daily check');
    try {
      await sendTaskDueReminders();
    } catch (err) {
      logger.error('Task due cron failed', { error: err.message });
    }
  });

  logger.info('Task due cron: scheduled daily at 06:00');
};
