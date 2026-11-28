import mongoose from 'mongoose';
import ApiError from '../../utils/ApiError.js';
import * as attendanceRepo from './attendance.repository.js';
import { Shift, Attendance, Holiday } from './attendance.model.js';
import { escapeRegex } from '../../utils/pagination.js';
import { createAndSend } from '../notifications/notification.service.js';
import {
  sendLeaveAppliedEmail,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
} from '../../services/emailService.js';
import { resolveLocationDetails, resolveLocationFast } from '../../utils/geo.js';
import {
  calculateLeaveDays,
  calendarLeaveDays,
  formatLeaveDuration,
  isBalanceTrackedLeave,
  LEAVE_MAX_DAYS,
  normalizeLeaveBalance,
} from './leavePolicy.js';

// ===================== HELPERS =====================

const parseHHMM = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0;
};

const OPEN_SESSION = { $elemMatch: { 'clockIn.time': { $ne: null }, 'clockOut.time': null } };
const NO_OPEN_SESSION = { sessions: { $not: OPEN_SESSION } };
const hasOpenSession = (record) => (record.sessions || []).some((s) => s.clockIn?.time && !s.clockOut?.time);
// Lost a clock-in race: the guarded save matched nothing, a second create hit the unique index, or a transaction write conflict
const isClockInRace = (err) => err?.name === 'DocumentNotFoundError' || err?.code === 11000 || err?.code === 112;

// Shift length in hours, whether or not the record's shift is populated.
export const shiftHours = async (record) => {
  if (record.shift?.duration) return record.shift.duration;
  const id = record.shift?._id || record.shift;
  const shift = id ? await Shift.findById(id).select('duration').lean() : null;
  return shift?.duration || 8;
};

// A forgotten clock-out counts work up to that day's shift end: never later than now, never before the clock-in.
export const autoClockOutTime = (clockInTime, recordDate, shift, now = new Date()) => {
  const end = new Date(recordDate);
  const [h, m] = (shift?.endTime || '18:00').split(':').map(Number);
  end.setHours(h, m, 0, 0);
  if (shift?.startTime && shift?.endTime && parseHHMM(shift.endTime) <= parseHHMM(shift.startTime)) {
    end.setDate(end.getDate() + 1); // overnight shift ends the next morning
  }
  return new Date(Math.min(now, Math.max(end, new Date(clockInTime))));
};

export const NON_WORKING_ATTENDANCE_STATUSES = ['leave', 'holiday', 'weekend'];

export const getClockInBlockReason = (record) => {
  if (!record || !NON_WORKING_ATTENDANCE_STATUSES.includes(record.status)) return null;
  if (record.status === 'leave') return 'You have an approved leave for today';
  if (record.status === 'weekend') return 'Clock-in is not allowed on Sunday';
  if (record.status === 'holiday') {
    return record.notes ? `Today is a holiday: ${record.notes}` : 'Clock-in is not allowed on holidays';
  }
  return 'Clock-in is not allowed today';
};

export const applyWorkingDayClockInStatus = (record, isWFH) => {
  const blockReason = getClockInBlockReason(record);
  if (blockReason) {
    throw ApiError.badRequest(blockReason);
  }
  // A half day (approved half-day leave or set by an admin) stays a half day after clock-in
  if (record.status !== 'half_day') record.status = isWFH ? 'wfh' : 'present';
  return record;
};

