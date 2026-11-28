import cron from 'node-cron';
import { Attendance, Shift, Holiday } from './attendance.model.js';
import User from '../auth/auth.model.js';
import logger from '../../utils/logger.js';
import { autoClockOutTime, ensureActiveSession, recalcRecordTotals } from './attendance.service.js';
import { sendExpoPush } from '../notifications/expoPush.js';
import { shortDayStatus } from './leavePolicy.js';

// Once a day at 11:45 PM IST: every session still open, today's or left over from an earlier day, is closed.
// A forgotten clock-out counts work only up to that day's shift end (see autoClockOutTime), not up to 11:45 PM.
export const AUTO_CLOCK_OUT_TIME = '23:45';
const autoClockOut = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await Attendance.find({
      date: { $lt: tomorrow },
      $or: [
        { sessions: { $elemMatch: { 'clockIn.time': { $ne: null }, 'clockOut.time': null } } },
        { 'clockIn.time': { $exists: true, $ne: null }, 'clockOut.time': { $exists: false } },
      ],
    }).populate('shift', 'duration startTime endTime');

    let closed = 0;
    for (const record of records) {
      ensureActiveSession(record); // moves a legacy punch into sessions[]
      const open = record.sessions.filter((s) => s.clockIn?.time && !s.clockOut?.time);
      if (!open.length) continue;

      let clockOutTime;
      for (const session of open) {
        clockOutTime = autoClockOutTime(session.clockIn.time, record.date, record.shift, now);
        session.clockOut = { time: clockOutTime };
        for (const brk of session.breaks || []) {
          if (brk.start && !brk.end) {
            brk.end = new Date(Math.max(clockOutTime, new Date(brk.start)));
            brk.duration = Math.round((brk.end - new Date(brk.start)) / 60000);
          }
        }
      }

      recalcRecordTotals(record, record.shift?.duration || 8);
      record.events.push({
        type: 'auto_clock_out',
        timestamp: now,
        metadata: { clockOutTime, workHours: record.workHours, overtime: record.overtime, auto: true },
      });
      await record.save();
      closed += 1;
      // Tell them on their phone, so a missed clock-out isn't a surprise on the attendance report.
      const at = clockOutTime.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toUpperCase();
      sendExpoPush(record.employee, {
        type: 'auto_clock_out',
        title: 'Clocked out automatically',
        message: `You didn't clock out, so you were clocked out at ${at}. Request a regularization if you worked longer.`,
        link: '/attendance',
        priority: 'high',
      }).catch((err) => logger.error(`[Attendance] Auto clock-out push failed: ${err.message}`));
    }

    logger.info(`[Attendance] Auto clock-out: ${closed} employees`);
  } catch (error) {
    logger.error(`[Attendance] Auto clock-out error: ${error.message}`);
  }
};

const autoAbsentMarking = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const holiday = await Holiday.findOne({ date: { $gte: today, $lt: tomorrow } });
    if (holiday) return;

    // Every active staff login, admins included: the same people the Records "Not clocked in" list shows.
    const employees = await User.find({
      role: { $ne: 'client' },
      isActive: { $ne: false },
    }).select('_id');

    const shift = await Shift.findOne({ isDefault: true, isActive: true });
    if (!shift) return;

    for (const emp of employees) {
      const existing = await Attendance.findOne({
        employee: emp._id,
        date: { $gte: today, $lt: tomorrow },
      });

      if (!existing) {
        const dayOfWeek = today.getDay();
        const isWeekendDay = dayOfWeek === 0;

        await Attendance.create({
          employee: emp._id,
          date: today,
          shift: shift._id,
          status: isWeekendDay ? 'weekend' : 'absent',
          createdBy: emp._id,
        });
      }
    }

    logger.info(`[Attendance] Auto absent marking complete for ${employees.length} employees`);
  } catch (error) {
    logger.error(`[Attendance] Auto absent marking error: ${error.message}`);
  }
};

// A break still open after 60 minutes is ended at start + 60 min, so it counts as a 60-minute break.
export const endLongBreak = (brk, cutoff) => {
  if (!brk.start || brk.end || new Date(brk.start) > cutoff) return false;
  brk.end = new Date(new Date(brk.start).getTime() + 60 * 60 * 1000);
  brk.duration = 60;
  return true;
};

