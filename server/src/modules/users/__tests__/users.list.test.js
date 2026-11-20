import { describe, expect, it, vi } from 'vitest';

const findAllUsers = vi.fn(async () => ({ users: [], total: 0 }));
vi.mock('../../auth/auth.repository.js', () => ({ findAllUsers }));
vi.mock('../../employees/employee.service.js', () => ({
  getProfileMap: async () => new Map(),
  getCompensationMap: async () => new Map(),
  serializeUserEmployment: (u) => u,
}));

const { list } = await import('../users.controller.js');

const run = (query) => list({ query: { page: 1, limit: 10, ...query }, user: { role: 'employee' } }, { status: () => ({ json: () => {} }) }, (e) => { throw e; });

describe('GET /users location filter', () => {
  it('filters a city team to that location, staff only', async () => {
    await run({ location: 'Delhi', isActive: true });
    expect(findAllUsers.mock.lastCall[0]).toEqual({ location: 'Delhi', role: { $ne: 'client' }, isActive: true });
  });

  it("'none' finds staff without a location", async () => {
    await run({ location: 'none' });
    expect(findAllUsers.mock.lastCall[0]).toEqual({ location: null, role: { $ne: 'client' } });
  });
});
