import ApiResponse from '../../utils/ApiResponse.js';
import * as attendanceService from './attendance.service.js';

// ===================== ATTENDANCE =====================

export const clockIn = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress;
    const record = await attendanceService.clockIn(req.user._id, req.body, ip);
    ApiResponse.success(res, 200, { attendance: record }, 'Clocked in successfully');
  } catch (error) {
    next(error);
  }
};

export const clockOut = async (req, res, next) => {
  try {
    const record = await attendanceService.clockOut(req.user._id);
    ApiResponse.success(res, 200, { attendance: record }, 'Clocked out successfully');
  } catch (error) {
    next(error);
  }
};

export const startBreak = async (req, res, next) => {
  try {
    const record = await attendanceService.startBreak(req.user._id);
    ApiResponse.success(res, 200, { attendance: record }, 'Break started');
  } catch (error) {
    next(error);
  }
};

export const endBreak = async (req, res, next) => {
  try {
    const record = await attendanceService.endBreak(req.user._id);
    ApiResponse.success(res, 200, { attendance: record }, 'Break ended');
  } catch (error) {
    next(error);
  }
};

export const getTodayStatus = async (req, res, next) => {
  try {
    const employeeId = req.query.employee || req.user._id;
    const record = await attendanceService.getTodayStatus(employeeId);
    ApiResponse.success(res, 200, { attendance: record });
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const result = await attendanceService.getAttendanceList(req.query, {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
    });
    ApiResponse.paginated(res, result.records, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const calendar = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const records = await attendanceService.getCalendarData(employeeId, year, month);
    ApiResponse.success(res, 200, { records });
  } catch (error) {
    next(error);
  }
};

export const stats = async (req, res, next) => {
  try {
    const employeeId = req.query.employee || req.user._id;
    const { dateFrom, dateTo } = req.query;
    const result = await attendanceService.getStats(employeeId, dateFrom, dateTo);
    ApiResponse.success(res, 200, result);
  } catch (error) {
    next(error);
  }
};

export const manualOverride = async (req, res, next) => {
  try {
    const record = await attendanceService.manualOverride(req.params.id, req.body, req.user._id);
    ApiResponse.success(res, 200, { attendance: record }, 'Attendance updated');
  } catch (error) {
    next(error);
  }
};

// ===================== REGULARIZATION =====================

export const requestRegularization = async (req, res, next) => {
  try {
    const record = await attendanceService.requestRegularization(req.user._id, req.body);
    ApiResponse.success(res, 200, { attendance: record }, 'Regularization requested');
  } catch (error) {
    next(error);
  }
};

export const approveRegularization = async (req, res, next) => {
  try {
    const { action, comment } = req.body;
    const record = await attendanceService.approveRegularization(
      req.params.id,
      action,
      req.user._id,
      comment
    );
    ApiResponse.success(res, 200, { attendance: record }, `Regularization ${action}`);
  } catch (error) {
    next(error);
  }
};

// ===================== SHIFT =====================

export const createShift = async (req, res, next) => {
  try {
    const shift = await attendanceService.createShift(req.body, req.user._id);
    ApiResponse.created(res, { shift }, 'Shift created successfully');
  } catch (error) {
    next(error);
  }
};

export const listShifts = async (req, res, next) => {
  try {
    const shifts = await attendanceService.getShifts();
    ApiResponse.success(res, 200, { shifts });
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req, res, next) => {
  try {
    const shift = await attendanceService.updateShift(req.params.id, req.body);
    ApiResponse.success(res, 200, { shift }, 'Shift updated');
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req, res, next) => {
  try {
    await attendanceService.deleteShift(req.params.id);
    ApiResponse.success(res, 200, null, 'Shift deleted');
  } catch (error) {
    next(error);
  }
};

// ===================== LEAVE =====================

export const applyLeave = async (req, res, next) => {
  try {
    const leave = await attendanceService.applyLeave(req.user._id, req.body);
    ApiResponse.created(res, { leave }, 'Leave applied successfully');
  } catch (error) {
    next(error);
  }
};

export const listLeaves = async (req, res, next) => {
  try {
    const result = await attendanceService.getLeaves(req.query, {
      page: req.query.page,
      limit: req.query.limit,
    });
    ApiResponse.paginated(res, result.leaves, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getLeaveById = async (req, res, next) => {
  try {
    const leave = await attendanceService.getLeaveById(req.params.id);
    ApiResponse.success(res, 200, { leave });
  } catch (error) {
    next(error);
  }
};

export const approveLeave = async (req, res, next) => {
  try {
    const leave = await attendanceService.approveLeave(req.params.id, req.user._id, req.body.comment);
    ApiResponse.success(res, 200, { leave }, 'Leave approved');
  } catch (error) {
    next(error);
  }
};

export const rejectLeave = async (req, res, next) => {
  try {
    const leave = await attendanceService.rejectLeave(req.params.id, req.user._id, req.body.comment);
    ApiResponse.success(res, 200, { leave }, 'Leave rejected');
  } catch (error) {
    next(error);
  }
};

export const getLeaveBalance = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId || req.user._id;
    const balance = await attendanceService.getLeaveBalance(employeeId);
    ApiResponse.success(res, 200, { balance });
  } catch (error) {
    next(error);
  }
};

// ===================== HOLIDAY =====================

export const createHoliday = async (req, res, next) => {
  try {
    const holiday = await attendanceService.createHoliday(req.body, req.user._id);
    ApiResponse.created(res, { holiday }, 'Holiday created');
  } catch (error) {
    next(error);
  }
};

export const listHolidays = async (req, res, next) => {
  try {
    const holidays = await attendanceService.getHolidays(req.query.year);
    ApiResponse.success(res, 200, { holidays });
  } catch (error) {
    next(error);
  }
};

export const updateHoliday = async (req, res, next) => {
  try {
    const holiday = await attendanceService.updateHoliday(req.params.id, req.body);
    ApiResponse.success(res, 200, { holiday }, 'Holiday updated');
  } catch (error) {
    next(error);
  }
};

export const deleteHoliday = async (req, res, next) => {
  try {
    await attendanceService.deleteHoliday(req.params.id);
    ApiResponse.success(res, 200, null, 'Holiday deleted');
  } catch (error) {
    next(error);
  }
};

// ===================== REPORTS =====================

export const dailyReport = async (req, res, next) => {
  try {
    const records = await attendanceService.getDailyReport(req.query.date);
    ApiResponse.success(res, 200, { records });
  } catch (error) {
    next(error);
  }
};

export const weeklyReport = async (req, res, next) => {
  try {
    const records = await attendanceService.getWeeklyReport(req.query.startDate);
    ApiResponse.success(res, 200, { records });
  } catch (error) {
    next(error);
  }
};

export const monthlyReport = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const records = await attendanceService.getMonthlyReport(year, month);
    ApiResponse.success(res, 200, { records });
  } catch (error) {
    next(error);
  }
};

export const bulkImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 400, 'Please upload a CSV file');
    }
    const result = await attendanceService.bulkImport(req.body.records || [], req.user._id);
    ApiResponse.success(res, 200, result, `Import complete: ${result.imported} imported, ${result.skipped} skipped`);
  } catch (error) {
    next(error);
  }
};
