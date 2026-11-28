import { describe, expect, it } from 'vitest';
import { calculateLeaveDays, formatLeaveDuration, shortDayStatus } from '../leavePolicy.js';
import { createLeaveSchema } from '../attendance.validation.js';
import { applyWorkingDayClockInStatus, canCancelLeave, firstClockInLateness } from '../attendance.service.js';

const base = { leaveType: 'casual', reason: 'Doctor appointment in the morning' };

describe('half-day leave', () => {
  it('counts a half day as 0.5 and a range as whole days', () => {
    expect(calculateLeaveDays('2026-11-25', '2026-11-25', 'first')).toBe(0.5);
    expect(calculateLeaveDays('2026-11-25', '2026-11-27')).toBe(3);
    expect(formatLeaveDuration(0.5, 'second')).toBe('Half day (second half)');
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

describe('late on clock-in', () => {
  const shift = { startTime: '09:00', gracePeriod: 15 };
  const at = (hhmm) => new Date(`2026-11-25T${hhmm}:00`);

  it('judges only the first clock-in of the day', () => {
    expect(firstClockInLateness({ sessions: [] }, shift, at('09:10'))).toEqual({ isLate: false, lateMinutes: 0 });
    expect(firstClockInLateness({ sessions: [] }, shift, at('10:15'))).toEqual({ isLate: true, lateMinutes: 60 });
    // Clocked in on time, clocked out, back at 2 pm: not late
    expect(firstClockInLateness({ sessions: [{ clockIn: { time: at('09:00') } }] }, shift, at('14:00'))).toBe(null);
  });

  it('is not late on a first-half leave day', () => {
    expect(firstClockInLateness({ sessions: [], leave: 'l1', status: 'half_day' }, shift, at('13:30')).isLate).toBe(false);
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
