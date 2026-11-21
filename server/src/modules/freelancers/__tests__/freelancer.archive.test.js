import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = vi.hoisted(() => ({
  findById: vi.fn(),
  updateById: vi.fn(async (_id, data) => data),
  deleteById: vi.fn(async () => null),
  findByPhone: vi.fn(async () => null),
  findByEmail: vi.fn(async () => null),
}));
vi.mock('../freelancer.repository.js', () => repo);

const { remove, update } = await import('../freelancer.service.js');

const admin = { _id: 'u1', role: 'admin' };
const manager = { _id: 'u2', role: 'manager' };
const withStatus = (status) => repo.findById.mockResolvedValue({ _id: 'f1', status, email: 'a@b.co' });

describe('freelancer archive rules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stops a manager archiving through an edit', async () => {
    withStatus('active');
    await expect(update('f1', { status: 'archived' }, manager)).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('stops a manager restoring an archived freelancer', async () => {
    withStatus('archived');
    await expect(update('f1', { status: 'active' }, manager)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('still lets a manager switch between active and inactive and edit details', async () => {
    withStatus('active');
    await expect(update('f1', { status: 'inactive' }, manager)).resolves.toMatchObject({ status: 'inactive' });
    await expect(update('f1', { city: 'Pune' }, manager)).resolves.toMatchObject({ city: 'Pune' });
  });

  it('lets an admin archive and restore', async () => {
    withStatus('active');
    await expect(update('f1', { status: 'archived' }, admin)).resolves.toMatchObject({ status: 'archived' });
    withStatus('archived');
    await expect(update('f1', { status: 'active' }, admin)).resolves.toMatchObject({ status: 'active' });
  });

  it('does not blank the email on a status-only update', async () => {
    withStatus('active');
    const saved = await update('f1', { status: 'inactive' }, manager);
    expect(saved).not.toHaveProperty('email');
    const edited = await update('f1', { email: ' New@B.CO ' }, manager);
    expect(edited.email).toBe('new@b.co');
  });

  it('only deletes permanently after archiving', async () => {
    withStatus('active');
    await expect(remove('f1', admin)).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.deleteById).not.toHaveBeenCalled();
    withStatus('archived');
    await remove('f1', admin);
    expect(repo.deleteById).toHaveBeenCalledWith('f1');
  });
});
