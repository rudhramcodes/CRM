import cron from 'node-cron';
import Meeting from '../modules/meetings/meeting.model.js';
import * as notificationService from '../modules/notifications/notification.service.js';
import logger from '../utils/logger.js';

const sendMeetingReminders = async () => {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const meetings = await Meeting.find({
    status: 'scheduled',
    reminderSent: false,
    date: { $gte: now, $lte: inOneHour },
  }).populate('lead', 'assignedTo');

  for (const meeting of meetings) {
    const recipients = [];

    if (meeting.lead?.assignedTo) {
      recipients.push(meeting.lead.assignedTo);
    }

    for (const recipient of recipients) {
      const notif = notificationService.buildNotification('meeting_reminder', {
        meetingTitle: meeting.title,
        timeLeft: '1 hour',
      });
      await notificationService.createAndSend({
        recipient,
        referenceId: meeting._id,
        referenceModel: 'Meeting',
        link: `/meetings/${meeting._id}`,
        ...notif,
      }).catch(() => {});
    }

    meeting.reminderSent = true;
    await meeting.save();
  }

  if (meetings.length > 0) {
    logger.info(`Meeting reminder cron: ${meetings.length} reminders sent`);
  }
};

export const startMeetingReminderCron = () => {
  cron.schedule('*/30 * * * *', async () => {
    try {
      await sendMeetingReminders();
    } catch (err) {
      logger.error('Meeting reminder cron failed', { error: err.message });
    }
  });

  logger.info('Meeting reminder cron: scheduled every 30 minutes');
};
