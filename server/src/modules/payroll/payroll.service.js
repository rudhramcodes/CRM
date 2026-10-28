import ApiError from '../../utils/ApiError.js';
import { isPayrollAdmin } from '../../utils/payrollAccess.js';
import logger from '../../utils/logger.js';
import * as employeeService from '../employees/employee.service.js';
import * as payrollRepository from './payroll.repository.js';

export const PAYROLL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const dateKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calendarDaysBetween = (from, to) =>
  Math.max(0, Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS));

export const getPayrollPeriod = (year, month) => {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw ApiError.badRequest('Invalid payroll year');
  if (!Number.isInteger(m) || m < 1 || m > 12) throw ApiError.badRequest('Invalid payroll month');
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const lastDay = new Date(y, m, 0);
  const end = new Date(y, m - 1, lastDay.getDate(), 23, 59, 59, 999);
  const label = start.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  return { year: y, month: m, start, end, endOfDay: startOfDay(lastDay), label };
};

export const isWeekend = (date) => new Date(date).getDay() === 0;

const assertPayrollAdmin = (requester) => {
  if (!isPayrollAdmin(requester)) throw ApiError.forbidden('You do not have permission to manage payroll');
};

const bankDetailsComplete = (compensation) =>
  Boolean(compensation?.bankName && compensation?.bankAccountNumber && compensation?.ifscCode);

export const calculateSalarySlip = ({
  user,
  profile,
  compensation,
  attendance = [],
  holidayDates = new Set(),
  pendingLeaves = [],
  period,
}) => {
  const issues = [];
  const employeeId = profile?.employeeId || null;
  const dateOfJoining = profile?.dateOfJoining || null;
  const dateOfLeaving = profile?.dateOfLeaving || null;
  const monthlySalary = round2(compensation?.monthlyGrossSalary || 0);
  const salaryEffectiveFrom = compensation?.salaryEffectiveFrom
    ? startOfDay(compensation.salaryEffectiveFrom)
    : null;

  if (!employeeId) issues.push('Employee ID is missing');
  if (!dateOfJoining) issues.push('Date of joining is missing');
  if (monthlySalary <= 0) issues.push('Monthly gross salary is not configured');
  if (salaryEffectiveFrom && salaryEffectiveFrom > period.end) {
    issues.push('Salary is not effective for this payroll period');
  } else if (
    salaryEffectiveFrom
    && salaryEffectiveFrom > period.start
    && (!dateOfJoining || salaryEffectiveFrom > startOfDay(dateOfJoining))
  ) {
    issues.push('Mid-month salary changes are not supported; set the effective date to the period start or next month');
  }
  if (!bankDetailsComplete(compensation)) issues.push('Bank details are incomplete');
  if (pendingLeaves.length) {
    issues.push(`${pendingLeaves.length} pending leave request(s) must be approved or rejected`);
  }

  const attendanceByDate = new Map(
    attendance.map((record) => [dateKey(record.date), record]),
  );

  const counts = {
    presentDays: 0,
    wfhDays: 0,
    paidLeaveDays: 0,
    absentDays: 0,
    halfDays: 0,
    holidayDays: 0,
    weekendDays: 0,
  };

  for (const record of attendance) {
    const isNonWorkingDay = isWeekend(record.date) || holidayDates.has(dateKey(record.date));
    if (isNonWorkingDay && ['absent', 'half_day'].includes(record.status)) continue;

    switch (record.status) {
      case 'present':
        counts.presentDays += 1;
        break;
      case 'wfh':
        counts.wfhDays += 1;
        break;
      case 'leave':
        counts.paidLeaveDays += 1;
        break;
      case 'absent':
        counts.absentDays += 1;
        break;
      case 'half_day':
        counts.halfDays += 1;
        break;
      case 'holiday':
        counts.holidayDays += 1;
        break;
      case 'weekend':
        counts.weekendDays += 1;
        break;
      default:
        break;
    }
  }

  const eligibleStart = dateOfJoining && startOfDay(dateOfJoining) > period.start
    ? startOfDay(dateOfJoining)
    : period.start;
  const leavingDay = dateOfLeaving ? startOfDay(dateOfLeaving) : null;
  const eligibleEnd = leavingDay && leavingDay < period.endOfDay ? leavingDay : period.endOfDay;

  let missingDays = 0;
  for (let cursor = new Date(eligibleStart); cursor <= eligibleEnd; cursor.setDate(cursor.getDate() + 1)) {
    if (isWeekend(cursor)) continue;
    const key = dateKey(cursor);
    if (holidayDates.has(key)) continue;
    if (!attendanceByDate.has(key)) missingDays += 1;
  }

  if (missingDays > 0) {
    issues.push(`Attendance is missing for ${missingDays} working day(s)`);
  }

  const preJoiningDays = dateOfJoining && startOfDay(dateOfJoining) > period.start
    ? Math.min(PAYROLL_DAYS, calendarDaysBetween(period.start, dateOfJoining))
    : 0;
  const dayAfterLeaving = leavingDay ? new Date(leavingDay) : null;
  if (dayAfterLeaving) dayAfterLeaving.setDate(dayAfterLeaving.getDate() + 1);
  const leavingDays = leavingDay && leavingDay < period.endOfDay
    ? Math.min(PAYROLL_DAYS, calendarDaysBetween(dayAfterLeaving, period.endOfDay))
    : 0;

  const lopDays = round2(counts.absentDays + counts.halfDays * 0.5);
  const nonPayableDays = Math.min(PAYROLL_DAYS, round2(preJoiningDays + leavingDays + lopDays));
  const paidDays = round2(Math.max(0, PAYROLL_DAYS - nonPayableDays));
  const perDayRate = monthlySalary > 0 ? round2(monthlySalary / PAYROLL_DAYS) : 0;
  const deductForDays = (days) => round2((monthlySalary * days) / PAYROLL_DAYS);
  const preJoiningDeduction = deductForDays(preJoiningDays);
  const leavingDeduction = deductForDays(leavingDays);
  const lopDeduction = deductForDays(lopDays);
  const otherDeductions = 0;
  const totalDeductions = round2(
    preJoiningDeduction + leavingDeduction + lopDeduction + otherDeductions,
  );
  const netPay = round2(Math.max(0, monthlySalary - totalDeductions));

  return {
    employee: user._id,
    employeeId,
    employeeName: user.name,
    employeeEmail: user.email || null,
    role: user.role || null,
    designation: profile?.designation || null,
    dateOfJoining,
    dateOfLeaving,
    periodStart: period.start,
    periodEnd: period.end,
    payrollDays: PAYROLL_DAYS,
    monthlySalary,
    perDayRate,
    ...counts,
    missingDays,
    preJoiningDays,
    leavingDays,
    lopDays,
    paidDays,
    grossEarnings: monthlySalary,
    preJoiningDeduction,
    leavingDeduction,
    lopDeduction,
    otherDeductions,
    totalDeductions,
    netPay,
    bankName: compensation?.bankName || null,
    bankAccountNumber: compensation?.bankAccountNumber || null,
    ifscCode: compensation?.ifscCode || null,
    issues,
    ready: issues.length === 0,
    status: 'draft',
  };
};