export const parseStartOfDay = (val) => {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const d = new Date(val);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const parseEndOfDay = (val) => {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  const d = new Date(val);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Auto-migrate old-format records: if clockIn.time exists but sessions[] is empty,
// create a session from legacy fields so break/clockout work for pre-migration records.
export const ensureActiveSession = (record) => {
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

export const recalcRecordTotals = (record, shiftDuration = 8) => {
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
  } else {
    record.clockIn = {};
    record.clockOut = {};
    record.breaks = [];
    record.workHours = 0;
    record.overtime = 0;
    record.totalBreakMinutes = 0;
    record.isLate = false;
    record.lateMinutes = 0;
  }

  return record;
};

// ===================== ATTENDANCE =====================

export const clockIn = async (employeeId, data, ip) => {
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Fetch leaves, shift, today's attendance record, and holiday in parallel
    const [leavesResult, defaultShift, existingRecord, holiday] = await Promise.all([
      attendanceRepo.findAllLeaves(
        {
          employee: employeeId,
          status: 'approved',
          startDate: { $lte: parseEndOfDay(today) },
          endDate: { $gte: today },
        },
        { limit: 1 }
      ),
      attendanceRepo.findDefaultShift(),
      attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, today),
      attendanceRepo.findHolidayByDate(today),
    ]);

    if (leavesResult.leaves.length > 0) {
      throw ApiError.badRequest('You have an approved leave for today');
    }

    let shift = defaultShift;
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

    let record = existingRecord;

    if (record) {
      // Already clocked in (a double tap, or a retry after a lost reply): the punch they wanted exists.
      if (hasOpenSession(record)) {
        await mongoSession.abortTransaction();
        return record;
      }

      const blockReason = getClockInBlockReason(record);
      if (blockReason) throw ApiError.badRequest(blockReason);
    }

    // Check holiday / weekend
    if (!record) {
      if (holiday) {
        await attendanceRepo.createAttendance({
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
        throw ApiError.badRequest('Clock-in is not allowed on Sunday');
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

    // Late detection: only the day's first clock-in counts, so coming back from lunch isn't "late"
    const firstPunch = !(record.sessions || []).some((s) => s.clockIn?.time);
    const shiftStart = parseHHMM(shift.startTime);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const graceEnd = shiftStart + (shift.gracePeriod || 15);
    // Off for the first half on approved leave: arriving after shift start isn't late
    const isLate = firstPunch && nowMinutes > graceEnd && !(record.leave && record.status === 'half_day');
    const lateMinutes = isLate ? nowMinutes - graceEnd : 0;

    // Resolve location (Office geofence or Area name)
    let resolvedLocation = data?.location || {};
    if (data?.location?.lat != null && data?.location?.lng != null) {
      resolvedLocation = await resolveLocationDetails(data.location);
    }

    if (!data?.isWFH) {
      if (resolvedLocation.lat == null || resolvedLocation.lng == null) {
        throw ApiError.badRequest('Location access is required to clock in from the office. Please enable GPS.');
      }
      if (!resolvedLocation.isOffice) {
        throw ApiError.badRequest('You must be within 100 meters of the office to clock in. If you are working from home, please select the WFH option.');
      }
    }

    // Push new session
    const newSession = {
      clockIn: {
        time: now,
        ip: ip || null,
        location: resolvedLocation,
      },
      clockOut: null,
      breaks: [],
      workMinutes: 0,
      overtime: 0,
    };

    if (!record.sessions) record.sessions = [];
    record.sessions.push(newSession);
    if (firstPunch) {
      record.isLate = isLate;
      record.lateMinutes = lateMinutes;
    }
    applyWorkingDayClockInStatus(record, data?.isWFH);
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

    // Two clock-ins at once: only the save that finds no open session wins (the other gets DocumentNotFoundError)
    if (!record.isNew) record.$where = NO_OPEN_SESSION;
    await record.save({ session: mongoSession });
    await mongoSession.commitTransaction();
    return record;
  } catch (err) {
    if (mongoSession.inTransaction()) await mongoSession.abortTransaction();
    if (!isClockInRace(err)) throw err;
    // The other request clocked in first: return its record, as for any repeat clock-in
    const latest = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, new Date());
    if (latest && hasOpenSession(latest)) return latest;
    throw ApiError.conflict('Clock-in clashed with another request. Please try again.');
  } finally {
    mongoSession.endSession();
  }
};

export const clockOut = async (employeeId, location) => {
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's session only: one left open on an earlier day is closed by the auto clock-out cron at that day's shift end,
    // not here at "now" (that would count 30+ hours).
    const record = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, today);
    const activeSession = record ? ensureActiveSession(record) : null;

    if (!record || !activeSession) {
      throw ApiError.badRequest('No active clock-in session found to clock out');
    }

    const now = new Date();

    let resolvedLocation = location || {};
    if (location?.lat != null && location?.lng != null) {
      resolvedLocation = await resolveLocationDetails(location);
    }

    activeSession.clockOut = { time: now, location: resolvedLocation };

    for (const brk of activeSession.breaks) {
      if (brk.start && !brk.end) {
        brk.end = now;
        brk.duration = Math.round((now - new Date(brk.start)) / 60000);
      }
    }

    recalcRecordTotals(record, await shiftHours(record));

    const sessionIdx = record.sessions.indexOf(activeSession);
    record.events.push({
      type: 'clock_out',
      timestamp: now,
      metadata: { workHours: record.workHours, overtime: record.overtime, sessionIndex: sessionIdx },
    });

    await record.save({ session: mongoSession });
    await mongoSession.commitTransaction();
    return record;
  } catch (err) {
    await mongoSession.abortTransaction();
    throw err;
  } finally {
    mongoSession.endSession();
  }
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

  recalcRecordTotals(record, await shiftHours(record));

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
  if (query.status === 'late' || query.isLate) {
    filter.$or = [{ isLate: true }, { status: 'late' }];
  } else if (query.status === 'wfh') {
    filter.$or = [{ status: 'wfh' }, { isWFH: true }];
  } else if (query.status) {
    filter.status = query.status;
  }
  if (query.search) {
    const User = mongoose.model('User');
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    const users = await User.find({
      $or: [{ name: searchRegex }, { email: searchRegex }],
    }).select('_id');
    const ids = users.map((u) => u._id);
    if (filter.employee) {
      const empIdStr = String(filter.employee);
      if (ids.some((id) => String(id) === empIdStr)) {
        filter.employee = filter.employee;
      } else {
        filter.employee = { $in: [] };
      }
    } else {
      filter.employee = { $in: ids };
    }
  }
  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = parseStartOfDay(query.dateFrom);
    if (query.dateTo) filter.date.$lte = parseEndOfDay(query.dateTo);
  }
  const wantsMissing = query.includeMissing === 'true' && !query.employee
    && query.dateFrom === localYmd() && query.dateTo === query.dateFrom
    && (!query.status || query.status === 'not_clocked_in');
  if (wantsMissing) return listTodayWithNotClockedIn(query, filter, options);
  return attendanceRepo.findAllAttendance(filter, options);
};

const localYmd = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Today's records plus a placeholder row for each staff member with no record and no approved leave.
// `status` 'not_clocked_in' keeps only the placeholders. Records come first, then placeholders by name.
export const withNotClockedIn = (records, staff, leaveEmpIds, status, date) => {
  const seen = new Set(records.map((r) => String(r.employee?._id || r.employee)));
  const missing = staff
    .filter((u) => !seen.has(String(u._id)) && !leaveEmpIds.has(String(u._id)))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map((u) => ({ _id: `nc-${u._id}`, employee: u, date, status: 'not_clocked_in', sessions: [] }));
  return status === 'not_clocked_in' ? missing : [...records, ...missing];
};

