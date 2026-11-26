import { describe, expect, it, vi } from 'vitest';

vi.mock('../../modules/notifications/expoPush.js', () => ({ sendExpoPush: vi.fn(() => Promise.resolve()) }));
const { whoToRemind, sendClockOutReminders } = await import('../clockReminder.job.js');
const { sendExpoPush } = await import('../../modules/notifications/expoPush.js');
const { Holiday } = await import('../../modules/attendance/attendance.model.js');
const { default: User } = await import('../../modules/auth/auth.model.js');

const users = ['a', 'b', 'c', 'd', 'e', 'f'].map((_id) => ({ _id }));

describe('whoToRemind', () => {
  it('reminds only people with no clock-in and no day off', () => {
    const records = [
      { employee: 'a', sessions: [{ clockIn: { time: new Date() } }] }, // clocked in
      { employee: 'b', clockIn: { time: new Date() } }, // legacy clock-in field
      { employee: 'c', status: 'leave' },
      { employee: 'd', status: 'absent', sessions: [] }, // marked absent, not in yet
    ];
    expect(whoToRemind(users, records, ['e']).map((u) => u._id)).toEqual(['d', 'f']);
  });

  it('reminds everyone when nobody has a record', () => {
    expect(whoToRemind(users, [], [])).toHaveLength(6);
  });
});

describe('sendClockOutReminders', () => {
  const findUsers = (ids) => vi.spyOn(User, 'find').mockReturnValue({ select: () => ({ lean: () => Promise.resolve(ids.map((_id) => ({ _id }))) }) });

  it('pushes to every active staff role, never clients', async () => {
    vi.spyOn(Holiday, 'exists').mockResolvedValue(null);
    const find = findUsers(['a', 'b']);
    sendExpoPush.mockClear();

    expect(await sendClockOutReminders(new Date('2026-11-26T18:10:00'))).toBe(2);
    expect(find).toHaveBeenCalledWith({ role: { $in: ['employee', 'manager', 'admin', 'super_admin'] }, isActive: true });
    expect(sendExpoPush).toHaveBeenCalledTimes(2);
    expect(sendExpoPush.mock.calls[0][1]).toMatchObject({ type: 'clock_out_reminder', message: 'Please clock out before leaving the office.' });
  });

  it('sends nothing on a holiday', async () => {
    vi.spyOn(Holiday, 'exists').mockResolvedValue({ _id: 'h' });
    sendExpoPush.mockClear();
    expect(await sendClockOutReminders()).toBe(0);
    expect(sendExpoPush).not.toHaveBeenCalled();
  });
});