const buildTotals = (slips) => {
  const totals = {
    employees: slips.length,
    ready: 0,
    issues: 0,
    gross: 0,
    preJoiningDeduction: 0,
    leavingDeduction: 0,
    lopDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 0,
    net: 0,
  };

  for (const slip of slips) {
    if (slip.ready) totals.ready += 1;
    else totals.issues += 1;
    totals.gross += slip.grossEarnings;
    totals.preJoiningDeduction += slip.preJoiningDeduction;
    totals.leavingDeduction += slip.leavingDeduction;
    totals.lopDeduction += slip.lopDeduction;
    totals.otherDeductions += slip.otherDeductions;
    totals.totalDeductions += slip.totalDeductions;
    totals.net += slip.netPay;
  }

  for (const key of Object.keys(totals)) {
    if (key !== 'employees' && key !== 'ready' && key !== 'issues') {
      totals[key] = round2(totals[key]);
    }
  }
  return totals;
};

export const generateDraft = async ({ year, month }, requester) => {
  assertPayrollAdmin(requester);
  const period = getPayrollPeriod(year, month);
  if (period.start > new Date()) throw ApiError.badRequest('Cannot generate payroll for a future month');

  const existing = await payrollRepository.findRunByPeriod(period.year, period.month);
  if (existing?.status === 'finalized') {
    throw ApiError.conflict('This payroll period is already finalized. Reopen it before regenerating.');
  }

  const [users, attendance, holidays, pendingLeaves] = await Promise.all([
    payrollRepository.findStaffUsers(),
    payrollRepository.findAttendanceForRange(period.start, period.end),
    payrollRepository.findHolidaysForRange(period.start, period.end),
    payrollRepository.findPendingLeavesForRange(period.start, period.end),
  ]);

  const userIds = users.map((user) => user._id);
  const [profileMap, compensationMap] = await Promise.all([
    employeeService.getProfileMap(userIds),
    employeeService.getCompensationMap(userIds),
  ]);

  const attendanceByEmployee = new Map();
  for (const record of attendance) {
    const key = String(record.employee);
    if (!attendanceByEmployee.has(key)) attendanceByEmployee.set(key, []);
    attendanceByEmployee.get(key).push(record);
  }

  const pendingByEmployee = new Map();
  for (const leave of pendingLeaves) {
    const key = String(leave.employee);
    if (!pendingByEmployee.has(key)) pendingByEmployee.set(key, []);
    pendingByEmployee.get(key).push(leave);
  }

  const holidayDates = new Set(holidays.map((holiday) => dateKey(holiday.date)));

  let run = existing;
  if (run) {
    await payrollRepository.deleteSlipsForRun(run._id);
    run = await payrollRepository.updateRun(run._id, {
      status: 'draft',
      payrollDays: PAYROLL_DAYS,
      generatedBy: requester?._id || null,
      generatedAt: new Date(),
      finalizedBy: null,
      finalizedAt: null,
    });
  } else {
    run = await payrollRepository.createRun({
      year: period.year,
      month: period.month,
      status: 'draft',
      payrollDays: PAYROLL_DAYS,
      generatedBy: requester?._id || null,
      generatedAt: new Date(),
    });
  }

  const slips = [];
  for (const user of users) {
    const key = String(user._id);
    const profile = profileMap.get(key);
    const dateOfLeaving = profile?.dateOfLeaving ? startOfDay(profile.dateOfLeaving) : null;
    const dateOfJoining = profile?.dateOfJoining ? startOfDay(profile.dateOfJoining) : null;

    if (user.isActive === false && !dateOfLeaving) continue;
    if (dateOfLeaving && dateOfLeaving < period.start) continue;
    if (dateOfJoining && dateOfJoining > period.end) continue;

    slips.push({
      payrollRun: run._id,
      ...calculateSalarySlip({
        user,
        profile,
        compensation: compensationMap.get(key),
        attendance: attendanceByEmployee.get(key) || [],
        holidayDates,
        pendingLeaves: pendingByEmployee.get(key) || [],
        period,
      }),
    });
  }

  if (slips.length) await payrollRepository.createSlips(slips);

  run = await payrollRepository.updateRun(run._id, { totals: buildTotals(slips) });
  logger.info(
    `[Payroll] Draft generated for ${period.label}: ${slips.length} employees, ${run.totals.issues} issue(s)`,
  );

  return getRunById(run._id);
};