const autoEndBreaks = async () => {
  try {
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000);

    const records = await Attendance.find({
      $or: [
        { sessions: { $elemMatch: { 'breaks.end': null, 'breaks.start': { $lte: sixtyMinAgo } } } },
        { 'breaks.end': null, 'breaks.start': { $lte: sixtyMinAgo } },
      ],
    }).populate('shift', 'duration');

    let changed = 0;
    for (const record of records) {
      let ended = false;
      for (const session of record.sessions || []) {
        for (const brk of session.breaks || []) ended = endLongBreak(brk, sixtyMinAgo) || ended;
      }
      for (const brk of record.breaks || []) ended = endLongBreak(brk, sixtyMinAgo) || ended;

      if (ended) {
        recalcRecordTotals(record, record.shift?.duration || 8);
        await record.save();
        changed += 1;
      }
    }

    if (changed > 0) {
      logger.info(`[Attendance] Auto ended breaks for ${changed} employees`);
    }
  } catch (error) {
    logger.error(`[Attendance] Auto end breaks error: ${error.message}`);
  }
};

// Runs at day end: people can clock in more than once, so only the final total counts.
const autoShortDayMarking = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['present', 'wfh'] },
      leave: null,
    });

    let changed = 0;
    for (const record of records) {
      // No punches = set by hand by an admin; an open session = still working. Leave both alone.
      if (!record.sessions?.length || record.sessions.some((s) => s.clockIn?.time && !s.clockOut?.time)) continue;
      const to = shortDayStatus(record.workHours);
      if (!to) continue;

      const from = record.status;
      record.status = to;
      record.events.push({ type: 'status_change', timestamp: new Date(), metadata: { workHours: record.workHours, from, to, auto: true } });
      await record.save();
      changed += 1;

      const label = to === 'half_day' ? 'a half day' : 'absent';
      sendExpoPush(record.employee, {
        type: 'auto_short_day',
        title: `Today marked as ${label}`,
        message: `You worked ${(record.workHours || 0).toFixed(1)} h today, so it was marked as ${label}. Request a regularization if this is wrong.`,
        link: '/attendance',
        priority: 'high',
      }).catch((err) => logger.error(`[Attendance] Short day push failed: ${err.message}`));
    }

    logger.info(`[Attendance] Short day marking: ${changed} of ${records.length} records changed`);
  } catch (error) {
    logger.error(`[Attendance] Short day marking error: ${error.message}`);
  }
};

// shortcut: copies the same calendar date, so only fixed-date holidays (26 Jan, 15 Aug) should be marked recurring.
// Holidays marked "Repeats every year" get next year's copy, so they show up for leave planning.
export const copyRecurringHolidays = async (now = new Date()) => {
  const year = now.getFullYear();
  const recurring = await Holiday.find({
    isRecurring: true,
    date: { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) },
  }).lean();
  let added = 0;
  for (const h of recurring) {
    const d = new Date(h.date);
    const date = new Date(Date.UTC(year + 1, d.getUTCMonth(), d.getUTCDate()));
    const res = await Holiday.updateOne(
      { date },
      { $setOnInsert: { name: h.name, description: h.description, type: h.type, isRecurring: true, createdBy: h.createdBy, date } },
      { upsert: true }
    );
    added += res.upsertedCount || 0;
  }
  if (added) logger.info(`[Attendance] Copied ${added} recurring holidays to ${year + 1}`);
  return added;
};

export const startAttendanceCrons = () => {
  const [h, m] = AUTO_CLOCK_OUT_TIME.split(':').map(Number);
  cron.schedule(`${m} ${h} * * *`, autoClockOut, { timezone: 'Asia/Kolkata' });
  cron.schedule('59 23 * * *', async () => {
    await autoShortDayMarking();
    await autoAbsentMarking();
  }, { timezone: 'Asia/Kolkata' });
  cron.schedule('*/5 * * * *', autoEndBreaks, { timezone: 'Asia/Kolkata' });
  // Once a year on 1 Dec, so a copy an admin deletes stays deleted
  cron.schedule('30 1 1 12 *', () => copyRecurringHolidays()
    .catch((err) => logger.error(`[Attendance] Recurring holiday copy error: ${err.message}`)), { timezone: 'Asia/Kolkata' });
  logger.info('[Attendance] Cron jobs started');
};
