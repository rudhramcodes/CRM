import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Save, Check, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { useGetRolesPermissionsQuery, useUpdateRolePermissionsMutation } from '../../../services/settingsApi';

const ROLES = ['super_admin', 'admin', 'manager', 'employee', 'client'];

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

const permToKey = (prefix, perm) => `${prefix}:${perm}`;

export default function RolesTab() {
  const { data: rolesData, isLoading } = useGetRolesPermissionsQuery();
  const [updateRolePermissions, { isLoading: isSaving }] = useUpdateRolePermissionsMutation();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [enabled, setEnabled] = useState(new Set());

  useEffect(() => {
    if (rolesData?.[selectedRole]) {
      setEnabled(new Set(rolesData[selectedRole]));
    }
  }, [rolesData, selectedRole]);

  const toggle = (permKey) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(permKey)) next.delete(permKey);
      else next.add(permKey);
      return next;
    });
  };

  const groupAllEnabled = (group) =>
    group.perms.every((p) => enabled.has(permToKey(group.prefix, p)));

  const toggleGroup = (group) => {
    const allOn = groupAllEnabled(group);
    setEnabled((prev) => {
      const next = new Set(prev);
      for (const p of group.perms) {
        const key = permToKey(group.prefix, p);
        if (allOn) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const permissions = [...enabled].sort();
    try {
      await updateRolePermissions({ role: selectedRole, permissions }).unwrap();
      toast.success(`"${selectedRole.replace('_', ' ')}" permissions updated`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update permissions');
    }
  };

  if (isLoading) return <div className="text-sm text-zinc-400 py-8 text-center">Loading...</div>;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6">
      <h3 className="text-sm font-semibold text-primary-900 mb-1 flex items-center gap-2">
        <Shield className="w-4 h-4" /> Roles & Permissions
      </h3>
      <p className="text-xs text-zinc-500 mb-4">Select a role and configure its permissions.</p>

      {/* Role selector */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors capitalize ${
              selectedRole === role
                ? 'bg-primary-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {role.replace('_', ' ')}
            {rolesData?.[role] && (
              <span className="ml-1.5 text-[10px] opacity-60">({rolesData[role].length})</span>
            )}
          </button>
        ))}
      </div>

      {selectedRole === 'super_admin' && (
        <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Super Admin always has all permissions. Changes to this role apply to all super admin users.</span>
        </div>
      )}

      {/* Permission groups */}
      <div className="space-y-3 max-w-lg">
        {PERMISSION_GROUPS.map((group) => {
          const allOn = groupAllEnabled(group);
          return (
            <div key={group.module} className="border border-zinc-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <span>{group.module}</span>
                <span className={`text-xs font-normal flex items-center gap-1 ${
                  allOn ? 'text-green-600' : 'text-zinc-400'
                }`}>
                  {allOn ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {allOn ? 'All' : group.perms.filter((p) => enabled.has(permToKey(group.prefix, p))).length}/{group.perms.length}
                </span>
              </button>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-0.5 px-3 py-2">
                {group.perms.map((perm) => {
                  const key = permToKey(group.prefix, perm);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 py-0.5 text-sm text-zinc-600 cursor-pointer hover:text-zinc-800"
                    >
                      <input
                        type="checkbox"
                        checked={enabled.has(key)}
                        onChange={() => toggle(key)}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-primary-900 focus:ring-primary-900"
                      />
                      {perm.replace(/_/g, ' ')}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-xs text-zinc-400">{enabled.size} permissions enabled</span>
        <Button onClick={handleSave} loading={isSaving}>
          <Save className="w-3.5 h-3.5" /> Save {selectedRole.replace('_', ' ')}
        </Button>
      </div>
    </div>
  );
}
