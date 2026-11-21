import { describe, expect, it, vi } from 'vitest';

const SA = { _id: 'sa1', role: 'super_admin', email: 'owner@x.com' };
const findById = vi.fn(async () => SA);
const updateUser = vi.fn(async (id, data) => ({ ...SA, ...data }));
vi.mock('../../auth/auth.repository.js', () => ({ findById, updateUser }));
vi.mock('../../employees/employee.service.js', () => ({
  hasCompensationPayload: () => false,
  assertCanManageCompensation: () => {},
  isEmployeeRole: () => false,
  getProfileMap: async () => new Map(),
  getCompensationMap: async () => new Map(),
  serializeUserEmployment: (u) => u,
}));

const { updateUser: update } = await import('../users.service.js');

describe('PATCH /users/:id on the Super Admin', () => {
  it("refuses an admin changing the Super Admin's email (account takeover)", async () => {
    await expect(update('sa1', { email: 'admin@x.com' }, { _id: 'a1', role: 'admin' })).rejects.toThrow(/Only the Super Admin/);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('lets the Super Admin edit their own record', async () => {
    await update('sa1', { name: 'Owner' }, { _id: 'sa1', role: 'super_admin' });
    expect(updateUser).toHaveBeenCalledWith('sa1', expect.objectContaining({ name: 'Owner' }));
  });
});
