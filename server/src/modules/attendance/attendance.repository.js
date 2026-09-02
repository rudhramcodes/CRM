import {
  Attendance,
  Shift,
  LeaveRequest,
  Holiday,
  LeaveBalance,
} from './attendance.model.js';

// ===================== ATTENDANCE =====================

export const findAttendanceByEmployeeAndDate = async (employeeId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return Attendance.findOne({
    employee: employeeId,
    date: { $gte: startOfDay, $lte: endOfDay },
  }).populate('shift');
};

export const createAttendance = async (data) => {
  return Attendance.create(data);
};

export const updateAttendance = async (id, data) => {
  return Attendance.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('shift');
};

export const findAllAttendance = async (filter, options = {}) => {
  const { page = 1, limit = 20, sort = '-date' } = options;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('employee', 'name email avatar role')
      .populate('shift', 'name startTime endTime')
      .populate('leave'),
    Attendance.countDocuments(filter),
  ]);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
};

export const findAttendanceById = async (id) => {
  return Attendance.findById(id)
    .populate('employee', 'name email avatar role')
    .populate('shift', 'name startTime endTime duration gracePeriod')
    .populate('leave')
    .populate('regularization.approval.approvedBy', 'name email');
};

export const findAttendanceForCalendar = async (employeeId, year, month) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  return Attendance.find({
    employee: employeeId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  })
    .populate('shift', 'name startTime endTime')
    .sort({ date: 1 });
};

export const findAttendanceForStats = async (employeeId, dateFrom, dateTo) => {
  return Attendance.find({
    employee: employeeId,
    date: { $gte: dateFrom, $lte: dateTo },
  }).sort({ date: 1 });
};

export const findTodayNotClockedIn = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return Attendance.find({
    date: { $gte: today, $lt: tomorrow },
    'clockIn.time': { $exists: false },
  }).populate('employee', 'name email');
};

export const findClockedInNotOut = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return Attendance.find({
    date: { $gte: today, $lt: tomorrow },
    'clockIn.time': { $exists: true, $ne: null },
    'clockOut.time': { $exists: false },
  }).populate('employee', 'name email').populate('shift');
};

export const findMissingAttendance = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return Attendance.find({
    date: { $gte: today, $lt: tomorrow },
    status: { $ne: 'absent' },
    'clockIn.time': { $exists: false },
  }).populate('employee', 'name email');
};

// ===================== SHIFT =====================

export const createShift = async (data) => {
  return Shift.create(data);
};

export const findShiftById = async (id) => {
  return Shift.findById(id);
};

export const findAllShifts = async (filter = {}) => {
  return Shift.find({ isActive: true, ...filter }).sort({ name: 1 });
};

export const updateShift = async (id, data) => {
  return Shift.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteShift = async (id) => {
  return Shift.findByIdAndDelete(id);
};

export const findDefaultShift = async () => {
  return Shift.findOne({ isDefault: true, isActive: true });
};

// ===================== LEAVE REQUEST =====================

export const createLeaveRequest = async (data) => {
  return LeaveRequest.create(data);
};

export const findLeaveById = async (id) => {
  return LeaveRequest.findById(id)
    .populate('employee', 'name email avatar role')
    .populate('approvedBy', 'name email');
};

export const findAllLeaves = async (filter, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [leaves, total] = await Promise.all([
    LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('employee', 'name email avatar role')
      .populate('approvedBy', 'name email'),
    LeaveRequest.countDocuments(filter),
  ]);

  return {
    leaves,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
};

export const updateLeaveStatus = async (id, status, approvedBy, comment) => {
  return LeaveRequest.findByIdAndUpdate(
    id,
    { status, approvedBy, approvedAt: new Date(), comment },
    { new: true, runValidators: true }
  ).populate('employee', 'name email avatar role');
};

// ===================== HOLIDAY =====================

export const createHoliday = async (data) => {
  return Holiday.create(data);
};

export const findHolidayById = async (id) => {
  return Holiday.findById(id);
};

export const findAllHolidays = async (year) => {
  const filter = {};
  if (year) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    filter.date = { $gte: startOfYear, $lte: endOfYear };
  }
  return Holiday.find(filter).sort({ date: 1 });
};

export const findHolidayByDate = async (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const nextDay = new Date(d);
  nextDay.setDate(nextDay.getDate() + 1);
  return Holiday.findOne({ date: { $gte: d, $lt: nextDay } });
};

export const updateHoliday = async (id, data) => {
  return Holiday.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteHoliday = async (id) => {
  return Holiday.findByIdAndDelete(id);
};

// ===================== LEAVE BALANCE =====================

export const findLeaveBalance = async (employeeId, year) => {
  return LeaveBalance.findOne({ employee: employeeId, year });
};

export const createLeaveBalance = async (data) => {
  return LeaveBalance.create(data);
};

export const updateLeaveBalance = async (employeeId, year, leaveType, days) => {
  const balance = await LeaveBalance.findOne({ employee: employeeId, year });
  if (!balance) return null;

  balance[leaveType].used += days;
  balance[leaveType].balance = balance[leaveType].total - balance[leaveType].used;
  return balance.save();
};

// ===================== REPORTS =====================

export const getDailyReport = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return Attendance.find({
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate('employee', 'name email avatar role')
    .populate('shift', 'name startTime endTime')
    .sort({ 'employee.name': 1 });
};

export const getWeeklyReport = async (startDate, endDate) => {
  return Attendance.find({
    date: { $gte: startDate, $lte: endDate },
  })
    .populate('employee', 'name email avatar role')
    .sort({ employee: 1, date: 1 });
};

export const getMonthlyReport = async (year, month) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  return Attendance.find({
    date: { $gte: startOfMonth, $lte: endOfMonth },
  })
    .populate('employee', 'name email avatar role')
    .populate('shift', 'name startTime endTime')
    .sort({ date: -1, 'employee.name': 1 });
};
