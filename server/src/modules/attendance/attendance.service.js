import mongoose from 'mongoose';
import ApiError from '../../utils/ApiError.js';
import * as attendanceRepo from './attendance.repository.js';
import { Shift, Attendance } from './attendance.model.js';
import { escapeRegex } from '../../utils/pagination.js';
import { createAndSend } from '../notifications/notification.service.js';
import {
  sendLeaveAppliedEmail,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
} from '../../services/emailService.js';
import { resolveLocationDetails } from '../../utils/geo.js';

// ===================== HELPERS =====================

const parseHHMM = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0;
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
  record.status = isWFH ? 'wfh' : 'present';
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

    // Cover the full local calendar day so date-only leave bounds still match
    const leaves = await attendanceRepo.findAllLeaves(
      {
        employee: employeeId,
        status: 'approved',
        startDate: { $lte: parseEndOfDay(today) },
        endDate: { $gte: today },
      },
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

      const blockReason = getClockInBlockReason(record);
      if (blockReason) throw ApiError.badRequest(blockReason);
    }

    // Check holiday / weekend
    if (!record) {
      const holiday = await attendanceRepo.findHolidayByDate(today);
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

    // Late detection
    const shiftStart = parseHHMM(shift.startTime);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const graceEnd = shiftStart + (shift.gracePeriod || 15);
    const isLate = nowMinutes > graceEnd;
    const lateMinutes = isLate ? nowMinutes - graceEnd : 0;

    // Resolve location (Office geofence or Area name)
    let resolvedLocation = data?.location || {};
    if (data?.location?.lat != null && data?.location?.lng != null) {
      resolvedLocation = await resolveLocationDetails(data.location);
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
    record.isLate = isLate;
    record.lateMinutes = lateMinutes;
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

export const clockOut = async (employeeId, location) => {
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await attendanceRepo.findAttendanceByEmployeeAndDate(employeeId, today);
    if (!record) throw ApiError.badRequest('You have not clocked in today');

    const activeSession = ensureActiveSession(record);
    if (!activeSession) throw ApiError.badRequest('No active session to clock out');

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

    let shiftDuration = 8;
    if (record.shift?.duration) shiftDuration = record.shift.duration;
    else if (record.shift?._id) {
      const shift = await attendanceRepo.findShiftById(record.shift._id);
      if (shift) shiftDuration = shift.duration;
    }

    recalcRecordTotals(record, shiftDuration);

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
  return attendanceRepo.findAllAttendance(filter, options);
};

export const getCalendarData = async (employeeId, year, month) => {
  return attendanceRepo.findAttendanceForCalendar(employeeId, year, month);
};

const applyOverrideToRecord = (record, shift, { status, clockInTime, clockOutTime, dateStr, notes, isWFH, adminId }) => {
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
      workMinutes = Math.max(0, Math.round((clockOutDate - clockInDate) / 60000));
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
      breaks: [],
      workMinutes,
      overtime: +(overtime * 60).toFixed(0),
    });
  }

  // Completely wipe out previous sessions and previous breaks
  record.sessions = sessions;
  record.breaks = [];
  record.totalBreakMinutes = 0;

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
  const { recordId, employee, date, clockInTime, clockOutTime, status, notes, isWFH } = data;
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

  // Notify admins and managers via in-app & email
  try {
    const User = mongoose.model('User');
    const applicant = await User.findById(employeeId).select('name email role');
    const adminsAndManagers = await User.find({
      role: { $in: ['super_admin', 'admin', 'manager'] },
    }).select('_id email name');

    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const durationStr = `${durationDays} ${durationDays === 1 ? 'day' : 'days'}`;
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

    const empId = leave.employee?._id || leave.employee;
    const existing = await attendanceRepo.findAttendanceByEmployeeAndDate(empId, date);
    if (existing) {
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
        employee: empId,
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
      const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const durationStr = `${durationDays} ${durationDays === 1 ? 'day' : 'days'}`;
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

export const rejectLeave = async (id, adminId, comment) => {
  const leave = await attendanceRepo.findLeaveById(id);
  if (!leave) throw ApiError.notFound('Leave request not found');
  if (leave.status !== 'pending') throw ApiError.badRequest('Leave already processed');

  const updated = await attendanceRepo.updateLeaveStatus(id, 'rejected', adminId, comment);

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
      const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const durationStr = `${durationDays} ${durationDays === 1 ? 'day' : 'days'}`;
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

  // Only employee and manager roles count towards total staff
  const targetRoles = ['employee', 'manager'];
  const staff = await User.find({
    role: { $in: targetRoles },
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
    if (rec.status === 'present' || rec.status === 'wfh') {
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
