import User from '../auth/auth.model.js';
import { Attendance, Holiday, LeaveRequest } from '../attendance/attendance.model.js';
import { PayrollRun, SalarySlip } from './payroll.model.js';

export const STAFF_ROLES = ['admin', 'manager', 'employee'];

export const findStaffUsers = async () =>
  User.find({ role: { $in: STAFF_ROLES } })
    .select('_id name email role avatar isActive')
    .sort({ name: 1 })
    .lean();

export const findRunByPeriod = async (year, month) =>
  PayrollRun.findOne({ year, month });

export const findRunById = async (id) =>
  PayrollRun.findById(id);

export const listRuns = async (year) => {
  const filter = year ? { year } : {};
  return PayrollRun.find(filter).sort({ year: -1, month: -1 });
};

export const createRun = async (data) => PayrollRun.create(data);

export const updateRun = async (id, data) =>
  PayrollRun.findByIdAndUpdate(id, data, { new: true, runValidators: true });

export const deleteRun = async (id) => PayrollRun.findByIdAndDelete(id);

export const deleteSlipsForRun = async (runId) => SalarySlip.deleteMany({ payrollRun: runId });

export const createSlips = async (slips) => SalarySlip.insertMany(slips);

export const findSlipsForRun = async (runId) =>
  SalarySlip.find({ payrollRun: runId }).sort({ employeeName: 1 });

export const findSlipById = async (id) => SalarySlip.findById(id);

export const findSlipWithRun = async (id) =>
  SalarySlip.findById(id).populate('payrollRun');

export const findSlipsForEmployee = async (employeeId) =>
  SalarySlip.find({ employee: employeeId, status: 'finalized' })
    .sort({ periodStart: -1 })
    .populate('payrollRun', 'year month status revision finalizedAt');

export const updateSlipsStatus = async (runId, status) =>
  SalarySlip.updateMany({ payrollRun: runId }, { status });

export const existsSlipForEmployee = async (employeeId) =>
  Boolean(await SalarySlip.exists({ employee: employeeId }));

export const findAttendanceForRange = async (start, end) =>
  Attendance.find({ date: { $gte: start, $lte: end } })
    .select('employee date status')
    .lean();

export const findHolidaysForRange = async (start, end) =>
  Holiday.find({ date: { $gte: start, $lte: end } })
    .select('date name')
    .lean();

export const findPendingLeavesForRange = async (start, end) =>
  LeaveRequest.find({
    status: 'pending',
    startDate: { $lte: end },
    endDate: { $gte: start },
  })
    .select('employee leaveType startDate endDate')
    .lean();
