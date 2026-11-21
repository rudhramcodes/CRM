import { describe, expect, it, vi } from 'vitest';

const updateById = vi.fn(async (id, data) => ({ _id: id, ...data }));
vi.mock('../freelancer.repository.js', () => ({
  findById: vi.fn(async () => ({ _id: 'f1', email: 'ravi@x.com', status: 'active' })),
  findByPhone: vi.fn(async () => null),
  findByEmail: vi.fn(async () => null),
  updateById,
}));

const { update } = await import('../freelancer.service.js');

describe('freelancer update', () => {
  it('a status-only change leaves the email and display name alone', async () => {
    await update('f1', { status: 'inactive' }, { _id: 'u1' });
    const sent = updateById.mock.lastCall[1];
    expect(sent).toEqual({ status: 'inactive', updatedBy: 'u1' });
    expect('email' in sent).toBe(false);
  });

  it('still normalizes an email that is sent', async () => {
    await update('f1', { email: ' Ravi@X.com ' }, { _id: 'u1' });
    expect(updateById.mock.lastCall[1].email).toBe('ravi@x.com');
  });
});
