import cron from 'node-cron';
import { Attendance, Shift, Holiday } from './attendance.model.js';
import User from '../auth/auth.model.js';
import logger from '../../utils/logger.js';
import { ensureActiveSession, recalcRecordTotals } from './attendance.service.js';

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
        const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

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

export const startAttendanceCrons = () => {
  cron.schedule('* * * * *', autoClockOut);
  cron.schedule('59 23 * * *', autoAbsentMarking);
  cron.schedule('*/5 * * * *', autoEndBreaks);
  logger.info('[Attendance] Cron jobs started');
};
