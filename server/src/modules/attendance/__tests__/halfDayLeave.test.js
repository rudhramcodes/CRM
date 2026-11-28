import { describe, expect, it } from 'vitest';
import { calculateLeaveDays, calendarLeaveDays, formatLeaveDuration, shortDayStatus } from '../leavePolicy.js';
import { createLeaveSchema } from '../attendance.validation.js';
import { applyWorkingDayClockInStatus, canCancelLeave } from '../attendance.service.js';

const base = { leaveType: 'casual', reason: 'Doctor appointment in the morning' };

describe('half-day leave', () => {
  it('counts a half day as 0.5 and a range as whole days', () => {
    expect(calculateLeaveDays('2026-11-25', '2026-11-25', 'first')).toBe(0.5);
    expect(calculateLeaveDays('2026-11-25', '2026-11-27')).toBe(3);
    expect(formatLeaveDuration(0.5, 'second')).toBe('Half day (second half)');
  });

  it('charges working days only: Sundays and holidays inside the range are free', () => {
    // Sat 28 Nov – Mon 30 Nov 2026: the Sunday is free
    expect(calculateLeaveDays(new Date('2026-11-28'), new Date('2026-11-30'))).toBe(2);
    // Mon 21 – Sat 26 Dec with Christmas (Fri) as a holiday
    expect(calculateLeaveDays(new Date('2026-12-21'), new Date('2026-12-26'), null, [new Date('2026-12-25')])).toBe(5);
    expect(calculateLeaveDays(new Date('2026-11-29'), new Date('2026-11-29'))).toBe(0);
    // Leave approved before this change was charged calendar days; refunds give those back
    expect(calendarLeaveDays(new Date('2026-11-28'), new Date('2026-11-30'))).toBe(3);
  });

  it('accepts a single-day half day and rejects one spanning several days', () => {
    expect(createLeaveSchema.safeParse({ ...base, startDate: '2099-11-25', endDate: '2099-11-25', halfDay: 'first' }).success).toBe(true);
    expect(createLeaveSchema.safeParse({ ...base, startDate: '2099-11-25', endDate: '2099-11-26', halfDay: 'first' }).success).toBe(false);
    expect(createLeaveSchema.safeParse({ ...base, startDate: '2099-11-25', endDate: '2099-11-25', halfDay: 'morning' }).success).toBe(false);
  });

  it('accepts leave from today and rejects leave that starts in the past', () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    expect(createLeaveSchema.safeParse({ ...base, startDate: today, endDate: today }).success).toBe(true);
    const past = createLeaveSchema.safeParse({ ...base, startDate: '2020-01-01', endDate: today });
    expect(past.error?.issues.map((i) => i.path[0])).toEqual(['startDate']);
  });

  it('marks short worked days at day end', () => {
    expect(shortDayStatus(0)).toBe('absent');
    expect(shortDayStatus(1.5)).toBe('absent');
    expect(shortDayStatus(3)).toBe('half_day');
    expect(shortDayStatus(4)).toBe(null);
  });

  it('keeps a half day as half day after clock-in', () => {
    expect(applyWorkingDayClockInStatus({ status: 'half_day' }, false).status).toBe('half_day');
    expect(applyWorkingDayClockInStatus({ status: 'absent' }, true).status).toBe('wfh');
  });
});

describe('cancel leave rules', () => {
  const emp = { _id: 'e1', role: 'employee' };
  const mgr = { _id: 'm1', role: 'manager' };
  const admin = { _id: 'a1', role: 'admin' };
  const other = { _id: 'e2', role: 'employee' };
  const leave = (status, startDate) => ({ employee: { _id: 'e1' }, status, startDate: new Date(`${startDate}T00:00:00Z`) });
  const today = '2026-11-25';

  it('lets the owner cancel pending leave any time and approved leave only before it starts', () => {
    expect(canCancelLeave(leave('pending', '2026-11-20'), emp, today)).toBe(null);
    expect(canCancelLeave(leave('approved', '2026-11-26'), emp, today)).toBe(null);
    expect(canCancelLeave(leave('approved', '2026-11-25'), emp, today)).toMatch(/already started/);
    expect(canCancelLeave(leave('approved', '2026-11-20'), emp, today)).toMatch(/before today/);
  });

  it('lets reviewers cancel pending or approved leave from today on, never before', () => {
    expect(canCancelLeave(leave('pending', '2026-11-25'), admin, today)).toBe(null);
    expect(canCancelLeave(leave('pending', '2026-11-26'), mgr, today)).toBe(null);
    expect(canCancelLeave(leave('approved', '2026-11-25'), admin, today)).toBe(null);
    expect(canCancelLeave(leave('approved', '2026-11-30'), mgr, today)).toBe(null);
    expect(canCancelLeave(leave('approved', '2026-11-24'), admin, today)).toMatch(/before today/);
    expect(canCancelLeave(leave('pending', '2026-11-01'), mgr, today)).toMatch(/before today/);
  });

  it('blocks other employees, rejected leave and leave that is already cancelled', () => {
    expect(canCancelLeave(leave('pending', '2026-11-26'), other, today)).toMatch(/your own/);
    expect(canCancelLeave(leave('rejected', '2026-11-26'), admin, today)).toMatch(/Rejected leave/);
    expect(canCancelLeave(leave('cancelled', '2026-11-26'), admin, today)).toMatch(/already cancelled/);
  });
});