export const getRunById = async (id) => {
  const run = await payrollRepository.findRunById(id);
  if (!run) throw ApiError.notFound('Payroll run not found');
  const slips = await payrollRepository.findSlipsForRun(id);
  return { run, slips };
};

export const listPayrollRuns = async (year) => payrollRepository.listRuns(year);

export const finalizeRun = async (id, requester) => {
  assertPayrollAdmin(requester);
  const run = await payrollRepository.findRunById(id);
  if (!run) throw ApiError.notFound('Payroll run not found');
  if (run.status === 'finalized') throw ApiError.badRequest('Payroll is already finalized');

  const slips = await payrollRepository.findSlipsForRun(id);
  if (!slips.length) throw ApiError.badRequest('Cannot finalize payroll with no salary slips');
  const blocked = slips.filter((slip) => !slip.ready);
  if (blocked.length) {
    throw ApiError.badRequest(
      `Cannot finalize payroll: ${blocked.length} employee(s) have blocking issues. Resolve attendance, leave, profile, salary, or bank details first.`,
    );
  }

  await payrollRepository.updateSlipsStatus(id, 'finalized');
  const updated = await payrollRepository.updateRun(id, {
    status: 'finalized',
    finalizedBy: requester?._id || null,
    finalizedAt: new Date(),
  });
  logger.info(`[Payroll] Finalized ${updated.year}-${String(updated.month).padStart(2, '0')}`);
  return getRunById(id);
};

export const reopenRun = async (id, reason, requester) => {
  assertPayrollAdmin(requester);
  const run = await payrollRepository.findRunById(id);
  if (!run) throw ApiError.notFound('Payroll run not found');
  if (run.status !== 'finalized') throw ApiError.badRequest('Only finalized payroll can be reopened');
  if (!reason || !String(reason).trim()) throw ApiError.badRequest('A reopen reason is required');

  await payrollRepository.updateSlipsStatus(id, 'draft');
  const updated = await payrollRepository.updateRun(id, {
    status: 'draft',
    revision: (run.revision || 1) + 1,
    reopenedBy: requester?._id || null,
    reopenedAt: new Date(),
    reopenReason: String(reason).trim(),
    finalizedBy: null,
    finalizedAt: null,
  });
  logger.info(`[Payroll] Reopened ${updated.year}-${String(updated.month).padStart(2, '0')} revision ${updated.revision}`);
  return getRunById(id);
};

export const getMySlips = async (userId) =>
  payrollRepository.findSlipsForEmployee(userId);

export const getSalarySlipPdf = async (slipId, requester) => {
  const slip = await payrollRepository.findSlipWithRun(slipId);
  if (!slip) throw ApiError.notFound('Salary slip not found');

  const payrollAdmin = isPayrollAdmin(requester);
  const isOwner = String(slip.employee) === String(requester?._id);
  if (!payrollAdmin) {
    if (!isOwner) throw ApiError.forbidden('You do not have permission to download this salary slip');
    if (slip.status !== 'finalized') throw ApiError.forbidden('This salary slip has not been finalized');
  }

  const { generateSalarySlipPdf } = await import('../../services/pdfService.js');
  return generateSalarySlipPdf(slip);
};
