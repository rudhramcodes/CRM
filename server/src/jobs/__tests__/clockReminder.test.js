import { describe, expect, it, vi } from 'vitest';

vi.mock('../../modules/notifications/expoPush.js', () => ({ sendExpoPush: vi.fn() }));
const { whoToRemind } = await import('../clockReminder.job.js');

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
