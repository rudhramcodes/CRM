import { describe, expect, it, vi } from 'vitest';
import { Holiday } from '../attendance.model.js';
import { applyLeave, assertNotOwnLeave } from '../attendance.service.js';

describe('leave review', () => {
  const leave = { employee: { _id: 'u1' } };

  it('blocks reviewing your own leave, except a super admin', () => {
    expect(() => assertNotOwnLeave(leave, { _id: 'u1', role: 'manager' })).toThrow(/own leave/);
    expect(() => assertNotOwnLeave(leave, { _id: 'u1', role: 'admin' })).toThrow(/own leave/);
    expect(() => assertNotOwnLeave(leave, { _id: 'u1', role: 'super_admin' })).not.toThrow();
    expect(() => assertNotOwnLeave(leave, { _id: 'u2', role: 'manager' })).not.toThrow();
  });

  it('caps paternity leave at 5 working days per request', async () => {
    vi.spyOn(Holiday, 'find').mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
    // Mon 7 – Sat 12 Dec 2026 = 6 working days
    await expect(applyLeave('u1', {
      leaveType: 'paternity', startDate: '2026-12-07', endDate: '2026-12-12', reason: 'Baby is due this week',
    })).rejects.toThrow(/at most 5 working days/);
  });
});
