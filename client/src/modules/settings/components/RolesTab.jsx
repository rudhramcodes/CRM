import { useMemo, useState } from 'react';
import { Check, Search, Shield, Users } from 'lucide-react';
import { useGetRolesPermissionsQuery } from '../../../services/settingsApi';

const ROLES = ['super_admin', 'admin', 'manager', 'employee', 'client'];

const ROLE_META = {
  super_admin: { label: 'Super Admin', description: 'Full control across the entire workspace', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
  admin: { label: 'Admin', description: 'Manage operations, people, and settings', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  manager: { label: 'Manager', description: 'Coordinate teams, work, and reports', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  employee: { label: 'Employee', description: 'Access assigned work and collaboration tools', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  client: { label: 'Client', description: 'View shared projects, tasks, and billing', tone: 'border-zinc-200 bg-zinc-50 text-zinc-700' },
};

const PERMISSION_GROUPS = [
  { module: 'Users', prefix: 'users', perms: ['read', 'create', 'update', 'delete', 'manage_roles'] },
  { module: 'Leads', prefix: 'leads', perms: ['read', 'create', 'update', 'delete'] },
  { module: 'Clients', prefix: 'clients', perms: ['read', 'create', 'update', 'delete'] },
  { module: 'Projects', prefix: 'projects', perms: ['read', 'create', 'update', 'delete'] },
  { module: 'Tasks', prefix: 'tasks', perms: ['read', 'create', 'update', 'delete'] },
  { module: 'Invoices', prefix: 'invoices', perms: ['read', 'create', 'update', 'delete'] },
  { module: 'Payments', prefix: 'payments', perms: ['read', 'create', 'update', 'delete'] },
  { module: 'Meetings', prefix: 'meetings', perms: ['read', 'create', 'update', 'delete'] },
  { module: 'Reports', prefix: 'reports', perms: ['read', 'create'] },
  { module: 'Settings', prefix: 'settings', perms: ['read', 'update'] },
];

const permToKey = (prefix, permission) => `${prefix}:${permission}`;
const formatPermission = (permission) => permission.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function RolesTab() {
  const { data: rolesData, isLoading, isError } = useGetRolesPermissionsQuery();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [search, setSearch] = useState('');

  const enabled = useMemo(() => new Set(rolesData?.[selectedRole] || []), [rolesData, selectedRole]);
  const selectedRoleMeta = ROLE_META[selectedRole];
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PERMISSION_GROUPS;
    return PERMISSION_GROUPS.map((group) => ({
      ...group,
      perms: group.perms.filter((permission) => `${group.module} ${permission}`.toLowerCase().includes(query)),
    })).filter((group) => group.module.toLowerCase().includes(query) || group.perms.length > 0);
  }, [search]);

  if (isLoading) return <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 text-sm text-zinc-400">Loading role access…</div>;
  if (isError) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load role access right now.</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-primary-900 p-2.5 text-white"><Shield className="h-5 w-5" /></div><div><h3 className="text-base font-semibold text-zinc-900">Role Access</h3><p className="mt-1 text-sm text-zinc-500">View what each role can access in the CRM. This screen is read-only.</p></div></div>
          <div className="flex items-center gap-2 rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-500"><Users className="h-3.5 w-3.5" />{ROLES.length} system roles</div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((role) => { const meta = ROLE_META[role]; const count = rolesData?.[role]?.length || 0; return <button key={role} type="button" onClick={() => { setSelectedRole(role); setSearch(''); }} className={`rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${selectedRole === role ? 'border-primary-900 bg-primary-900 text-white shadow-md' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{meta.label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedRole === role ? 'bg-white/15 text-white' : meta.tone}`}>{count}</span></div><p className={`mt-1 text-[11px] leading-4 ${selectedRole === role ? 'text-white/65' : 'text-zinc-400'}`}>{meta.description}</p></button>; })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-zinc-900">{selectedRoleMeta.label} access</p><p className="mt-1 text-xs text-zinc-500">{enabled.size} permissions enabled</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search access" className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary-900 focus:bg-white focus:ring-2 focus:ring-primary-900/10" /></div></div>
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {filteredGroups.map((group) => { const activePermissions = group.perms.filter((permission) => enabled.has(permToKey(group.prefix, permission))); return <div key={group.module} className="rounded-xl border border-zinc-200 p-4"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-zinc-800">{group.module}</h4><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${activePermissions.length ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`}>{activePermissions.length}/{group.perms.length}</span></div>{activePermissions.length ? <div className="mt-3 flex flex-wrap gap-2">{activePermissions.map((permission) => <span key={permission} className="inline-flex items-center gap-1 rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-600"><Check className="h-3 w-3 text-emerald-500" />{formatPermission(permission)}</span>)}</div> : <p className="mt-3 text-xs text-zinc-400">No access configured</p>}</div>; })}
          {filteredGroups.length === 0 && <div className="col-span-full py-10 text-center text-sm text-zinc-400">No access matches “{search}”.</div>}
        </div>
        <div className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-400">Access shown is the current server configuration. Changes are managed by the system administrator.</div>
      </div>
    </div>
  );
}
