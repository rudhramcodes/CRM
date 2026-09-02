import ApiError from '../../utils/ApiError.js';
import * as attendanceRepo from './attendance.repository.js';
import { Shift } from './attendance.model.js';

// ===================== HELPERS =====================

const parseHHMM = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

// Auto-migrate old-format records: if clockIn.time exists but sessions[] is empty,
// create a session from legacy fields so break/clockout work for pre-migration records.
const ensureActiveSession = (record) => {
  if (!record.sessions) record.sessions = [];

  const hasActive = record.sessions.find(s => s.clockIn?.time && !s.clockOut?.time);
  if (hasActive) return hasActive;

  // Legacy record: clockIn.time exists but no session yet
  if (record.clockIn?.time && !record.clockOut?.time) {
    const session = {
      clockIn: {
        time: record.clockIn.time,
        ip: record.clockIn.ip || null,
        location: record.clockIn.location || {},
      },
      clockOut: null,
      breaks: record.breaks || [],
      workMinutes: 0,
      overtime: 0,
    };
    record.sessions.push(session);
    return session;
  }

  return null;
};

const calcSessionBreakMinutes = (breaks = []) => {
  let total = 0;
  for (const brk of breaks) {
    if (brk.start && brk.end) {
      total += (new Date(brk.end) - new Date(brk.start)) / 60000;
    }
  }
  return Math.round(total);
};

const recalcRecordTotals = (record, shiftDuration = 8) => {
  let totalWorkMinutes = 0;
  let totalBreakMinutes = 0;

  for (const session of record.sessions || []) {
    totalBreakMinutes += calcSessionBreakMinutes(session.breaks);
    if (session.clockIn?.time) {
      const end = session.clockOut?.time || new Date();
      session.workMinutes = Math.round((end - new Date(session.clockIn.time)) / 60000 - calcSessionBreakMinutes(session.breaks));
      if (session.workMinutes < 0) session.workMinutes = 0;
      session.overtime = Math.max(0, session.workMinutes - shiftDuration * 60);
      totalWorkMinutes += session.workMinutes;
    }
  }

  record.workHours = +(totalWorkMinutes / 60).toFixed(2);
  record.totalBreakMinutes = Math.round(totalBreakMinutes);
  record.overtime = +((Math.max(0, totalWorkMinutes - shiftDuration * 60)) / 60).toFixed(2);

  // Sync legacy fields from last session
  const lastSession = record.sessions?.[record.sessions.length - 1];
  if (lastSession) {
    record.clockIn = lastSession.clockIn || {};
    record.clockOut = lastSession.clockOut || {};
    record.breaks = lastSession.breaks || [];
  }

  return record;
};

// ===================== ATTENDANCE =====================

