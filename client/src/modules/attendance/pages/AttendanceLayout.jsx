import { Outlet } from 'react-router-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { CalendarDays, ClipboardList, Clock, Plane, Gift, BarChart3 } from 'lucide-react';

const TABS = [
  { key: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/attendance', roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { key: 'records', label: 'Records', icon: ClipboardList, path: '/attendance/list', roles: ['super_admin', 'admin', 'manager'] },
  { key: 'shifts', label: 'Shifts', icon: Clock, path: '/attendance/shifts', roles: ['super_admin', 'admin'] },
  { key: 'leaves', label: 'Leaves', icon: Plane, path: '/attendance/leaves', roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { key: 'holidays', label: 'Holidays', icon: Gift, path: '/attendance/holidays', roles: ['super_admin', 'admin', 'manager'] },
  { key: 'reports', label: 'Reports', icon: BarChart3, path: '/attendance/reports', roles: ['super_admin', 'admin', 'manager'] },
];

export default function AttendanceLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const activeTab = TABS.find((t) => t.path === location.pathname)?.key || 'calendar';
  const visibleTabs = TABS.filter((t) => !t.roles || t.roles.includes(user?.role));

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-zinc-200 p-1.5">
        <div className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary-900 text-white'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <Outlet />
    </div>
  );
}
