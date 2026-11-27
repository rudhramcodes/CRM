import { describe, expect, it, vi } from 'vitest';

const User = vi.hoisted(() => ({ find: vi.fn(() => ({ select: async () => [] })) }));
const notify = vi.hoisted(() => ({ buildNotification: vi.fn(() => ({})), createAndSendBulk: vi.fn(async () => []) }));
vi.mock('../../auth/auth.model.js', () => ({ default: User }));
vi.mock('../../notifications/notification.service.js', () => notify);
vi.mock('../../../services/emailService.js', () => ({ sendMeetingEmail: vi.fn() }));
vi.mock('../meeting.repository.js', () => ({
  findConflicting: vi.fn(async () => []),
  create: vi.fn(async (payload) => ({ _id: 'm1', ...payload })),
  // Saved meeting: organizer u0, attendee u1
  findById: vi.fn(async () => ({
    _id: 'm1', createdBy: 'u0', attendees: ['u1'], status: 'scheduled',
    date: new Date('2026-11-28'), startTime: '10:00', endTime: '10:30',
  })),
  updateById: vi.fn(async (_id, update) => ({ _id: 'm1', status: 'scheduled', ...update })),
}));

const { createMeeting, getMeetingContacts, updateMeeting } = await import('../meeting.service.js');
const { createMeetingSchema, updateMeetingSchema } = await import('../meeting.validation.js');

const meeting = { title: 'Weekly sync', date: '2026-11-28', startTime: '10:00', endTime: '10:30' };
const userId = 'a'.repeat(24);

describe('who hears about a meeting', () => {
  it('looks up only the attendees: not all staff, not the organizer', async () => {
    await getMeetingContacts({ createdBy: 'u0', attendees: ['u1', 'u2'] });
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ _id: { $in: ['u1', 'u2'] } }));
  });

  it('does not notify the organizer about a meeting they just made', async () => {
    await createMeeting({ ...meeting, attendees: ['u0', 'u1'] }, { _id: 'u0' });
    expect(notify.createAndSendBulk.mock.lastCall[0]).toEqual(['u1']);
  });

  it('on edit, tells only the people just added (not the editor) and skips the Cliq post', async () => {
    await updateMeeting('m1', { attendees: ['u1', 'u2', 'u9'] }, { _id: 'u9' });
    expect(notify.createAndSendBulk).toHaveBeenLastCalledWith(
      ['u2'],
      expect.objectContaining({ channels: expect.objectContaining({ cliq: false }) }),
    );
  });

  it('on edit, says nothing when nobody was added', async () => {
    notify.createAndSendBulk.mockClear();
    await updateMeeting('m1', { attendees: ['u1'], title: 'Renamed' }, { _id: 'u0' });
    expect(notify.createAndSendBulk).not.toHaveBeenCalled();
  });
});

describe('a meeting needs at least one attendee', () => {
  it('on create', () => {
    expect(createMeetingSchema.safeParse({ ...meeting, attendees: [] }).success).toBe(false);
    expect(createMeetingSchema.safeParse(meeting).success).toBe(false);
    expect(createMeetingSchema.safeParse({ ...meeting, attendees: [userId] }).success).toBe(true);
  });

  it('on edit, while status-only updates still pass', () => {
    expect(updateMeetingSchema.safeParse({ attendees: [] }).success).toBe(false);
    expect(updateMeetingSchema.safeParse({ status: 'completed' }).success).toBe(true);
  });
});
