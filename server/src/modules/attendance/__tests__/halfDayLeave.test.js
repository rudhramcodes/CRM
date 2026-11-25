import { describe, expect, it } from 'vitest';
import { calculateLeaveDays, formatLeaveDuration, shortDayStatus } from '../leavePolicy.js';
import { createLeaveSchema } from '../attendance.validation.js';
import { applyWorkingDayClockInStatus, canCancelLeave } from '../attendance.service.js';

const base = { leaveType: 'casual', reason: 'Doctor appointment in the morning' };

describe('half-day leave', () => {
  it('counts a half day as 0.5 and a range as whole days', () => {
    expect(calculateLeaveDays('2026-11-25', '2026-11-25', 'first')).toBe(0.5);
    expect(calculateLeaveDays('2026-11-25', '2026-11-27')).toBe(3);
    expect(formatLeaveDuration(0.5, 'second')).toBe('Half day (second half)');
  });

  it('accepts a single-day half day and rejects one spanning several days', () => {
    expect(createLeaveSchema.safeParse({ ...base, startDate: '2026-11-25', endDate: '2026-11-25', halfDay: 'first' }).success).toBe(true);
    expect(createLeaveSchema.safeParse({ ...base, startDate: '2026-11-25', endDate: '2026-11-26', halfDay: 'first' }).success).toBe(false);
    expect(createLeaveSchema.safeParse({ ...base, startDate: '2026-11-25', endDate: '2026-11-25', halfDay: 'morning' }).success).toBe(false);
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
  const other = { _id: 'e2', role: 'employee' };
  const leave = (status, startDate) => ({ employee: { _id: 'e1' }, status, startDate: new Date(`${startDate}T00:00:00Z`) });
  const today = '2026-11-25';

  it('lets the owner cancel pending leave any time and approved leave only before it starts', () => {
    expect(canCancelLeave(leave('pending', '2026-11-20'), emp, today)).toBe(null);
    expect(canCancelLeave(leave('approved', '2026-11-26'), emp, today)).toBe(null);
    expect(canCancelLeave(leave('approved', '2026-11-25'), emp, today)).toMatch(/already started/);
  });

  it('lets reviewers cancel started leave, and blocks other employees and finished requests', () => {
    expect(canCancelLeave(leave('approved', '2026-11-01'), mgr, today)).toBe(null);
    expect(canCancelLeave(leave('pending', '2026-11-26'), other, today)).toMatch(/your own/);
    expect(canCancelLeave(leave('rejected', '2026-11-26'), emp, today)).toMatch(/Only pending or approved/);
    expect(canCancelLeave(leave('cancelled', '2026-11-26'), mgr, today)).toMatch(/Only pending or approved/);
  });
});
