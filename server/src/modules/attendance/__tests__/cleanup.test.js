import { describe, expect, it, vi } from 'vitest';
import { Holiday, Shift } from '../attendance.model.js';
import { copyRecurringHolidays } from '../attendance.cron.js';
import { updateShift } from '../attendance.service.js';

describe('recurring holidays', () => {
  it("copies this year's recurring holidays to the same date next year", async () => {
    vi.spyOn(Holiday, 'find').mockReturnValue({ lean: () => Promise.resolve([{ name: 'Republic Day', type: 'national', date: new Date('2026-01-26') }]) });
    const upsert = vi.spyOn(Holiday, 'updateOne').mockResolvedValue({ upsertedCount: 1 });
    expect(await copyRecurringHolidays(new Date('2026-12-01T01:30:00'))).toBe(1);
    expect(upsert.mock.calls[0][0]).toEqual({ date: new Date('2027-01-26') });
  });
});

describe('default shift', () => {
  it('can not switch off the only default shift', async () => {
    vi.spyOn(Shift, 'findById').mockResolvedValue({ _id: 's1', isDefault: true });
    await expect(updateShift('s1', { isDefault: false })).rejects.toThrow(/default shift/);
    await expect(updateShift('s1', { isActive: false })).rejects.toThrow(/default shift/);
  });
});