export const clockIn = async (employeeId, data, ip) => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Check for approved leave
  const leaves = await attendanceRepo.findAllLeaves(
    { employee: employeeId, status: 'approved', startDate: { $lte: now }, endDate: { $gte: today } },
    { limit: 1 }
  );
  if (leaves.leaves.length > 0) {
    throw ApiError.badRequest('You have an approved leave for today');
  }

  // Find or create shift
  let shift = await attendanceRepo.findDefaultShift();
  if (!shift) {
    shift = await Shift.create({
      name: 'General Shift',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15,
      isActive: true,
      isDefault: true,
    });
  }

  let record = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, today);

  // Check if already has active session
  if (record) {
    const activeSession = (record.sessions || []).find(s => s.clockIn?.time && !s.clockOut?.time);
    if (activeSession) {
      throw ApiError.badRequest('Already clocked in. Clock out first before clocking in again.');
    }
  }

  // Check holiday / weekend
  if (!record) {
    const holiday = await attendanceRepo.findHolidayByDate(today);
    if (holiday) {
      record = await attendanceRepo.createAttendance({
        employee: employeeId,
        date: today,
        shift: shift._id,
        status: 'holiday',
        sessions: [],
        createdBy: employeeId,
      });
      throw ApiError.badRequest(`Today is a holiday: ${holiday.name}`);
    }

    if (isWeekend(today)) {
      record = await attendanceRepo.createAttendance({
        employee: employeeId,
        date: today,
        shift: shift._id,
        status: 'weekend',
        sessions: [],
        createdBy: employeeId,
      });
    } else {
      record = await attendanceRepo.createAttendance({
        employee: employeeId,
        date: today,
        shift: shift._id,
        status: data?.isWFH ? 'wfh' : 'present',
        isWFH: data?.isWFH || false,
        wfhReason: data?.wfhReason || null,
        sessions: [],
        createdBy: employeeId,
      });
    }
  }

  // Late detection
  const shiftStart = parseHHMM(shift.startTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const graceEnd = shiftStart + (shift.gracePeriod || 15);
  const isLate = nowMinutes > graceEnd;
  const lateMinutes = isLate ? nowMinutes - graceEnd : 0;

  // Push new session
  const newSession = {
    clockIn: {
      time: now,
      ip: ip || null,
      location: data?.location || {},
    },
    clockOut: null,
    breaks: [],
    workMinutes: 0,
    overtime: 0,
  };

  record.sessions.push(newSession);
  record.isLate = isLate;
  record.lateMinutes = lateMinutes;
  record.status = data?.isWFH ? 'wfh' : 'present';
  if (data?.isWFH) {
    record.isWFH = true;
    record.wfhReason = data?.wfhReason || null;
  }

  recalcRecordTotals(record, shift.duration);

  record.events.push({
    type: 'clock_in',
    timestamp: now,
    metadata: { ip, isLate, lateMinutes, sessionIndex: record.sessions.length - 1 },
  });

  await record.save();
  return record;
};

export const clockOut = async (employeeId, location) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, today);
  if (!record) throw ApiError.badRequest('You have not clocked in today');

  const session = ensureActiveSession(record);
  if (!session) throw ApiError.badRequest('No active session to clock out');

  const now = new Date();

  session.clockOut = { time: now, location: location || {} };

  for (const brk of session.breaks) {
    if (brk.start && !brk.end) {
      brk.end = now;
      brk.duration = Math.round((now - new Date(brk.start)) / 60000);
    }
  }

  let shiftDuration = 8;
  if (record.shift?.duration) shiftDuration = record.shift.duration;
  else if (record.shift?._id) {
    const shift = await attendanceRepo.findShiftById(record.shift._id);
    if (shift) shiftDuration = shift.duration;
  }

  recalcRecordTotals(record, shiftDuration);

  const sessionIdx = record.sessions.indexOf(session);
  record.events.push({
    type: 'clock_out',
    timestamp: now,
    metadata: { workHours: record.workHours, overtime: record.overtime, sessionIndex: sessionIdx },
  });

  await record.save();
  return record;
};

export const startBreak = async (employeeId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, today);
  if (!record) throw ApiError.badRequest('Clock in first');

  const activeSession = ensureActiveSession(record);
  if (!activeSession) throw ApiError.badRequest('No active session. Clock in first.');

  const lastBreak = activeSession.breaks?.[activeSession.breaks.length - 1];
  if (lastBreak && !lastBreak.end) {
    throw ApiError.badRequest('Already on break');
  }

  activeSession.breaks.push({ start: new Date(), end: null, duration: 0 });

  record.events.push({ type: 'break_start', timestamp: new Date() });
  await record.save();
  return record;
};

export const endBreak = async (employeeId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, today);
  if (!record) throw ApiError.badRequest('No attendance record found');

  const activeSession = ensureActiveSession(record);
  if (!activeSession) throw ApiError.badRequest('No active session');

  const lastBreak = activeSession.breaks?.[activeSession.breaks.length - 1];
  if (!lastBreak || lastBreak.end) {
    throw ApiError.badRequest('Not currently on break');
  }

  const now = new Date();
  const duration = Math.round((now - new Date(lastBreak.start)) / 60000);
  lastBreak.end = now;
  lastBreak.duration = duration;

  let shiftDuration = 8;
  if (record.shift?.duration) shiftDuration = record.shift.duration;
  recalcRecordTotals(record, shiftDuration);

  record.events.push({ type: 'break_end', timestamp: now, metadata: { duration } });
  await record.save();
  return record;
};

