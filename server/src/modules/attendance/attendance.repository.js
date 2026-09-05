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
  })
    .populate('shift')
    .populate('leave', 'leaveType startDate endDate status');
};

export const createAttendance = async (data) => {
  return Attendance.create(data);
};

export const updateAttendance = async (id, data) => {
  return Attendance.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('shift');
};

export const findAllAttendance = async (filter, options = {}) => {
  const { page = 1, limit = 10, sort = '-date' } = options;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('employee', 'name email avatar role')
      .populate('shift', 'name startTime endTime')
      .populate('regularization.approval.approvedBy', 'name email')
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

export const findRegularizationRequests = async (status = 'pending') => {
  const filter = status === 'all'
    ? { 'regularization.approval.status': { $in: ['pending', 'approved', 'rejected'] } }
    : { 'regularization.approval.status': status };
  return Attendance.find(filter)
    .sort({ 'regularization.request.requestedAt': -1, date: -1 })
    .limit(100)
    .populate('employee', 'name email avatar role')
    .populate('shift', 'name startTime endTime duration')
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

export const findAllShifts = async (filter = {}, options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
  const query = { isActive: true, ...filter };
  const [records, total] = await Promise.all([
    Shift.find(query).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    Shift.countDocuments(query),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    records,
    pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
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
  const { page = 1, limit = 10 } = options;
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

export const countPendingLeaves = async (filter = {}) => {
  return LeaveRequest.countDocuments({ status: 'pending', ...filter });
};

export { LeaveRequest };

// ===================== HOLIDAY =====================

export const createHoliday = async (data) => {
  return Holiday.create(data);
};

export const findHolidayById = async (id) => {
  return Holiday.findById(id);
};

export const findAllHolidays = async (year, options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
  const filter = {};
  if (year) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    filter.date = { $gte: startOfYear, $lte: endOfYear };
  }
  const [records, total] = await Promise.all([
    Holiday.find(filter).sort({ date: 1 }).skip((page - 1) * limit).limit(limit),
    Holiday.countDocuments(filter),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    records,
    pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
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

const findPaginatedReport = async (filter, options = {}, sort = { date: -1 }) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
  const [records, total, employees, statusCounts, workSummary, topHours] = await Promise.all([
    Attendance.find(filter)
      .populate('employee', 'name email avatar role')
      .populate('shift', 'name startTime endTime')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Attendance.countDocuments(filter),
    Attendance.distinct('employee', filter),
    Attendance.aggregate([
      { $match: filter },
      { $group: { _id: '$status', value: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        workedRecords: { $sum: { $cond: [{ $gt: [{ $ifNull: ['$workHours', 0] }, 0] }, 1, 0] } },
        workedHours: { $sum: { $cond: [{ $gt: [{ $ifNull: ['$workHours', 0] }, 0] }, { $ifNull: ['$workHours', 0] }, 0] } },
      } },
    ]),
    Attendance.aggregate([
      { $match: filter },
      { $group: { _id: '$employee', hours: { $sum: { $ifNull: ['$workHours', 0] } } } },
      { $match: { hours: { $gt: 0 } } },
      { $sort: { hours: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'employee' } },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, name: { $ifNull: ['$employee.name', 'Unknown employee'] }, hours: 1 } },
    ]),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    records,
    pagination: {
      page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1,
      summary: {
        totalEmployees: employees.length,
        totalRecords: total,
        presentRecords: statusCounts.filter((item) => ['present', 'wfh', 'late', 'half_day'].includes(item._id)).reduce((sum, item) => sum + item.value, 0),
        absentRecords: statusCounts.find((item) => item._id === 'absent')?.value || 0,
        leaveRecords: statusCounts.find((item) => item._id === 'leave')?.value || 0,
        workedRecords: workSummary[0]?.workedRecords || 0,
        workedHours: workSummary[0]?.workedHours || 0,
        statusDistribution: statusCounts.map(({ _id, value }) => ({ status: _id || 'unknown', value })),
        employeeHours: topHours,
      },
    },
  };
};

export const getDailyReport = async (date, options = {}) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return findPaginatedReport({
    date: { $gte: startOfDay, $lte: endOfDay },
  }, options, { 'employee.name': 1 });
};

export const getWeeklyReport = async (startDate, endDate, options = {}) => {
  return findPaginatedReport({
    date: { $gte: startDate, $lte: endDate },
  }, options, { employee: 1, date: 1 });
};

export const getMonthlyReport = async (year, month, options = {}) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  return findPaginatedReport({
    date: { $gte: startOfMonth, $lte: endOfMonth },
  }, options, { date: -1, 'employee.name': 1 });
};
