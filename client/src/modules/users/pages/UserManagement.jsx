import { useState, useCallback } from 'react';
import { UserPlus, Search, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../../components/ui/Select';
import {
  useGetUsersQuery, useGetUserStatsQuery,
  useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation,
} from '../../../services/userApi';

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

export default function UserManagement() {
  const user = useSelector((state) => state.auth.user);
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
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
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
        <h1 className="text-2xl font-bold text-zinc-900">User Management</h1>
        <Button onClick={() => { setEditUser(null); setShowForm(true); }}>
          <UserPlus className="w-4 h-4" /> Create User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ROLES_LIST.map((r) => (
          <div key={r.value} className="bg-white rounded-lg border border-zinc-200 p-3">
            <p className="text-xs text-zinc-400 uppercase">{r.label}</p>
            <p className="text-xl font-bold text-zinc-900 mt-0.5">{stats[r.value] || 0}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
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

      {/* Table */}
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
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Role</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">Created</th>
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
                          <span className="font-medium text-zinc-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-zinc-100 text-zinc-700'}`}>
                          {ROLES_LIST.find((r) => r.value === u.role)?.label || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${u.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button"
                            onClick={() => { setEditUser(u); setShowForm(true); }}
                            className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors rounded"
                            title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {user?.role === 'super_admin' && u.role !== 'super_admin' && (
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
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function UserFormModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (!user && !form.password) { setError('Password is required'); return; }
    if (!user && form.password.length < 6) { setError('Password must be at least 6 characters'); return; }

    const data = { name: form.name.trim(), email: form.email.trim(), role: form.role, phone: form.phone };
    if (form.password) data.password = form.password;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">{user ? 'Edit User' : 'Create User'}</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Name</label>
            <input type="text" value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" required />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Email</label>
            <input type="email" value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" required />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">
              Password {user && <span className="text-zinc-300 font-normal">(leave blank to keep current)</span>}
            </label>
            <input type="password" value={form.password} placeholder={user ? 'Leave blank to keep' : ''}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Role</label>
            <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(user?.role === 'super_admin' ? ROLES_LIST.filter((r) => r.value === 'super_admin') : CREATABLE_ROLES)
                  .map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Phone</label>
            <input type="tel" value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{user ? 'Update' : 'Create User'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
