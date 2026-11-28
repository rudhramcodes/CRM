import { describe, expect, it } from 'vitest';
import { autoClockOutTime } from '../attendance.service.js';
import { endLongBreak } from '../attendance.cron.js';
import { Attendance } from '../attendance.model.js';

const day = new Date(2026, 10, 27);
const at = (h, m = 0, d = day) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
const shift = { startTime: '09:00', endTime: '18:00' };

describe('auto clock-out time', () => {
  it('stops a forgotten clock-out at shift end, not at 11:45 PM', () => {
    expect(autoClockOutTime(at(9, 30), day, shift, at(23, 45))).toEqual(at(18));
  });

  it('never goes before the clock-in (0 h, to be regularized)', () => {
    expect(autoClockOutTime(at(20), day, shift, at(23, 45))).toEqual(at(20));
  });

  it('never goes past now', () => {
    expect(autoClockOutTime(at(9), day, shift, at(17))).toEqual(at(17));
  });

  it('closes a session left open on an earlier day at that day\'s shift end', () => {
    const later = new Date(2026, 10, 28, 23, 45);
    expect(autoClockOutTime(at(9), day, shift, later)).toEqual(at(18));
  });

  it('ends an overnight shift the next morning', () => {
    const night = { startTime: '22:00', endTime: '06:00' };
    expect(autoClockOutTime(at(22), day, night, at(23, 45, new Date(2026, 10, 29)))).toEqual(at(6, 0, new Date(2026, 10, 28)));
  });
});

describe('auto-ended break', () => {
  it('ends at start + 60 min, so it counts as a full hour', () => {
    const brk = { start: at(13), end: null };
    expect(endLongBreak(brk, at(14, 30))).toBe(true);
    expect(brk).toMatchObject({ end: at(14), duration: 60 });
  });

  it('leaves a short or finished break alone', () => {
    expect(endLongBreak({ start: at(14), end: null }, at(13, 30))).toBe(false);
    expect(endLongBreak({ start: at(13), end: at(13, 10) }, at(14, 30))).toBe(false);
  });
});

describe('session location', () => {
  it('keeps the office proof and place name', () => {
    const rec = new Attendance({ employee: '6650a1b2c3d4e5f6a7b8c9d0', date: day, shift: '6650a1b2c3d4e5f6a7b8c9d1',
      sessions: [{ clockIn: { time: at(9), location: { lat: 19.1, lng: 72.8, isOffice: true, locationName: 'Office', address: 'Office (12m away)', distanceMeters: 12 } } }] });
    expect(rec.sessions[0].clockIn.location.toObject()).toMatchObject({ isOffice: true, locationName: 'Office', distanceMeters: 12 });
  });
});
