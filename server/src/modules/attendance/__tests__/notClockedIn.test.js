import { describe, expect, it } from 'vitest';
import { withNotClockedIn } from '../attendance.service.js';
import { attendanceQuerySchema } from '../attendance.validation.js';

const staff = [{ _id: 'u3', name: 'Zara' }, { _id: 'u1', name: 'Amit' }, { _id: 'u2', name: 'Bela' }, { _id: 'u4', name: 'Chetan' }];
const records = [{ _id: 'r1', employee: { _id: 'u1' }, status: 'present' }];
const onLeave = new Set(['u2']);
const day = new Date(2026, 10, 26);

describe('not clocked in', () => {
  it('lists records first, then staff with no record and no leave, by name', () => {
    const rows = withNotClockedIn(records, staff, onLeave, undefined, day);
    expect(rows.map((r) => r._id)).toEqual(['r1', 'nc-u4', 'nc-u3']);
    expect(rows[1]).toMatchObject({ status: 'not_clocked_in', employee: { name: 'Chetan' }, date: day });
  });

  it('keeps only the placeholders for the not_clocked_in filter', () => {
    const rows = withNotClockedIn(records, staff, onLeave, 'not_clocked_in', day);
    expect(rows.map((r) => r._id)).toEqual(['nc-u4', 'nc-u3']);
  });

  it('accepts records whose employee is a bare id', () => {
    const rows = withNotClockedIn([{ employee: 'u4' }], staff, new Set(), 'not_clocked_in', day);
    expect(rows.map((r) => r._id)).toEqual(['nc-u1', 'nc-u2', 'nc-u3']);
  });

  it('only accepts includeMissing=true', () => {
    expect(attendanceQuerySchema.safeParse({ includeMissing: 'true', status: 'not_clocked_in' }).success).toBe(true);
    expect(attendanceQuerySchema.safeParse({ includeMissing: 'false' }).success).toBe(false);
  });
});
