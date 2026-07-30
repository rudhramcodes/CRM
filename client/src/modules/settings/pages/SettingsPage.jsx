import { useState, useMemo } from 'react';
import { User, Bell, Building2, Shield, Key, ScrollText, Lock, Plug } from 'lucide-react';
import ProfileTab from '../components/ProfileTab';
import NotificationsTab from '../components/NotificationsTab';
import OrganizationTab from '../components/OrganizationTab';
import RolesTab from '../components/RolesTab';
import SecurityTab from '../components/SecurityTab';
import IntegrationsTab from '../components/IntegrationsTab';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'organization', label: 'Organization', icon: Building2, roles: ['super_admin', 'admin'] },
  { id: 'security', label: 'Security', icon: Lock, roles: ['super_admin', 'admin'] },
  { id: 'integrations', label: 'Integrations', icon: Plug, roles: ['super_admin', 'admin'] },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield, roles: ['super_admin'] },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const userRole = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.role;
    } catch { return null; }
  }, []);

  const visibleTabs = TABS.filter((t) => t.roles.includes(userRole));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary-900">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account and application settings</p>
      </div>

      <div className="flex gap-6">
        <nav className="w-48 shrink-0 space-y-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                  activeTab === tab.id
                    ? 'bg-primary-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'organization' && <OrganizationTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'roles' && <RolesTab />}
        </div>
      </div>
    </div>
  );
}
