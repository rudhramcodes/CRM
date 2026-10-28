import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { calculateSalarySlip, getPayrollPeriod } from '../src/modules/payroll/payroll.service.js';
import { getPreviousPayrollMonth } from '../src/modules/payroll/payroll.cron.js';
import { isPayrollAdmin } from '../src/utils/payrollAccess.js';

assert.equal(isPayrollAdmin({ role: 'super_admin', email: 'anyone@example.com' }), true);
assert.equal(isPayrollAdmin({ role: 'admin', email: 'jaimishchhowala@rudhramenterprises.com' }), true);
assert.equal(isPayrollAdmin({ role: 'admin', email: ' JaimishChhowala@Rudhramenterprises.com ' }), true);
assert.equal(isPayrollAdmin({ role: 'admin', email: 'other@example.com' }), false);
assert.equal(isPayrollAdmin({ role: 'employee', email: 'employee@example.com' }), false);

assert.deepEqual(
  getPreviousPayrollMonth(new Date('2026-10-31T19:30:00Z')),
  { year: 2026, month: 10 },
);
assert.deepEqual(
  getPreviousPayrollMonth(new Date('2026-01-01T05:00:00Z')),
  { year: 2025, month: 12 },
);

const userId = new mongoose.Types.ObjectId();
const user = { _id: userId, name: 'Test Employee', email: 'employee@example.com', role: 'employee' };
const compensation = {
  monthlyGrossSalary: 30000,
  bankName: 'HDFC Bank',
  bankAccountNumber: '123456789012',
  ifscCode: 'HDFC0001234',
};

const period = getPayrollPeriod(2026, 1);
assert.equal(period.label, 'January 2026');
assert.equal(period.start.getDate(), 1);
assert.equal(period.end.getDate(), 31);

const attendance = [];
for (let day = 1; day <= 31; day += 1) {
  const date = new Date(2026, 0, day);
  if (date.getDay() === 0) continue;
  attendance.push({ employee: userId, date, status: 'present' });
}
attendance.find((record) => record.date.getDate() === 5).status = 'absent';
attendance.find((record) => record.date.getDate() === 6).status = 'half_day';

const slip = calculateSalarySlip({
  user,
  profile: {
    employeeId: 'RUD-EMP-0001',
    designation: 'Editor',
    dateOfJoining: new Date(2026, 0, 1),
  },
  compensation,
  attendance,
  period,
});

assert.equal(slip.perDayRate, 1000);
assert.equal(slip.lopDays, 1.5);
assert.equal(slip.lopDeduction, 1500);
assert.equal(slip.paidDays, 28.5);
assert.equal(slip.netPay, 28500);
assert.equal(slip.ready, true);
assert.deepEqual(slip.issues, []);

const missing = calculateSalarySlip({
  user,
  profile: {
    employeeId: 'RUD-EMP-0001',
    designation: 'Editor',
    dateOfJoining: new Date(2026, 0, 1),
  },
  compensation,
  attendance: [],
  period,
});
assert.equal(missing.ready, false);
assert.ok(missing.issues.some((issue) => issue.includes('Attendance is missing')));
assert.equal(missing.absentDays, 0);

const midMonthPeriod = getPayrollPeriod(2026, 2);
const midMonthAttendance = [];
for (let day = 15; day <= 28; day += 1) {
  const date = new Date(2026, 1, day);
  if (date.getDay() === 0) continue;
  midMonthAttendance.push({ employee: userId, date, status: 'present' });
}
const midMonth = calculateSalarySlip({
  user,
  profile: {
    employeeId: 'RUD-EMP-0001',
    designation: 'Editor',
    dateOfJoining: new Date(2026, 1, 15),
  },
  compensation,
  attendance: midMonthAttendance,
  period: midMonthPeriod,
});
assert.equal(midMonth.preJoiningDays, 14);
assert.equal(midMonth.paidDays, 16);
assert.equal(midMonth.preJoiningDeduction, 14000);
assert.equal(midMonth.netPay, 16000);
assert.equal(midMonth.ready, true);

const roundedMidMonth = calculateSalarySlip({
  user,
  profile: {
    employeeId: 'RUD-EMP-0001',
    designation: 'Editor',
    dateOfJoining: new Date(2026, 1, 15),
  },
  compensation: { ...compensation, monthlyGrossSalary: 10000 },
  attendance: midMonthAttendance,
  period: midMonthPeriod,
});
assert.equal(roundedMidMonth.perDayRate, 333.33);
assert.equal(roundedMidMonth.netPay, 5333.33);

const leavingPeriod = getPayrollPeriod(2026, 1);
const leavingAttendance = [];
for (let day = 1; day <= 15; day += 1) {
  const date = new Date(2026, 0, day);
  if (date.getDay() === 0) continue;
  leavingAttendance.push({ employee: userId, date, status: 'present' });
}
const leaver = calculateSalarySlip({
  user,
  profile: {
    employeeId: 'RUD-EMP-0001',
    designation: 'Editor',
    dateOfJoining: new Date(2025, 0, 1),
    dateOfLeaving: new Date(2026, 0, 15),
  },
  compensation,
  attendance: leavingAttendance,
  period: leavingPeriod,
});
assert.equal(leaver.leavingDays, 15);
assert.equal(leaver.paidDays, 15);
assert.equal(leaver.leavingDeduction, 15000);
assert.equal(leaver.netPay, 15000);
assert.equal(leaver.ready, true);

const pending = calculateSalarySlip({
  user,
  profile: {
    employeeId: 'RUD-EMP-0001',
    designation: 'Editor',
    dateOfJoining: new Date(2026, 0, 1),
  },
  compensation,
  attendance,
  pendingLeaves: [{ _id: new mongoose.Types.ObjectId() }],
  period,
});
assert.equal(pending.ready, false);
assert.ok(pending.issues.some((issue) => issue.includes('pending leave')));

const midMonthSalary = calculateSalarySlip({
  user,
  profile: {
    employeeId: 'RUD-EMP-0001',
    designation: 'Editor',
    dateOfJoining: new Date(2026, 0, 1),
  },
  compensation: { ...compensation, salaryEffectiveFrom: new Date(2026, 0, 15) },
  attendance,
  period,
});
assert.equal(midMonthSalary.ready, false);
assert.ok(midMonthSalary.issues.some((issue) => issue.includes('Mid-month salary changes')));

console.log('Payroll calculation checks passed (no database connection).');
