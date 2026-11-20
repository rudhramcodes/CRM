import { describe, expect, it } from 'vitest';
import { addWorkingMinutes, quietHoursEnd } from '../workingHours.js';

// Times are written in IST (+05:30); 2026-11-16 is a Monday.
const at = (s) => new Date(`${s}+05:30`);

describe('addWorkingMinutes', () => {
  it('adds inside office hours', () => expect(addWorkingMinutes(at('2026-11-16T12:00:00'), 60)).toEqual(at('2026-11-16T13:00:00')));
  it('starts the clock at opening time', () => expect(addWorkingMinutes(at('2026-11-16T08:00:00'), 60)).toEqual(at('2026-11-16T11:00:00')));
  it('carries over to the next morning', () => expect(addWorkingMinutes(at('2026-11-16T18:30:00'), 60)).toEqual(at('2026-11-17T10:30:00')));
  it('waits overnight when submitted after closing', () => expect(addWorkingMinutes(at('2026-11-16T21:00:00'), 60)).toEqual(at('2026-11-17T11:00:00')));
  it('skips Sunday', () => expect(addWorkingMinutes(at('2026-11-21T18:30:00'), 60)).toEqual(at('2026-11-23T10:30:00')));
  it('treats Sunday submissions as Monday', () => expect(addWorkingMinutes(at('2026-11-22T15:00:00'), 45)).toEqual(at('2026-11-23T10:45:00')));
});

describe('quietHoursEnd', () => {
  it('is null in the day', () => expect(quietHoursEnd(at('2026-11-16T20:59:00'))).toBeNull());
  it('holds late-evening pushes to the next 8 am', () => expect(quietHoursEnd(at('2026-11-16T21:00:00'))).toEqual(at('2026-11-17T08:00:00')));
  it('holds early-morning pushes to 8 am the same day', () => expect(quietHoursEnd(at('2026-11-17T02:30:00'))).toEqual(at('2026-11-17T08:00:00')));
  it('works across the UTC date line (23:30 IST is 18:00 UTC)', () => expect(quietHoursEnd(at('2026-11-16T23:30:00'))).toEqual(at('2026-11-17T08:00:00')));
});
