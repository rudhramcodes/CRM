import { useState, useCallback } from 'react';
import { UserPlus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import Modal from '../../../components/ui/Modal';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../../components/ui/Select';
import {
  useGetUsersQuery, useGetUserStatsQuery,
  useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation,
} from '../../../services/userApi';
import { canAccessPayroll } from '../../../utils/access';
import { formatCurrencyExact, formatDate } from '../../../utils/formatters';

const ROLES_LIST = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'client', label: 'Client' },
];

const CREATABLE_ROLES = ROLES_LIST.filter((role) => role.value !== 'super_admin');

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-amber-100 text-amber-700',
  employee: 'bg-zinc-100 text-zinc-700',
  client: 'bg-green-100 text-green-700',
};

const inputClass = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900';

const dateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export default function UserManagement() {
  const currentUser = useSelector((state) => state.auth.user);
  const canManagePayroll = canAccessPayroll(currentUser);
  const [filters, setFilters] = useState({ search: '', role: '' });
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryParams = { page, limit: 10 };
  if (filters.search) queryParams.search = filters.search;
  if (filters.role) queryParams.role = filters.role;

  const { data, isLoading } = useGetUsersQuery(queryParams);
  const { data: statsData } = useGetUserStatsQuery();
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const users = data?.data?.users || [];
  const pagination = data?.data;
  const stats = statsData?.data || {};

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget).unwrap();
      toast.success('User deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete user');
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteUser]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">People & Employees</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage access, employee records, and payroll-ready details.</p>
        </div>
        <Button onClick={() => { setEditUser(null); setShowForm(true); }}>
          <UserPlus className="w-4 h-4" /> Create User
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ROLES_LIST.map((r) => (
          <div key={r.value} className="bg-white rounded-lg border border-zinc-200 p-3">
            <p className="text-xs text-zinc-400 uppercase">{r.label}</p>
            <p className="text-xl font-bold text-zinc-900 mt-0.5">{stats[r.value] || 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Search by name or email..." value={filters.search}
            onChange={(e) => { setFilters((p) => ({ ...p, search: e.target.value })); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white" />
        </div>
        <Select value={filters.role || 'all'}
          onValueChange={(v) => { setFilters((p) => ({ ...p, role: v === 'all' ? '' : v })); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES_LIST.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={6} /></div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Create a user to get started." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Employee ID</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Designation</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Role</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Joined</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Status</th>
                    {canManagePayroll && (
                      <th className="text-right px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Salary</th>
                    )}
                    <th className="text-right px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary-900 text-white text-xs flex items-center justify-center font-medium">
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900">{u.name}</p>
                            <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600">{u.profile?.employeeId || '—'}</td>
                      <td className="px-4 py-3 text-zinc-600">{u.profile?.designation || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-zinc-100 text-zinc-700'}`}>
                          {ROLES_LIST.find((r) => r.value === u.role)?.label || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {u.profile?.dateOfJoining ? formatDate(u.profile.dateOfJoining) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${u.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canManagePayroll && (
                        <td className="px-4 py-3 text-right text-zinc-600">
                          {u.compensation?.monthlyGrossSalary
                            ? formatCurrencyExact(u.compensation.monthlyGrossSalary)
                            : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button"
                            onClick={() => { setEditUser(u); setShowForm(true); }}
                            className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors rounded"
                            title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {currentUser?.role === 'super_admin' && u.role !== 'super_admin' && (
                            <button type="button"
                              onClick={() => setDeleteTarget(u._id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors rounded"
                              title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200">
                <span className="text-sm text-zinc-500">Page {pagination.page} of {pagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg disabled:opacity-50">Previous</button>
                  <button disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <UserFormModal
          user={editUser}
          canManagePayroll={canManagePayroll}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSave={async (formData) => {
            if (editUser) {
              await updateUser({ id: editUser._id, ...formData }).unwrap();
              toast.success('User updated');
            } else {
              await createUser(formData).unwrap();
              toast.success('User created');
            }
            setShowForm(false);
            setEditUser(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? Users with payroll history cannot be deleted."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function UserFormModal({ user, canManagePayroll, onClose, onSave }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
    phone: user?.phone || '',
    designation: user?.profile?.designation || '',
    dateOfJoining: dateInput(user?.profile?.dateOfJoining),
    dateOfLeaving: dateInput(user?.profile?.dateOfLeaving),
    monthlyGrossSalary: user?.compensation?.monthlyGrossSalary ?? '',
    salaryEffectiveFrom: dateInput(user?.compensation?.salaryEffectiveFrom),
    bankName: user?.compensation?.bankName || '',
    bankAccountNumber: user?.compensation?.bankAccountNumber || '',
    ifscCode: user?.compensation?.ifscCode || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isStaff = !['client', 'super_admin'].includes(form.role);

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (!user && !form.password) { setError('Password is required'); return; }
    if (!user && form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!user && (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password))) {
      setError('Password must include uppercase, lowercase, and a number');
      return;
    }
    if (isStaff && !form.dateOfJoining) { setError('Date of joining is required for staff'); return; }

    const data = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      phone: form.phone,
    };
    if (form.password) data.password = form.password;

    if (isStaff) {
      data.designation = form.designation.trim() || null;
      data.dateOfJoining = form.dateOfJoining;
      data.dateOfLeaving = form.dateOfLeaving || null;
    }

    if (isStaff && canManagePayroll) {
      data.monthlyGrossSalary = form.monthlyGrossSalary === '' ? 0 : Number(form.monthlyGrossSalary);
      data.salaryEffectiveFrom = form.salaryEffectiveFrom || null;
      data.bankName = form.bankName.trim() || null;
      data.bankAccountNumber = form.bankAccountNumber.trim() || null;
      data.ifscCode = form.ifscCode.trim().toUpperCase() || null;
    }

    setSaving(true);
    try {
      await onSave(data);
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? 'Edit person' : 'Create person'}
      description={user ? 'Update access and employment details.' : 'A staff employee ID is generated automatically.'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Account</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Name</label>
              <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">
                Password {user && <span className="font-normal text-zinc-300">(leave blank to keep)</span>}
              </label>
              <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
                placeholder={user ? 'Leave blank to keep' : ''} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Role</label>
            <Select value={form.role} onValueChange={(value) => update('role', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(user?.role === 'super_admin' ? ROLES_LIST.filter((role) => role.value === 'super_admin') : CREATABLE_ROLES)
                  .map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        {isStaff && (
          <section className="space-y-4 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Employment</h3>
              {user?.profile?.employeeId && (
                <span className="font-mono text-xs text-zinc-400">{user.profile.employeeId}</span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Designation</label>
                <input type="text" value={form.designation} onChange={(e) => update('designation', e.target.value)}
                  placeholder="e.g. Video Editor" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Date of joining</label>
                <input type="date" value={form.dateOfJoining} onChange={(e) => update('dateOfJoining', e.target.value)}
                  className={inputClass} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Date of leaving</label>
                <input type="date" value={form.dateOfLeaving} onChange={(e) => update('dateOfLeaving', e.target.value)}
                  className={inputClass} />
                <p className="mt-1 text-xs text-zinc-400">Optional. Use the last working day; that day is paid and later days are prorated on a 30-day basis.</p>
              </div>
            </div>
          </section>
        )}

        {isStaff && canManagePayroll && (
          <section className="space-y-4 border-t border-zinc-100 pt-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Compensation</h3>
              <p className="mt-1 text-xs text-zinc-400">Visible only to payroll admins. Missing salary or bank details block finalization.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Monthly gross salary</label>
                <input type="number" min="0" step="0.01" value={form.monthlyGrossSalary}
                  onChange={(e) => update('monthlyGrossSalary', e.target.value)} placeholder="0.00" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Salary effective from</label>
                <input type="date" value={form.salaryEffectiveFrom}
                  onChange={(e) => update('salaryEffectiveFrom', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Bank name</label>
                <input type="text" value={form.bankName} onChange={(e) => update('bankName', e.target.value)}
                  placeholder="e.g. HDFC Bank" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">Bank account number</label>
                <input type="text" value={form.bankAccountNumber}
                  onChange={(e) => update('bankAccountNumber', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400 uppercase tracking-wide">IFSC code</label>
                <input type="text" value={form.ifscCode}
                  onChange={(e) => update('ifscCode', e.target.value.toUpperCase())} className={inputClass} />
              </div>
            </div>
          </section>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{user ? 'Update' : 'Create User'}</Button>
        </div>
      </form>
    </Modal>
  );
}
