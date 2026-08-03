import cron from 'node-cron';
import Meeting from '../modules/meetings/meeting.model.js';
import * as notificationService from '../modules/notifications/notification.service.js';
import { getMeetingContacts } from '../modules/meetings/meeting.service.js';
import { sendMeetingEmail } from '../services/emailService.js';
import logger from '../utils/logger.js';

// Meeting date is stored at UTC midnight + startTime as HH:mm (server tz)
const meetingStart = (meeting) => {
  const d = new Date(meeting.date);
  const [h, m] = meeting.startTime.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

const sendMeetingReminders = async () => {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const candidates = await Meeting.find({
    status: 'scheduled',
    reminderSent: false,
    date: { $gte: startOfToday },
  });

  const due = candidates.filter((m) => {
    const start = meetingStart(m);
    return start > now && start <= inOneHour;
  });

  for (const meeting of due) {
    const { staff, clientEmail } = await getMeetingContacts(meeting);
    const link = `/meetings/${meeting._id}`;
    const notif = notificationService.buildNotification('meeting_reminder', {
      meetingTitle: meeting.title,
      timeLeft: '1 hour',
    });

    await notificationService.createAndSendBulk(staff.map((s) => s._id), {
      referenceId: meeting._id,
      referenceModel: 'Meeting',
      link,
      channels: { inApp: true, email: false },
      ...notif,
    }).catch(() => {});

    await Promise.allSettled([
      ...staff.map((s) => sendMeetingEmail(s.email, meeting, 'reminder')),
      clientEmail ? sendMeetingEmail(clientEmail, meeting, 'reminder') : null,
    ].filter(Boolean));

    meeting.reminderSent = true;
    await meeting.save();
  }

  if (due.length > 0) {
    logger.info(`Meeting reminder cron: ${due.length} reminders sent`);
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