export const getTodayStatus = async (employeeId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, today);
};

export const getAttendanceSummary = async (employeeId, date) => {
  const target = date ? new Date(date) : new Date();
  target.setHours(0, 0, 0, 0);

  const record = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, target);
  if (!record) return null;

  let totalBreakMinutes = 0;
  for (const session of record.sessions || []) {
    totalBreakMinutes += calcSessionBreakMinutes(session.breaks);
  }

  return {
    record,
    totalWorkHours: record.workHours || 0,
    totalBreakMinutes,
    totalBreakHours: +(totalBreakMinutes / 60).toFixed(2),
    sessions: (record.sessions || []).map((s, i) => ({
      index: i,
      clockIn: s.clockIn?.time,
      clockOut: s.clockOut?.time,
      breaks: s.breaks || [],
      workMinutes: s.workMinutes || 0,
    })),
  };
};

export const getAttendanceList = async (query, options) => {
  const filter = {};
  if (query.employee) filter.employee = query.employee;
  if (query.status) filter.status = query.status;
  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.date.$lte = new Date(query.dateTo);
  }
  return attendanceRepo.findAllAttendance(filter, options);
};

export const getCalendarData = async (employeeId, year, month) => {
  return attendanceRepo.findAttendanceForCalendar(employeeId, year, month);
};

export const manualOverride = async (id, data, adminId) => {
  const record = await attendanceRepo.findAttendanceById(id);
  if (!record) throw ApiError.notFound('Attendance record not found');

  return attendanceRepo.updateAttendance(id, {
    ...data,
    updatedBy: adminId,
    $push: {
      events: {
        type: 'status_change',
        timestamp: new Date(),
        metadata: { previousStatus: record.status, newStatus: data.status, by: adminId },
      },
    },
  });
};

// ===================== MANUAL ENTRY =====================

export const manualEntry = async (data, adminId) => {
  const { employee, date, clockInTime, clockOutTime, status, notes, isWFH } = data;
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  let shift = await attendanceRepo.findDefaultShift();
  if (!shift) {
    shift = await Shift.create({
      name: 'General Shift',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15,
      isActive: true,
      isDefault: true,
    });
  }

  let record = await attendanceRepo.findAttendanceByEmployeeAndDate(employee, targetDate);

  const sessions = [];
  if (clockInTime) {
    const session = {
      clockIn: { time: new Date(clockInTime) },
      clockOut: clockOutTime ? { time: new Date(clockOutTime) } : null,
      breaks: [],
      workMinutes: 0,
      overtime: 0,
    };

    if (clockInTime && clockOutTime) {
      const breakMinutes = 0;
      session.workMinutes = Math.round((new Date(clockOutTime) - new Date(clockInTime)) / 60000 - breakMinutes);
      session.overtime = Math.max(0, session.workMinutes - shift.duration * 60);
    }
    sessions.push(session);
  }

  if (record) {
    record.sessions = sessions;
    recalcRecordTotals(record, shift.duration);
    record.status = status || record.status;
    record.notes = notes || record.notes;
    if (isWFH !== undefined) record.isWFH = isWFH;
    record.updatedBy = adminId;
    record.events.push({
      type: 'status_change',
      timestamp: new Date(),
      metadata: { by: adminId, manualEntry: true },
    });
    await record.save();
    return record;
  }

  record = await attendanceRepo.createAttendance({
    employee,
    date: targetDate,
    shift: shift._id,
    sessions,
    status: status || 'present',
    notes: notes || null,
    isWFH: isWFH || false,
    createdBy: adminId,
  });

  recalcRecordTotals(record, shift.duration);
  await record.save();
  return record;
};

// ===================== REGULARIZATION =====================

export const requestRegularization = async (employeeId, data) => {
  const record = await attendanceRepo.findAttendanceById(data.attendanceId);
  if (!record) throw ApiError.notFound('Attendance record not found');

  if (String(record.employee._id) !== String(employeeId)) {
    throw ApiError.forbidden('You can only regularize your own attendance');
  }

  return attendanceRepo.updateAttendance(record._id, {
    regularization: {
      request: { reason: data.reason, requestedAt: new Date() },
      approval: { status: 'pending' },
    },
    $push: {
      events: {
        type: 'regularization_request',
        timestamp: new Date(),
        metadata: { reason: data.reason },
      },
    },
  });
};

