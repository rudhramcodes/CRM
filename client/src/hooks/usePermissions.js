import { useSelector } from 'react-redux';

const PERMISSION_MAP = {
  super_admin: ['*'],
  admin: ['leads:*', 'clients:*', 'projects:*', 'tasks:*', 'invoices:*', 'payments:*', 'reports:*', 'users:*'],
  manager: ['leads:*', 'clients:*', 'projects:*', 'tasks:*'],
  employee: ['tasks:*', 'projects:view'],
  client: ['projects:view', 'invoices:view', 'payments:create'],
};

export function usePermissions() {
  const user = useSelector((state) => state.auth.user);

  const can = (permission) => {
    if (!user) return false;
    const userPermissions = PERMISSION_MAP[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isSuperAdmin = () => user?.role === 'super_admin';
  const isAdmin = () => user?.role === 'admin';
  const isManager = () => user?.role === 'manager';

  return { can, hasRole, isSuperAdmin, isAdmin, isManager };
}