// shortcut: merges and pages in memory (staff is one company's headcount); move to an aggregation if it reaches thousands.
const listTodayWithNotClockedIn = async (query, filter, options) => {
  const User = mongoose.model('User');
  const LeaveRequest = mongoose.model('LeaveRequest');
  const start = parseStartOfDay(query.dateFrom);
  const end = parseEndOfDay(query.dateTo);
  const staffFilter = { role: { $ne: 'client' }, isActive: { $ne: false } };
  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    staffFilter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }
  const { status, ...recordFilter } = filter;
  const [records, staff, leaves] = await Promise.all([
    status ? [] : attendanceRepo.findAttendanceForDay(recordFilter),
    User.find(staffFilter).select('_id name email avatar role').lean(),
    LeaveRequest.find({ status: 'approved', startDate: { $lte: end }, endDate: { $gte: start } }).select('employee').lean(),
  ]);
  // Who has a record at all must ignore the status filter, so fetch ids separately when only placeholders are wanted.
  const present = status
    ? await Attendance.find({ date: recordFilter.date }).select('employee').lean()
    : records;
  const leaveEmpIds = new Set(leaves.map((l) => String(l.employee)));
  const all = withNotClockedIn(present, staff, leaveEmpIds, query.status, start);

  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const total = all.length;
  const totalPages = Math.ceil(total / limit);
  return {
    records: all.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
};

export const getCalendarData = async (employeeId, year, month) => {
  return attendanceRepo.findAttendanceForCalendar(employeeId, year, month);
};

const applyOverrideToRecord = (record, shift, { status, clockInTime, clockOutTime, breakMinutes = 0, dateStr, notes, isWFH, adminId }) => {
  const isNonWorking = ['absent', 'leave', 'holiday', 'weekend'].includes(status || record.status);

  const sessions = [];
  let isLate = false;
  let lateMinutes = 0;

  if (clockInTime && !isNonWorking) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [inH, inM] = clockInTime.split(':').map(Number);
    const clockInDate = new Date(y, m - 1, d, inH, inM, 0, 0);

    let clockOutDate = null;
    let workMinutes = 0;
    let overtime = 0;

    if (clockOutTime) {
      const [outH, outM] = clockOutTime.split(':').map(Number);
      clockOutDate = new Date(y, m - 1, d, outH, outM, 0, 0);
      workMinutes = Math.max(0, Math.round((clockOutDate - clockInDate) / 60000) - Number(breakMinutes || 0));
      overtime = +(Math.max(0, (workMinutes - (shift?.duration || 8) * 60) / 60)).toFixed(2);
    }

    if (shift && shift.startTime && clockInDate) {
      const shiftStart = parseHHMM(shift.startTime);
      const inMinutes = clockInDate.getHours() * 60 + clockInDate.getMinutes();
      const graceEnd = shiftStart + (shift.gracePeriod || 15);
      isLate = inMinutes > graceEnd;
      lateMinutes = isLate ? inMinutes - graceEnd : 0;
    }

    sessions.push({
      clockIn: { time: clockInDate },
      clockOut: clockOutDate ? { time: clockOutDate } : null,
      breaks: breakMinutes > 0 ? [{
        start: clockInDate,
        end: new Date(clockInDate.getTime() + Number(breakMinutes) * 60000),
        duration: Number(breakMinutes),
      }] : [],
      workMinutes,
      overtime: +(overtime * 60).toFixed(0),
    });
  }

  // Completely wipe out previous sessions and previous breaks
  record.sessions = sessions;
  record.breaks = sessions[0]?.breaks || [];
  record.totalBreakMinutes = Number(breakMinutes || 0);

  if (sessions.length > 0) {
    const s = sessions[0];
    record.clockIn = s.clockIn || {};
    record.clockOut = s.clockOut || {};
    record.workHours = +(s.workMinutes / 60).toFixed(2);
    record.overtime = +(s.overtime / 60).toFixed(2);
    record.isLate = isLate;
    record.lateMinutes = lateMinutes;
  } else {
    record.clockIn = {};
    record.clockOut = {};
    record.workHours = 0;
    record.overtime = 0;
    record.isLate = false;
    record.lateMinutes = 0;
  }

  record.status = status || (sessions.length > 0 ? (isWFH ? 'wfh' : 'present') : record.status);
  if (notes !== undefined) record.notes = notes;
  if (isWFH !== undefined) record.isWFH = isWFH;
  record.updatedBy = adminId;
  record.events.push({
    type: 'status_change',
    timestamp: new Date(),
    metadata: { by: adminId, manualOverride: true, status: record.status },
  });

  return record;
};

export const manualOverride = async (id, data, adminId) => {
  const record = await attendanceRepo.findAttendanceById(id);
  if (!record) throw ApiError.notFound('Attendance record not found');

  let shift = record.shift;
  if (!shift || !shift.startTime) {
    shift = await attendanceRepo.findDefaultShift();
  }

  const recDate = new Date(record.date);
  const y = recDate.getFullYear();
  const m = String(recDate.getMonth() + 1).padStart(2, '0');
  const d = String(recDate.getDate()).padStart(2, '0');
  const dateStr = data.date || `${y}-${m}-${d}`;

  applyOverrideToRecord(record, shift, {
    status: data.status,
    clockInTime: data.clockInTime,
    clockOutTime: data.clockOutTime,
    breakMinutes: data.breakMinutes ?? record.totalBreakMinutes,
    dateStr,
    notes: data.notes,
    isWFH: data.isWFH,
    adminId,
  });

  await record.save();
  return record;
};

// ===================== MANUAL ENTRY =====================

