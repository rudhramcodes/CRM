import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { X, Settings, LogOut } from 'lucide-react';
import axios from 'axios';
import { cn } from '../utils/cn';
import { NAV_ITEMS, API_BASE_URL } from '../constants';
import { useGetOrgSettingsQuery } from '../services/settingsApi';
import { useGetUnreadCountQuery } from '../services/notificationApi';
import { toggleSidebar } from '../app/store/uiSlice';
import { logout } from '../app/store/authSlice';

const SECTIONS = [
  { id: 'overview', label: 'Overview', paths: ['/dashboard'] },
  { id: 'crm', label: 'CRM & Pipeline', paths: ['/leads', '/clients', '/meetings'] },
  { id: 'operations', label: 'Operations', paths: ['/projects', '/tasks', '/attendance', '/freelancers'] },
  { id: 'financials', label: 'Financials', paths: ['/invoices', '/payments', '/reports'] },
  { id: 'system', label: 'Administration', paths: ['/notifications', '/users', '/settings'] },
];

export default function Sidebar({ open, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const { data: orgSettings } = useGetOrgSettingsQuery();
  const { data: unreadData } = useGetUnreadCountQuery(undefined, { skip: !user, pollingInterval: 30000 });
  const unreadCount = unreadData?.data?.count || 0;

  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
    } catch {
      // Proceed with local logout
    }
    dispatch(logout());
    if (onClose) onClose();
    navigate(user?.role === 'client' ? '/portal/login' : '/auth/login');
  };

  // On mobile (< 1024px), sidebar is ALWAYS expanded as a full drawer.
  // On desktop (>= 1024px), sidebar follows sidebarOpen (w-64 vs w-20).
  const isExpanded = isDesktop ? sidebarOpen : true;

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-white border-r border-zinc-200/80 transition-all duration-300 flex flex-col shadow-[0_4px_30px_rgba(0,0,0,0.03)]',
          'w-72 sm:w-80', // Full drawer width on mobile!
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          sidebarOpen ? 'lg:w-64' : 'lg:w-20',
        )}
      >
        {/* Brand Header */}
        <div className={cn(
          'h-16 border-b border-zinc-200/80 flex items-center transition-all duration-200',
          isExpanded ? 'px-5 justify-between' : 'px-0 justify-center',
        )}>
          {isExpanded ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-heading font-extrabold text-xl tracking-tight text-primary-900 truncate">
                Rudhram
              </span>
              <span className="text-[10px] font-bold bg-primary-900 text-white px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0 shadow-xs">
                CRM
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => dispatch(toggleSidebar())}
              className="flex items-center justify-center w-full focus:outline-none cursor-pointer group"
              title="Expand sidebar (Rudhram CRM)"
            >
              <div className="w-9 h-9 rounded-xl bg-primary-900 text-white flex items-center justify-center font-heading font-black text-base shadow-[0_2px_8px_-2px_rgba(11,11,11,0.25)] group-hover:scale-105 group-hover:shadow-[0_4px_12px_-2px_rgba(11,11,11,0.35)] transition-all select-none">
                R
              </div>
            </button>
          )}

          {/* Close mobile button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-hide">
          {SECTIONS.map((section) => {
            const sectionItems = visibleNavItems.filter((item) =>
              section.paths.includes(item.path),
            );

            if (sectionItems.length === 0) return null;

            return (
              <div key={section.id} className="space-y-1">
                {isExpanded && (
                  <p className="px-3 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    {section.label}
                  </p>
                )}

                <div className="space-y-0.5">
                  {sectionItems.map((item) => {
                    const isAttendance = item.path === '/attendance';
                    const isNotifications = item.path === '/notifications';
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        title={!isExpanded ? item.label : undefined}
                        className={({ isActive }) => {
                          const active = isActive || (isAttendance && location.pathname.startsWith('/attendance'));
                          return cn(
                            'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                            isExpanded ? 'px-3 py-2.5' : 'justify-center p-2.5',
                            active
                              ? 'bg-primary-900 text-white font-semibold shadow-[0_4px_12px_-2px_rgba(11,11,11,0.25)]'
                              : 'text-zinc-600 hover:text-primary-900 hover:bg-zinc-100/80',
                          );
                        }}
                      >
                        {({ isActive }) => {
                          const active = isActive || (isAttendance && location.pathname.startsWith('/attendance'));
                          return (
                            <>
                              <Icon
                                className={cn(
                                  'w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-105',
                                  active ? 'text-white' : 'text-zinc-500 group-hover:text-primary-900',
                                )}
                                strokeWidth={active ? 2 : 1.75}
                              />

                              {isExpanded && (
                                <span className="truncate flex-1 tracking-tight">
                                  {item.label}
                                </span>
                              )}

                              {/* Unread badge on Notifications */}
                              {isNotifications && unreadCount > 0 && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0',
                                    active
                                      ? 'bg-white text-primary-900'
                                      : 'bg-red-500 text-white shadow-sm',
                                    !isExpanded && 'absolute -top-1 -right-1 h-4 min-w-[16px] px-1 flex items-center justify-center',
                                  )}
                                >
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                              )}
                            </>
                          );
                        }}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Card Footer */}
        {user && (
          <div className="p-3 border-t border-zinc-200/80 bg-white">
            {isExpanded ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-zinc-50/90 border border-zinc-200/70 hover:border-zinc-300/80 transition-all">
                <NavLink
                  to="/settings"
                  onClick={onClose}
                  className="flex items-center gap-2.5 min-w-0 flex-1 group"
                  title="Account Settings"
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 bg-primary-900 text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-sm group-hover:scale-105 transition-transform">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary-900 truncate group-hover:text-primary-800">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 capitalize truncate">
                      {user.role?.replace('_', ' ')}
                    </p>
                  </div>
                </NavLink>

                <div className="flex items-center gap-0.5 shrink-0">
                  <NavLink
                    to="/settings"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-200/60 transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <NavLink
                to="/settings"
                className="flex justify-center group p-1 rounded-xl hover:bg-zinc-100 transition-colors"
                title={`${user.name} (${user.role}) - Settings`}
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-primary-900 text-white rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
              </NavLink>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
