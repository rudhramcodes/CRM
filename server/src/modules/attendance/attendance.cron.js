import cron from 'node-cron';
import { Attendance, Shift, Holiday } from './attendance.model.js';
import User from '../auth/auth.model.js';
import logger from '../../utils/logger.js';
import { ensureActiveSession, recalcRecordTotals } from './attendance.service.js';
import { sendExpoPush } from '../notifications/expoPush.js';
import { shortDayStatus } from './leavePolicy.js';

// "18:30" → "6:30 PM"
const toDisplay = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const autoClockOut = async () => {
  try {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const shifts = await Shift.find({ isActive: true });

    for (const shift of shifts) {
      if (shift.endTime !== currentHHMM) continue;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const records = await Attendance.find({
        date: { $gte: today, $lt: tomorrow },
        shift: shift._id,
        $or: [
          { sessions: { $elemMatch: { 'clockIn.time': { $ne: null }, 'clockOut.time': null } } },
          { 'clockIn.time': { $exists: true, $ne: null }, 'clockOut.time': { $exists: false } },
        ],
      });

      for (const record of records) {
        const activeSession = ensureActiveSession(record);
        if (!activeSession) continue;

        const clockOutTime = new Date();
        activeSession.clockOut = { time: clockOutTime };

        for (const brk of activeSession.breaks || []) {
          if (brk.start && !brk.end) {
            brk.end = clockOutTime;
            brk.duration = Math.round((clockOutTime - new Date(brk.start)) / 60000);
          }
        }

        recalcRecordTotals(record, shift.duration || 8);
        record.events.push({
          type: 'auto_clock_out',
          timestamp: clockOutTime,
          metadata: { workHours: record.workHours, overtime: record.overtime, auto: true },
        });
        await record.save();
        // Tell them on their phone, so a missed clock-out isn't a surprise on the attendance report.
        sendExpoPush(record.employee, {
          type: 'auto_clock_out',
          title: 'Clocked out automatically',
          message: `Your shift ended at ${toDisplay(shift.endTime)}, so you were clocked out. Request a regularization if this is wrong.`,
          link: '/attendance',
          priority: 'high',
        }).catch((err) => logger.error(`[Attendance] Auto clock-out push failed: ${err.message}`));
      }

      logger.info(`[Attendance] Auto clock-out: ${records.length} employees for shift ${shift.name}`);
    }
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

    const employees = await User.find({
      role: { $in: ['employee', 'manager'] },
      isActive: true,
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

const autoEndBreaks = async () => {
  try {
    const now = new Date();
    const sixtyMinAgo = new Date(now - 60 * 60 * 1000);

    const records = await Attendance.find({
      $or: [
        { sessions: { $elemMatch: { 'breaks.end': null, 'breaks.start': { $lte: sixtyMinAgo } } } },
        { 'breaks.end': null, 'breaks.start': { $lte: sixtyMinAgo } },
      ],
    });

    for (const record of records) {
      let changed = false;

      for (const session of record.sessions || []) {
        for (const brk of session.breaks || []) {
          if (brk.start && !brk.end && new Date(brk.start) <= sixtyMinAgo) {
            brk.end = sixtyMinAgo;
            brk.duration = 60;
            changed = true;
          }
        }
      }

      for (const brk of record.breaks || []) {
        if (brk.start && !brk.end && new Date(brk.start) <= sixtyMinAgo) {
          brk.end = sixtyMinAgo;
          brk.duration = 60;
          changed = true;
        }
      }

      if (changed) {
        recalcRecordTotals(record, record.shift?.duration || 8);
        await record.save();
      }
    }

    if (records.length > 0) {
      logger.info(`[Attendance] Auto ended breaks for ${records.length} employees`);
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

export const startAttendanceCrons = () => {
  cron.schedule('* * * * *', autoClockOut);
  cron.schedule('59 23 * * *', async () => {
    await autoShortDayMarking();
    await autoAbsentMarking();
  });
  cron.schedule('*/5 * * * *', autoEndBreaks);
  logger.info('[Attendance] Cron jobs started');
};