export const manualEntry = async (data, adminId) => {
  const { recordId, employee, date, clockInTime, clockOutTime, breakMinutes, status, notes, isWFH } = data;
  const targetDate = parseStartOfDay(date);

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

  let record = null;
  if (recordId) {
    record = await attendanceRepo.findAttendanceById(recordId);
  }
  if (!record) {
    record = await attendanceRepo.findAttendanceByEmployeeAndDate(employee, targetDate);
  }

  if (record) {
    applyOverrideToRecord(record, shift, {
      status,
      clockInTime,
      clockOutTime,
      breakMinutes: breakMinutes ?? record.totalBreakMinutes,
      dateStr: date,
      notes,
      isWFH,
      adminId,
    });
    await record.save();
    return record;
  }

  record = new Attendance({
    employee,
    date: targetDate,
    shift: shift._id,
    createdBy: adminId,
  });

  applyOverrideToRecord(record, shift, {
    status: status || 'present',
    clockInTime,
    clockOutTime,
    breakMinutes: breakMinutes ?? 0,
    dateStr: date,
    notes,
    isWFH,
    adminId,
  });

  await record.save();
  return record;
};

// ===================== REGULARIZATION =====================

export const requestRegularization = async (employeeId, data) => {
  let record;
  if (data.attendanceId) {
    record = await attendanceRepo.findAttendanceById(data.attendanceId);
  } else if (data.date) {
    const targetDate = parseStartOfDay(data.date);
    record = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, targetDate);
    if (!record) {
      const shift = await attendanceRepo.findDefaultShift();
      if (!shift) throw ApiError.badRequest('No default shift is set up');
      record = await attendanceRepo.createAttendance({
        employee: employeeId,
        date: targetDate,
        shift: shift._id,
        status: 'absent',
        createdBy: employeeId,
      });
    }
  }
  if (!record) throw ApiError.notFound('Attendance record not found');
  const recordEmpId = record.employee?._id ? String(record.employee._id) : String(record.employee);
  if (recordEmpId !== String(employeeId)) {
    throw ApiError.forbidden('You can only regularize your own attendance');
  }
  const updatedRecord = await attendanceRepo.updateAttendance(record._id, {
    regularization: {
      request: {
        reason: data.reason,
        clockInTime: data.clockInTime || null,
        clockOutTime: data.clockOutTime || null,
        breakMinutes: Number(data.breakMinutes || 0),
        requestedAt: new Date(),
      },
      approval: { status: 'pending' },
    },
    $push: {
      events: {
        type: 'regularization_request',
        timestamp: new Date(),
        metadata: {
          reason: data.reason,
          clockInTime: data.clockInTime || null,
          clockOutTime: data.clockOutTime || null,
          breakMinutes: Number(data.breakMinutes || 0),
        },
      },
    },
  });

  // Notify admins and managers; notification/email failures must not undo a valid request.
  try {
    const User = mongoose.model('User');
    const applicant = await User.findById(employeeId).select('name email');
    const adminsAndManagers = await User.find({
      role: { $in: ['super_admin', 'admin', 'manager'] },
    }).select('_id email name');
    const attendanceDate = record.date
      ? new Date(record.date).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : 'attendance record';

    console.log(`[Regularization Apply] Notifying ${adminsAndManagers.length} admins/managers for request by ${applicant?.name}`);
    for (const manager of adminsAndManagers) {
      try {
        await createAndSend({
          recipient: manager._id,
          type: 'regularization_request',
          title: 'New Regularization Request',
          message: `${applicant?.name || 'An employee'} requested attendance regularization for ${attendanceDate}`,
          link: '/attendance/regularization',
          priority: 'high',
          referenceId: updatedRecord._id,
          referenceModel: 'Attendance',
          actionBy: employeeId,
          metadata: {
            employeeName: applicant?.name || 'Employee',
            date: attendanceDate,
            reason: data.reason,
          },
          channels: { inApp: true, email: true },
        });
      } catch (notifErr) {
        console.error(`[Regularization Notification to ${manager.name} Failed]:`, notifErr);
      }
    }
  } catch (err) {
    console.error('[Regularization Notification Error]:', err);
  }

  return updatedRecord;
};