export const approveRegularization = async (id, action, adminId, comment) => {
  const record = await attendanceRepo.findAttendanceById(id);
  if (!record) throw ApiError.notFound('Attendance record not found');

  const eventType = action === 'approved' ? 'regularization_approved' : 'regularization_rejected';

  return attendanceRepo.updateAttendance(record._id, {
    'regularization.approval': {
      status: action,
      approvedBy: adminId,
      approvedAt: new Date(),
      comment: comment || null,
    },
    $push: {
      events: {
        type: eventType,
        timestamp: new Date(),
        metadata: { by: adminId, comment },
      },
    },
  });
};

// ===================== SHIFT =====================

export const createShift = async (data, userId) => {
  if (data.isDefault) {
    await Shift.updateMany({ isDefault: true }, { isDefault: false });
  }
  return attendanceRepo.createShift({ ...data, createdBy: userId });
};

export const getShifts = async () => {
  return attendanceRepo.findAllShifts();
};

export const updateShift = async (id, data) => {
  const shift = await attendanceRepo.findShiftById(id);
  if (!shift) throw ApiError.notFound('Shift not found');

  if (data.isDefault) {
    await Shift.updateMany({ isDefault: true }, { isDefault: false });
  }

  return attendanceRepo.updateShift(id, data);
};

export const deleteShift = async (id) => {
  const shift = await attendanceRepo.findShiftById(id);
  if (!shift) throw ApiError.notFound('Shift not found');
  return attendanceRepo.deleteShift(id);
};

// ===================== LEAVE =====================

export const applyLeave = async (employeeId, data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  const overlapping = await attendanceRepo.findAllLeaves(
    {
      employee: employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    },
    { limit: 1 }
  );

  if (overlapping.leaves.length > 0) {
    throw ApiError.badRequest('You already have a leave request overlapping these dates');
  }

  const leave = await attendanceRepo.createLeaveRequest({
    employee: employeeId,
    ...data,
    startDate: start,
    endDate: end,
  });

  return leave;
};

export const getLeaves = async (query, options) => {
  const filter = {};
  if (query.employee) filter.employee = query.employee;
  if (query.status) filter.status = query.status;
  if (query.leaveType) filter.leaveType = query.leaveType;
  return attendanceRepo.findAllLeaves(filter, options);
};

export const getLeaveById = async (id) => {
  const leave = await attendanceRepo.findLeaveById(id);
  if (!leave) throw ApiError.notFound('Leave request not found');
  return leave;
};

export const approveLeave = async (id, adminId, comment) => {
  const leave = await attendanceRepo.findLeaveById(id);
  if (!leave) throw ApiError.notFound('Leave request not found');
  if (leave.status !== 'pending') throw ApiError.badRequest('Leave already processed');

  const updated = await attendanceRepo.updateLeaveStatus(id, 'approved', adminId, comment);

  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);

    if (isWeekend(date)) continue;

    const holiday = await attendanceRepo.findHolidayByDate(date);
    if (holiday) continue;

    const existing = await attendanceRepo.findAttendanceByEmployeeAndDate(leave.employee, date);
    if (existing) {
      await attendanceRepo.updateAttendance(existing._id, {
        status: 'leave',
        leave: leave._id,
      });
    } else {
      const shift = await attendanceRepo.findDefaultShift();
      await attendanceRepo.createAttendance({
        employee: leave.employee,
        date,
        shift: shift?._id,
        status: 'leave',
        leave: leave._id,
        createdBy: adminId,
      });
    }
  }

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const year = start.getFullYear();
  await attendanceRepo.updateLeaveBalance(leave.employee, year, leave.leaveType, days);

  return updated;
};

export const rejectLeave = async (id, adminId, comment) => {
  const leave = await attendanceRepo.findLeaveById(id);
  if (!leave) throw ApiError.notFound('Leave request not found');
  if (leave.status !== 'pending') throw ApiError.badRequest('Leave already processed');

  return attendanceRepo.updateLeaveStatus(id, 'rejected', adminId, comment);
};

