import cron from 'node-cron';
import { Attendance, Holiday, LeaveRequest } from '../modules/attendance/attendance.model.js';
import User from '../modules/auth/auth.model.js';
import { sendExpoPush } from '../modules/notifications/expoPush.js';
import logger from '../utils/logger.js';

// shortcut: fixed office times for everyone; read them from each person's shift when shifts differ.
export const CLOCK_IN_TIME = '09:50';
export const LATE_TIME = '10:05';

const MESSAGES = {
  in: { type: 'clock_in_reminder', title: 'Time to clock in', message: "It's 9:50. Clock in for today's shift." },
  late: { type: 'clock_in_missed', title: "You haven't clocked in yet", message: "It's 10:05 and you're not clocked in. Tap to clock in now." },
};

// Days off: no reminder.
const SKIP_STATUSES = ['leave', 'holiday', 'half_day', 'weekend'];
const hasClockedIn = (r) => !!(r?.sessions?.some((s) => s.clockIn?.time) || r?.clockIn?.time);

// Pure: which users still need a clock-in reminder, given today's attendance records and who is on approved leave.
export const whoToRemind = (users, records = [], onLeave = []) => {
  const byUser = new Map(records.map((r) => [String(r.employee), r]));
  const leave = new Set(onLeave.map(String));
  return users.filter((u) => {
    const id = String(u._id);
    const r = byUser.get(id);
    return !leave.has(id) && !hasClockedIn(r) && !SKIP_STATUSES.includes(r?.status);
  });
};

// Push (phone only, no Inbox entry) to every active employee/manager who hasn't clocked in today.
// Day bounds use the server's local midnight, the same way attendance records are dated.
export const sendClockInReminders = async (kind, now = new Date()) => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (await Holiday.exists({ date: { $gte: today, $lt: tomorrow } })) return 0;

  const [users, records, leaves] = await Promise.all([
    User.find({ role: { $in: ['employee', 'manager'] }, isActive: true }).select('_id').lean(),
    Attendance.find({ date: { $gte: today, $lt: tomorrow } }).select('employee status sessions clockIn').lean(),
    LeaveRequest.find({ status: 'approved', startDate: { $lt: tomorrow }, endDate: { $gte: today } }).select('employee').lean(),
  ]);
  const due = whoToRemind(users, records, leaves.map((l) => l.employee));
  const push = { ...MESSAGES[kind], link: '/attendance', priority: 'high' };

  await Promise.all(due.map((u) => sendExpoPush(u._id, push)
    .catch((err) => logger.error(`[ClockReminder] ${u._id}: ${err.message}`))));
  logger.info(`[ClockReminder] ${kind}: ${due.length} of ${users.length} reminded`);
  return due.length;
};

// "09:50" → "50 9 * * 1-6" (Monday–Saturday)
const cronAt = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${m} ${h} * * 1-6`;
};

export const startClockReminderCron = () => {
  for (const [time, kind] of [[CLOCK_IN_TIME, 'in'], [LATE_TIME, 'late']]) {
    cron.schedule(cronAt(time), () => sendClockInReminders(kind)
      .catch((err) => logger.error(`[ClockReminder] ${kind} failed: ${err.message}`)), { timezone: 'Asia/Kolkata' });
  }
  logger.info(`[ClockReminder] scheduled at ${CLOCK_IN_TIME} and ${LATE_TIME} IST, Mon-Sat`);
};