export const approveRegularization = async (id, action, adminId, comment) => {
  const record = await attendanceRepo.findAttendanceById(id);
  if (!record) throw ApiError.notFound('Attendance record not found');
  if (record.regularization?.approval?.status !== 'pending') {
    throw ApiError.badRequest('Regularization request is not pending');
  }
  const eventType = action === 'approved' ? 'regularization_approved' : 'regularization_rejected';
  const updated = await attendanceRepo.updateAttendance(record._id, {
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
  if (action === 'approved') {
    const request = record.regularization?.request || {};
    const shift = record.shift || await attendanceRepo.findDefaultShift();
    const recordDate = new Date(record.date);
    const dateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
    const status = record.leave && record.status === 'half_day' ? 'half_day' : (record.isWFH ? 'wfh' : 'present');
    // No times asked for: only the status is reviewed, the real punches stay
    if (!request.clockInTime) {
      updated.status = status;
      updated.updatedBy = adminId;
    } else applyOverrideToRecord(updated, shift, {
      status,
      clockInTime: request.clockInTime,
      clockOutTime: request.clockOutTime,
      breakMinutes: request.breakMinutes,
      dateStr,
      notes: updated.notes,
      isWFH: updated.isWFH,
      adminId,
    });
    await updated.save();
  }
  try {
    await createAndSend({
      recipient: record.employee?._id || record.employee,
      type: eventType,
      title: action === 'approved' ? 'Regularization Approved' : 'Regularization Rejected',
      message: action === 'approved'
        ? `Your attendance regularization for ${new Date(record.date).toLocaleDateString('en-GB')} was approved by ${updated.regularization?.approval?.approvedBy?.name || 'an admin'}`
        : `Your attendance regularization for ${new Date(record.date).toLocaleDateString('en-GB')} was rejected${comment ? `: ${comment}` : ''}`,
      link: '/attendance',
      priority: 'high',
      referenceId: updated._id,
      referenceModel: 'Attendance',
      actionBy: adminId,
      metadata: {
        date: new Date(record.date).toLocaleDateString('en-GB'),
        approvedBy: updated.regularization?.approval?.approvedBy?.name || 'Admin',
        comment: comment || null,
      },
      channels: { inApp: true, email: true },
    });
  } catch (notifErr) {
    console.error('[Regularization Outcome Notification Error]:', notifErr);
  }
  return updated;
};

export const getRegularizationRequests = async (status = 'pending') =>
  attendanceRepo.findRegularizationRequests(status);

// ===================== SHIFT =====================

export const createShift = async (data, userId) => {
  if (data.isDefault) {
    await Shift.updateMany({ isDefault: true }, { isDefault: false });
  }
  return attendanceRepo.createShift({ ...data, createdBy: userId });
};

export const getShifts = async (options = {}) => {
  return attendanceRepo.findAllShifts({}, options);
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

// Working days in a leave range, holidays fetched for it. Throws when the range has none or is over the type's cap.
const leaveWorkingDays = async (start, end, halfDay, leaveType) => {
  const holidays = await Holiday.find({ date: { $gte: start, $lte: end } }).select('date').lean();
  const working = calculateLeaveDays(start, end, null, holidays.map((h) => h.date));
  if (!working) throw ApiError.badRequest('These dates are all Sundays or holidays, so no leave is needed');
  const max = LEAVE_MAX_DAYS[leaveType];
  if (max && working > max) throw ApiError.badRequest(`${leaveType[0].toUpperCase()}${leaveType.slice(1)} leave is at most ${max} working days per request`);
  return halfDay ? 0.5 : working;
};

// Reviewers can't approve or reject their own leave; only a super admin, who has no one above them, can.
export const assertNotOwnLeave = (leave, reviewer) => {
  const ownerId = leave.employee?._id || leave.employee;
  if (String(ownerId) === String(reviewer._id) && reviewer.role !== 'super_admin') {
    throw ApiError.forbidden("You can't review your own leave. Another manager or admin has to.");
  }
};

export const applyLeave = async (employeeId, data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const days = await leaveWorkingDays(start, end, data.halfDay, data.leaveType);
  const year = start.getFullYear();

  if (isBalanceTrackedLeave(data.leaveType)) {
    const balance = await getLeaveBalance(employeeId, year);
    const available = balance[data.leaveType]?.balance ?? 0;
    if (days > available) {
      throw ApiError.badRequest(
        `Insufficient ${data.leaveType} leave balance. Available: ${available} day(s). You cannot apply for ${days} day(s).`
      );
    }
  }

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
    days,
  });

  // Notify admins and managers via in-app & email
  try {
    const User = mongoose.model('User');
    const applicant = await User.findById(employeeId).select('name email role');
    const adminsAndManagers = await User.find({
      role: { $in: ['super_admin', 'admin', 'manager'] },
    }).select('_id email name');

    const durationStr = formatLeaveDuration(days, data.halfDay);
    const datesStr = `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    console.log(`[Leave Apply] Notifying ${adminsAndManagers.length} admins/managers for leave by ${applicant?.name}`);

    for (const manager of adminsAndManagers) {
      // 1. In-app & Socket notification (skip email here — we send a styled one below)
      try {
        await createAndSend({
          recipient: manager._id,
          type: 'leave_applied',
          title: 'New Leave Request',
          message: `${applicant?.name || 'An employee'} applied for ${data.leaveType.replace('_', ' ')} (${durationStr})`,
          link: '/attendance/leaves',
          priority: 'high',
          referenceId: leave._id,
          referenceModel: 'LeaveRequest',
          actionBy: employeeId,
          channels: { inApp: true, email: false },
          metadata: {
            employeeName: applicant?.name || 'Employee',
            leaveType: data.leaveType.replace('_', ' '),
            duration: durationStr,
          },
        });
        console.log(`[Leave Apply] In-app notification sent to ${manager.name} (${manager._id})`);
      } catch (notifErr) {
        console.error(`[Leave Apply] In-app notification to ${manager.name} failed:`, notifErr);
      }

      // 2. Direct styled HTML Email (separate from in-app so it always fires)
      if (manager.email) {
        try {
          await sendLeaveAppliedEmail({
            to: manager.email,
            employeeName: applicant?.name || 'An employee',
            leaveType: data.leaveType.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            dates: datesStr,
            duration: durationStr,
            reason: data.reason,
          });
          console.log(`[Leave Apply] Email sent to ${manager.email}`);
        } catch (emailErr) {
          console.error(`[Leave Apply Email to ${manager.email} Failed]:`, emailErr);
        }
      }
    }
  } catch (err) {
    console.error('[Leave Apply Notification Error]:', err);
  }

  return leave;
};

export const getLeaves = async (query, options, currentUser) => {
  const filter = {};

  const isManagerOrAdmin = ['super_admin', 'admin', 'manager'].includes(currentUser?.role);

  // If user is ordinary employee, restrict to their own records only
  if (!isManagerOrAdmin) {
    filter.employee = currentUser?._id;
  } else if (query.employee) {
    filter.employee = query.employee;
  }

  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  if (query.leaveType && query.leaveType !== 'all') {
    filter.leaveType = query.leaveType;
  }

  if (query.search && isManagerOrAdmin) {
    const User = mongoose.model('User');
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    const users = await User.find({
      $or: [{ name: searchRegex }, { email: searchRegex }],
    }).select('_id');
    const ids = users.map((u) => u._id);
    if (filter.employee) {
      const empIdStr = String(filter.employee);
      if (ids.some((id) => String(id) === empIdStr)) {
        filter.employee = filter.employee;
      } else {
        filter.employee = { $in: [] };
      }
    } else {
      filter.employee = { $in: ids };
    }
  }

  if (query.startDate || query.endDate) {
    if (query.startDate && query.endDate) {
      filter.startDate = { $lte: new Date(query.endDate + 'T23:59:59.999Z') };
      filter.endDate = { $gte: new Date(query.startDate + 'T00:00:00Z') };
    } else if (query.startDate) {
      filter.endDate = { $gte: new Date(query.startDate + 'T00:00:00Z') };
    } else if (query.endDate) {
      filter.startDate = { $lte: new Date(query.endDate + 'T23:59:59.999Z') };
    }
  }

  // Count total pending leaves
  const pendingCount = isManagerOrAdmin
    ? await attendanceRepo.countPendingLeaves()
    : await attendanceRepo.countPendingLeaves({ employee: currentUser?._id });

  const result = await attendanceRepo.findAllLeaves(filter, options);

  return {
    ...result,
    pendingCount,
  };
};

export const getLeaveById = async (id) => {
  const leave = await attendanceRepo.findLeaveById(id);
  if (!leave) throw ApiError.notFound('Leave request not found');
  return leave;
};

// Marks each working day of an approved leave on the attendance calendar.
const markLeaveDays = async (leave, start, end, employeeId, adminId) => {
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);

    if (isWeekend(date)) continue;

    const holiday = await attendanceRepo.findHolidayByDate(date);
    if (holiday) continue;

    const existing = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, date);
    if (leave.halfDay) {
      // Keep any punches already made for the half they work
      if (existing) {
        await attendanceRepo.updateAttendance(existing._id, { status: 'half_day', leave: leave._id, isLate: false, lateMinutes: 0 });
      } else {
        const shift = await attendanceRepo.findDefaultShift();
        await attendanceRepo.createAttendance({ employee: employeeId, date, shift: shift?._id, status: 'half_day', leave: leave._id, createdBy: adminId });
      }
    } else if (existing) {
      await attendanceRepo.updateAttendance(existing._id, {
        status: 'leave',
        leave: leave._id,
        sessions: [],
        clockIn: {},
        clockOut: {},
        breaks: [],
        workHours: 0,
        overtime: 0,
        totalBreakMinutes: 0,
        isLate: false,
        lateMinutes: 0,
      });
    } else {
      const shift = await attendanceRepo.findDefaultShift();
      await attendanceRepo.createAttendance({
        employee: employeeId,
        date,
        shift: shift?._id,
        status: 'leave',
        leave: leave._id,
        createdBy: adminId,
      });
    }
  }
};

export const approveLeave = async (id, reviewer, comment) => {
  const adminId = reviewer._id;
  const leave = await attendanceRepo.findLeaveById(id);
  if (!leave) throw ApiError.notFound('Leave request not found');
  if (leave.status !== 'pending') throw ApiError.badRequest('Leave already processed');
  assertNotOwnLeave(leave, reviewer);

  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  // Counted again: a holiday may have been added since the request
  const days = await leaveWorkingDays(start, end, leave.halfDay, leave.leaveType);
  const year = start.getFullYear();
  const employeeId = leave.employee?._id || leave.employee;

  // A full day off can't cover a day they already clocked in: approving would erase those punches.
  if (!leave.halfDay) {
    const worked = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: parseStartOfDay(start), $lte: parseEndOfDay(end) },
      'sessions.clockIn.time': { $ne: null },
    }).select('date').lean();
    if (worked) {
      const day = new Date(worked.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      throw ApiError.badRequest(`They already clocked in on ${day}. Reject this and ask for a half day, or correct that day first.`);
    }
  }

  let maxUsed = null;
  if (isBalanceTrackedLeave(leave.leaveType)) {
    const balance = await getLeaveBalance(employeeId, year);
    const { used = 0, balance: available = 0 } = balance[leave.leaveType] || {};
    if (days > available) {
      throw ApiError.badRequest(
        `Insufficient ${leave.leaveType} leave balance. Available: ${available} day(s). Cannot approve ${days} day(s).`
      );
    }
    maxUsed = used + available;
  }

  // Claim the request first: of two reviewers approving at once, only one gets it
  const updated = await attendanceRepo.updateLeaveStatus(id, 'approved', adminId, comment, { days });
  if (!updated) throw ApiError.badRequest('Leave already processed');

  let deducted = false;
  try {
    if (maxUsed != null) {
      deducted = !!(await attendanceRepo.updateLeaveBalance(employeeId, year, leave.leaveType, days, maxUsed));
      if (!deducted) throw ApiError.badRequest(`Insufficient ${leave.leaveType} leave balance. Cannot approve ${days} day(s).`);
    }
    await markLeaveDays(leave, start, end, employeeId, adminId);
  } catch (err) {
    // The writes aren't one transaction, so undo by hand: give the balance back and make the request pending again.
    // Days already marked keep the leave link; approving again rewrites them.
    if (deducted) await attendanceRepo.updateLeaveBalance(employeeId, year, leave.leaveType, -days);
    await attendanceRepo.updateLeaveStatus(id, 'pending', null, null, { approvedAt: null, days: leave.days ?? null }, 'approved');
    throw err;
  }

  // Notify applicant employee via In-App, Socket, and Email
  try {
    const datesStr = `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    const empId = leave.employee?._id || leave.employee;
    const User = mongoose.model('User');
    const emp = await User.findById(empId).select('email name');

    console.log(`[Leave Approve] Notifying employee ${emp?.name} (${empId}) of leave approval`);

    // 1. In-App & Socket notification (skip generic email — styled one sent below)
    try {
      await createAndSend({
        recipient: empId,
        type: 'leave_approved',
        title: 'Leave Approved',
        message: `Your ${leave.leaveType.replace('_', ' ')} request for ${datesStr} has been approved`,
        link: '/attendance/leaves',
        priority: 'high',
        referenceId: leave._id,
        referenceModel: 'LeaveRequest',
        actionBy: adminId,
        channels: { inApp: true, email: false },
        metadata: {
          leaveType: leave.leaveType.replace('_', ' '),
          dates: datesStr,
        },
      });
      console.log(`[Leave Approve] In-app notification sent to ${emp?.name}`);
    } catch (notifErr) {
      console.error(`[Leave Approve] In-app notification failed:`, notifErr);
    }

    // 2. Direct styled HTML Email
    if (emp?.email) {
      const durationStr = formatLeaveDuration(days, leave.halfDay);
      try {
        await sendLeaveApprovedEmail({
          to: emp.email,
          employeeName: emp.name || 'Employee',
          leaveType: leave.leaveType.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          dates: datesStr,
          duration: durationStr,
        });
        console.log(`[Leave Approve] Email sent to ${emp.email}`);
      } catch (emailErr) {
        console.error(`[Leave Approval Email to ${emp.email} Failed]:`, emailErr);
      }
    }
  } catch (err) {
    console.error('[Leave Approval Notification Error]:', err);
  }

  return updated;
};

export const rejectLeave = async (id, reviewer, comment) => {
  const adminId = reviewer._id;
  const leave = await attendanceRepo.findLeaveById(id);
  if (!leave) throw ApiError.notFound('Leave request not found');
  if (leave.status !== 'pending') throw ApiError.badRequest('Leave already processed');
  assertNotOwnLeave(leave, reviewer);

  const updated = await attendanceRepo.updateLeaveStatus(id, 'rejected', adminId, comment);
  if (!updated) throw ApiError.badRequest('Leave already processed');

  // Notify applicant employee via In-App, Socket, and Email
  try {
    const empId = leave.employee?._id || leave.employee;
    const User = mongoose.model('User');
    const emp = await User.findById(empId).select('email name');
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const datesStr = `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    // 1. In-App & Socket notification
    await createAndSend({
      recipient: empId,
      type: 'leave_rejected',
      title: 'Leave Rejected',
      message: `Your ${leave.leaveType.replace('_', ' ')} request was rejected: ${comment || 'No reason specified'}`,
      link: '/attendance/leaves',
      priority: 'high',
      referenceId: leave._id,
      referenceModel: 'LeaveRequest',
      actionBy: adminId,
      metadata: {
        leaveType: leave.leaveType.replace('_', ' '),
        reason: comment || 'No reason specified',
      },
    });

    // 2. Direct HTML Email
    if (emp?.email) {
      // `days` was never defined here, so the rejection email silently failed
      const durationStr = formatLeaveDuration(leave.days ?? calculateLeaveDays(start, end, leave.halfDay), leave.halfDay);
      try {
        await sendLeaveRejectedEmail({
          to: emp.email,
          employeeName: emp.name || 'Employee',
          leaveType: leave.leaveType.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          dates: datesStr,
          duration: durationStr,
          reason: comment || 'No reason specified',
        });
      } catch (emailErr) {
        console.error(`[Leave Rejection Email to ${emp.email} Failed]:`, emailErr);
      }
    }
  } catch (err) {
    console.error('[Leave Rejection Notification Error]:', err);
  }

  return updated;
};

const LEAVE_REVIEWER_ROLES = ['super_admin', 'admin', 'manager'];

// Who may cancel: the employee (own pending any time, own approved only before it starts) or a reviewer
// (pending or approved from today on). Nobody cancels leave that started before today: its days are already settled.
export const canCancelLeave = (leave, user, todayStr) => {
  const ownerId = leave.employee?._id || leave.employee;
  const isOwner = String(ownerId) === String(user._id);
  const isReviewer = LEAVE_REVIEWER_ROLES.includes(user.role);
  if (!isOwner && !isReviewer) return 'You can only cancel your own leave';
  if (leave.status === 'cancelled') return 'This leave is already cancelled';
  if (leave.status === 'rejected') return "Rejected leave doesn't need to be cancelled";
  if (leave.status === 'pending' && isOwner) return null;
  // Leave dates are stored as UTC midnight of the chosen day
  const startStr = new Date(leave.startDate).toISOString().slice(0, 10);
  if (startStr < todayStr) return "Leave that started before today can't be cancelled";
  if (startStr === todayStr && !isReviewer) return 'This leave has already started. Ask your manager to cancel it.';
  return null;
};

export const cancelLeave = async (id, user) => {
  const leave = await attendanceRepo.findLeaveById(id);
  if (!leave) throw ApiError.notFound('Leave request not found');

  const now = new Date();
  // Today in India, not in the server's timezone
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const blocked = canCancelLeave(leave, user, todayStr);
  if (blocked) throw ApiError.badRequest(blocked);

  const employeeId = leave.employee?._id || leave.employee;
  const wasApproved = leave.status === 'approved';
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);

  leave.status = 'cancelled';
  leave.cancelledBy = user._id;
  leave.cancelledAt = now;
  await leave.save();

  if (wasApproved) {
    // Give back exactly what approval took: the stored count, or calendar days for leave approved before it was stored
    await attendanceRepo.updateLeaveBalance(employeeId, start.getFullYear(), leave.leaveType, -(leave.days ?? calendarLeaveDays(start, end, leave.halfDay)));

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const records = await Attendance.find({ leave: leave._id });
    for (const rec of records) {
      if (rec.sessions?.length) {
        // They worked part of the day: it's an ordinary working day again
        rec.status = rec.isWFH ? 'wfh' : 'present';
        rec.leave = null;
        await rec.save();
      } else if (rec.date >= todayStart) {
        // Today or later: remove so clock-in and the nightly job treat it as a normal day
        await Attendance.deleteOne({ _id: rec._id });
      } else {
        rec.status = 'absent';
        rec.leave = null;
        await rec.save();
      }
    }
  }

  // Employee cancelled: tell reviewers. Reviewer cancelled: tell the employee.
  try {
    const User = mongoose.model('User');
    const isOwner = String(employeeId) === String(user._id);
    const recipients = isOwner
      ? (await User.find({ role: { $in: LEAVE_REVIEWER_ROLES }, _id: { $ne: user._id } }).select('_id')).map((u) => u._id)
      : [employeeId];
    const datesStr = `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    const employeeName = leave.employee?.name || 'An employee';
    const leaveType = leave.leaveType.replace('_', ' ');
    for (const recipient of recipients) {
      await createAndSend({
        recipient,
        type: 'leave_cancelled',
        title: 'Leave Cancelled',
        message: isOwner
          ? `${employeeName} cancelled their ${leaveType} leave for ${datesStr}`
          : `Your ${leaveType} leave for ${datesStr} was cancelled by ${user.name || 'a manager'}`,
        link: '/attendance/leaves',
        priority: 'medium',
        referenceId: leave._id,
        referenceModel: 'LeaveRequest',
        actionBy: user._id,
        channels: { inApp: true, email: false },
        metadata: { employeeName, leaveType, dates: datesStr },
      }).catch((err) => console.error('[Leave Cancel] Notification failed:', err));
    }
  } catch (err) {
    console.error('[Leave Cancel Notification Error]:', err);
  }

  return leave;
};

export const getLeaveBalance = async (employeeId, year = new Date().getFullYear()) => {
  let balance = await attendanceRepo.findLeaveBalance(employeeId, year);

  if (!balance) {
    balance = await attendanceRepo.createLeaveBalance({
      employee: employeeId,
      year,
      ...normalizeLeaveBalance({}, year),
    });
  } else {
    normalizeLeaveBalance(balance, year);
    if (balance.isModified()) await balance.save();
  }

  return balance;
};

// ===================== HOLIDAY =====================

export const createHoliday = async (data, userId) => {
  const existing = await attendanceRepo.findHolidayByDate(data.date);
  if (existing) throw ApiError.conflict('Holiday already exists for this date');

  return attendanceRepo.createHoliday({ ...data, date: new Date(data.date), createdBy: userId });
};

export const getHolidays = async (year, options = {}) => {
  return attendanceRepo.findAllHolidays(year, options);
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

export const getDailyReport = async (date, options = {}) => {
  return attendanceRepo.getDailyReport(date || new Date(), options);
};

export const getWeeklyReport = async (startDate, options = {}) => {
  const start = new Date(`${startDate}T00:00:00`);
  if (!startDate || Number.isNaN(start.getTime())) {
    throw ApiError.badRequest('A valid weekly report start date is required');
  }
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return attendanceRepo.getWeeklyReport(start, end, options);
};

export const getMonthlyReport = async (year, month, options = {}) => {
  return attendanceRepo.getMonthlyReport(year, month, options);
};

export const getStats = async (employeeId, dateFrom, dateTo) => {
  let from = dateFrom ? parseStartOfDay(dateFrom) : null;
  let to = dateTo ? parseEndOfDay(dateTo) : null;

  if (!from && !to) {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (from && !to) {
    to = new Date();
    to.setHours(23, 59, 59, 999);
  } else if (!from && to) {
    from = new Date(to.getFullYear(), to.getMonth(), 1, 0, 0, 0, 0);
  }

  const records = await attendanceRepo.findAttendanceForStats(employeeId, from, to);

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

// ===================== DAILY OVERVIEW STATS =====================

export const getDailyOverviewStats = async (dateParam) => {
  const User = mongoose.model('User');
  const Attendance = mongoose.model('Attendance');
  const LeaveRequest = mongoose.model('LeaveRequest');

  // Every staff login counts (admins clock in too); only client logins are excluded
  const staff = await User.find({
    role: { $ne: 'client' },
    isActive: { $ne: false },
  }).select('_id name email role');

  const totalEmployees = staff.length;
  const staffIds = staff.map((s) => s._id);

  // Parse target date (default to today)
  let targetDateStr = dateParam;
  if (!targetDateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    targetDateStr = `${y}-${m}-${d}`;
  }

  const startOfDay = parseStartOfDay(targetDateStr);
  const endOfDay = parseEndOfDay(targetDateStr);

  const records = await Attendance.find({
    employee: { $in: staffIds },
    date: { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  const approvedLeaves = await LeaveRequest.find({
    employee: { $in: staffIds },
    status: 'approved',
    startDate: { $lte: endOfDay },
    endDate: { $gte: startOfDay },
  }).lean();

  const presentEmpIds = new Set();
  const wfhEmpIds = new Set();
  const leaveEmpIds = new Set();
  const lateEmpIds = new Set();

  for (const rec of records) {
    const empIdStr = String(rec.employee);
    if (rec.status === 'present' || rec.status === 'wfh' || rec.status === 'half_day') {
      presentEmpIds.add(empIdStr);
      if (rec.isWFH || rec.status === 'wfh') {
        wfhEmpIds.add(empIdStr);
      }
      if (rec.isLate) {
        lateEmpIds.add(empIdStr);
      }
    } else if (rec.status === 'leave') {
      leaveEmpIds.add(empIdStr);
    }
  }

  for (const leave of approvedLeaves) {
    const empIdStr = String(leave.employee);
    if (!presentEmpIds.has(empIdStr)) {
      leaveEmpIds.add(empIdStr);
    }
  }

  const presentCount = presentEmpIds.size;
  const wfhCount = wfhEmpIds.size;
  const leaveCount = leaveEmpIds.size;
  const lateCount = lateEmpIds.size;
  const absentCount = Math.max(0, totalEmployees - presentCount - leaveCount);

  return {
    date: targetDateStr,
    totalEmployees,
    presentCount,
    wfhCount,
    leaveCount,
    absentCount,
    lateCount,
  };
};