export const getLeaveBalance = async (employeeId) => {
  const year = new Date().getFullYear();
  let balance = await attendanceRepo.findLeaveBalance(employeeId, year);

  if (!balance) {
    balance = await attendanceRepo.createLeaveBalance({
      employee: employeeId,
      year,
      sick: { total: 12, used: 0, balance: 12 },
      casual: { total: 10, used: 0, balance: 10 },
      earned: { total: 15, used: 0, balance: 15 },
      unpaid: { total: 0, used: 0, balance: 0 },
      comp_off: { total: 0, used: 0, balance: 0 },
    });
  }

  return balance;
};

// ===================== HOLIDAY =====================

export const createHoliday = async (data, userId) => {
  const existing = await attendanceRepo.findHolidayByDate(data.date);
  if (existing) throw ApiError.conflict('Holiday already exists for this date');

  return attendanceRepo.createHoliday({ ...data, date: new Date(data.date), createdBy: userId });
};

export const getHolidays = async (year) => {
  return attendanceRepo.findAllHolidays(year);
};

export const updateHoliday = async (id, data) => {
  const holiday = await attendanceRepo.findHolidayById(id);
  if (!holiday) throw ApiError.notFound('Holiday not found');
  return attendanceRepo.updateHoliday(id, data);
};

export const deleteHoliday = async (id) => {
  const holiday = await attendanceRepo.findHolidayById(id);
  if (!holiday) throw ApiError.notFound('Holiday not found');
  return attendanceRepo.deleteHoliday(id);
};

// ===================== REPORTS =====================

export const getDailyReport = async (date) => {
  return attendanceRepo.getDailyReport(date || new Date());
};

export const getWeeklyReport = async (startDate) => {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return attendanceRepo.getWeeklyReport(start, end);
};

export const getMonthlyReport = async (year, month) => {
  return attendanceRepo.getMonthlyReport(year, month);
};

export const getStats = async (employeeId, dateFrom, dateTo) => {
  const records = await attendanceRepo.findAttendanceForStats(employeeId, dateFrom, dateTo);

  const stats = {
    totalDays: records.length,
    present: 0,
    absent: 0,
    halfDay: 0,
    wfh: 0,
    leave: 0,
    holiday: 0,
    weekend: 0,
    late: 0,
    totalWorkHours: 0,
    totalOvertime: 0,
    totalBreakMinutes: 0,
  };

  for (const r of records) {
    stats[r.status] = (stats[r.status] || 0) + 1;
    if (r.isLate) stats.late++;
    stats.totalWorkHours += r.workHours || 0;
    stats.totalOvertime += r.overtime || 0;
    stats.totalBreakMinutes += r.totalBreakMinutes || 0;
  }

  stats.totalWorkHours = +stats.totalWorkHours.toFixed(2);
  stats.totalOvertime = +stats.totalOvertime.toFixed(2);

  return stats;
};

// ===================== BULK IMPORT =====================

export const bulkImport = async (records, userId) => {
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (const row of records) {
    try {
      const employeeId = row.employee;
      const date = new Date(row.date);
      date.setHours(0, 0, 0, 0);

      const existing = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, date);
      if (existing) {
        skipped++;
        continue;
      }

      const shift = await attendanceRepo.findDefaultShift();

      const sessions = [];
      if (row.clockIn) {
        sessions.push({
          clockIn: { time: new Date(row.clockIn) },
          clockOut: row.clockOut ? { time: new Date(row.clockOut) } : null,
          breaks: [],
          workMinutes: 0,
          overtime: 0,
        });
      }

      await attendanceRepo.createAttendance({
        employee: employeeId,
        date,
        shift: shift?._id,
        sessions,
        clockIn: row.clockIn ? { time: new Date(row.clockIn) } : undefined,
        clockOut: row.clockOut ? { time: new Date(row.clockOut) } : undefined,
        status: row.status || 'present',
        createdBy: userId,
      });
      imported++;
    } catch (err) {
      errors.push({ row, error: err.message });
      skipped++;
    }
  }

  return { imported, skipped, errors };
};
