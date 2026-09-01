import cron from 'node-cron';
import { Attendance, Shift, Holiday } from './attendance.model.js';
import { User } from '../auth/auth.model.js';
import logger from '../../utils/logger.js';

const autoClockOut = async () => {
  try {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const shifts = await Shift.find({ isActive: true });

    for (const shift of shifts) {
      if (shift.endTime === currentHHMM) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const records = await Attendance.find({
          date: { $gte: today, $lt: tomorrow },
          'clockIn.time': { $exists: true, $ne: null },
          'clockOut.time': { $exists: false },
          shift: shift._id,
        });

        for (const record of records) {
          const clockOutTime = new Date();
          let totalBreakMinutes = 0;
          for (const brk of record.breaks || []) {
            if (brk.start && brk.end) {
              totalBreakMinutes += (new Date(brk.end) - new Date(brk.start)) / 60000;
            }
          }

          const workMinutes = (clockOutTime - new Date(record.clockIn.time)) / 60000 - totalBreakMinutes;
          const workHours = +(workMinutes / 60).toFixed(2);
          const overtime = +(Math.max(0, workHours - shift.duration)).toFixed(2);

          await Attendance.findByIdAndUpdate(record._id, {
            'clockOut.time': clockOutTime,
            workHours,
            overtime,
            $push: {
              events: {
                type: 'auto_clock_out',
                timestamp: clockOutTime,
                metadata: { workHours, overtime, auto: true },
              },
            },
          });
        }

        logger.info(`[Attendance] Auto clock-out: ${records.length} employees for shift ${shift.name}`);
      }
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
      'breaks.end': null,
      'breaks.start': { $lte: sixtyMinAgo },
    });

    for (const record of records) {
      const breaks = record.breaks;
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && !lastBreak.end) {
        lastBreak.end = sixtyMinAgo;
        lastBreak.duration = 60;
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
