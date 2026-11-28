import { describe, expect, it } from 'vitest';
import { applyLeave, applyOverrideToRecord } from '../attendance.service.js';
import { clockInSchema } from '../attendance.validation.js';

const shift = { startTime: '10:00', gracePeriod: 15, duration: 8 };
const day = (status = 'absent') => ({ status, events: [], totalBreakMinutes: 0 });
const base = { dateStr: '2026-11-20', adminId: 'a1' };

describe('manual day edits', () => {
  it('rejects a clock-out before the clock-in', () => {
    expect(() => applyOverrideToRecord(day(), shift, { ...base, clockInTime: '18:00', clockOutTime: '09:00' })).toThrow(/after clock in/);
  });

  it('needs a clock-out on a past day', () => {
    expect(() => applyOverrideToRecord(day(), shift, { ...base, clockInTime: '09:00' })).toThrow(/past day/);
  });

  it('times on an absent day with no new status make it a worked day', () => {
    const r = applyOverrideToRecord(day('absent'), shift, { ...base, clockInTime: '10:00', clockOutTime: '18:00', breakMinutes: 30 });
    expect(r.status).toBe('present');
    expect(r.workHours).toBe(7.5);
  });
});

describe('late minutes', () => {
  it('count from shift start once past the grace time', () => {
    const late = applyOverrideToRecord(day(), shift, { ...base, clockInTime: '10:20', clockOutTime: '18:00' });
    expect(late.isLate).toBe(true);
    expect(late.lateMinutes).toBe(20);
    const inGrace = applyOverrideToRecord(day(), shift, { ...base, clockInTime: '10:10', clockOutTime: '18:00' });
    expect(inGrace.isLate).toBe(false);
    expect(inGrace.lateMinutes).toBe(0);
  });
});

describe('other checks', () => {
  it('WFH clock-in needs a reason', () => {
    expect(clockInSchema.safeParse({ isWFH: true }).success).toBe(false);
    expect(clockInSchema.safeParse({ isWFH: true, wfhReason: 'Plumber visit' }).success).toBe(true);
    expect(clockInSchema.safeParse({}).success).toBe(true);
  });

  it('a leave can not cross the year end', async () => {
    await expect(applyLeave('u1', { leaveType: 'casual', startDate: '2026-12-30', endDate: '2027-01-02', reason: 'Family trip over new year' }))
      .rejects.toThrow(/year end/);
  });
});
