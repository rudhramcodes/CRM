import { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, Bell, Volume2, VolumeX, Search, User, Settings, LogOut, ChevronDown, Check } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { toggleSidebar } from '../app/store/uiSlice';
import { logout } from '../app/store/authSlice';
import { useGetUnreadCountQuery, useGetNotificationsQuery, useMarkAllNotificationsReadMutation } from '../services/notificationApi';
import { NOTIFICATION_CONFIG } from '../modules/notifications/constants';
import useSocketNotifications from '../modules/notifications/hooks/useSocketNotifications';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { cn } from '../utils/cn';
import { isNotificationSoundEnabled, playNotificationSound, primeNotificationSound, setNotificationSoundEnabled } from '../utils/notificationSound';
import CommandPalette from '../components/ui/CommandPalette';

export default function Header({ onMobileMenuOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = useSelector((state) => state.ui.pageTitle);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const [isCmdOpen, setIsCmdOpen] = useState(false);

  // Compute readable route title
  const routeTitle = location.pathname.startsWith('/invoices')
    ? (location.pathname === '/invoices' ? 'Invoices' : 'Invoice Detail')
    : location.pathname.startsWith('/payments')
      ? (location.pathname === '/payments' ? 'Payments' : 'Payment Detail')
      : location.pathname === '/dashboard'
        ? 'Dashboard'
        : location.pathname.startsWith('/leads')
          ? (location.pathname === '/leads' ? 'Leads Pipeline' : location.pathname === '/leads/new' ? 'New Lead' : 'Lead Detail')
          : location.pathname.startsWith('/clients')
            ? (location.pathname === '/clients' ? 'Clients Directory' : location.pathname === '/clients/new' ? 'New Client' : 'Client Detail')
            : location.pathname.startsWith('/meetings')
              ? (location.pathname === '/meetings' ? 'Meetings & Calendar' : 'Meeting Detail')
              : location.pathname.startsWith('/projects')
                ? (location.pathname === '/projects' ? 'Projects & Tasks' : 'Project Detail')
                : location.pathname.startsWith('/freelancers')
                  ? (location.pathname === '/freelancers' ? 'Freelancers Network' : location.pathname === '/freelancers/new' ? 'New Freelancer' : 'Freelancer Detail')
                  : location.pathname.startsWith('/attendance')
                    ? 'Attendance & Shifts'
                    : location.pathname === '/notifications'
                      ? 'Notifications Center'
                      : location.pathname === '/users'
                        ? 'User Management'
                        : location.pathname === '/settings'
                          ? 'Workspace Settings'
                          : pageTitle;
  const user = useSelector((state) => state.auth.user);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const [liveUnreadCount, setLiveUnreadCount] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => isNotificationSoundEnabled());
  const notificationPath = (notification) => notification.type === 'regularization_request' ? '/attendance/regularization' : (notification.link || (notification.type?.startsWith('regularization_') ? '/attendance' : '/notifications'));

  const { data: unreadData } = useGetUnreadCountQuery(undefined, { skip: !user, pollingInterval: 30000 });
  const { data: notifData } = useGetNotificationsQuery({ limit: 5, read: 'false' }, { skip: !user || !showNotifDropdown });
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const handleNewNotification = useCallback((notification) => {
    playNotificationSound();
    const cfg = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.system;
    const Icon = cfg.icon;
    toast.custom((t) => (
      <div onClick={() => { toast.dismiss(t.id); navigate(notificationPath(notification)); }}
        className={cn('flex items-start gap-3 px-4 py-3 bg-white rounded-2xl shadow-xl border border-zinc-200/80 cursor-pointer hover:bg-zinc-50 transition-all w-88')}>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm', cfg.iconBg)}>
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-xs font-semibold text-zinc-900 truncate mb-0.5">{notification.title}</p>
          )}
          <p className="text-sm text-zinc-700 leading-snug">{notification.message}</p>
          <p className="text-[10px] text-zinc-400 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt || Date.now()), { addSuffix: true })}
          </p>
        </div>
      </div>
    ), { duration: 5000, position: 'top-right' });
  }, [navigate]);

  const handleSoundToggle = async () => {
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled);
    setNotificationSoundEnabled(nextEnabled);
    if (nextEnabled) await primeNotificationSound();
  };

  const handleUnreadChange = useCallback((count) => {
    setLiveUnreadCount(count);
  }, []);

  const { markRead: socketMarkRead } = useSocketNotifications({
    onNew: handleNewNotification,
    onUnreadChange: handleUnreadChange,
  });

  const unreadCount = liveUnreadCount !== null ? liveUnreadCount : (unreadData?.data?.count || 0);
  const notifications = notifData?.data || [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const primeOnInteraction = () => {
      primeNotificationSound();
      document.removeEventListener('click', primeOnInteraction);
      document.removeEventListener('keydown', primeOnInteraction);
    };
    document.addEventListener('click', primeOnInteraction);
    document.addEventListener('keydown', primeOnInteraction);
    return () => {
      document.removeEventListener('click', primeOnInteraction);
      document.removeEventListener('keydown', primeOnInteraction);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        dispatch(toggleSidebar());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
    } catch {
      // Proceed with local logout even if API fails
    }
    dispatch(logout());
    navigate(user?.role === 'client' ? '/portal/login' : '/auth/login');
  };

  return (
    <>
    <header className="h-16 bg-white border-b border-zinc-200/80 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Left Area: Sidebar Toggle & Page Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          onClick={() => dispatch(toggleSidebar())}
          className="hidden lg:flex p-2 rounded-xl hover:bg-zinc-100 text-zinc-600 hover:text-primary-900 transition-all duration-150 cursor-pointer active:scale-95"
          title={sidebarOpen ? 'Collapse sidebar (⌘B)' : 'Expand sidebar (⌘B)'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5 text-zinc-600 hover:text-primary-900 transition-colors" strokeWidth={1.8} />
          ) : (
            <PanelLeftOpen className="w-5 h-5 text-zinc-600 hover:text-primary-900 transition-colors" strokeWidth={1.8} />
          )}
        </button>
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 rounded-xl hover:bg-zinc-100 text-zinc-600 hover:text-primary-900 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" strokeWidth={1.8} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 hidden md:inline shrink-0">
            Workspace /
          </span>
          <h1 className="text-base sm:text-lg font-bold text-primary-900 tracking-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
            {routeTitle}
          </h1>
        </div>
      </div>

      {/* Right Area: Search, Notifications & User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Command Search Trigger */}
        <button
          type="button"
          onClick={() => setIsCmdOpen(true)}
          className="hidden sm:flex items-center bg-zinc-50 hover:bg-zinc-100/90 active:bg-zinc-100 rounded-xl px-3.5 py-1.5 border border-zinc-200/80 transition-all text-left group cursor-pointer"
        >
          <Search className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0 group-hover:text-primary-900 transition-colors" strokeWidth={1.8} />
          <span className="text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-600 transition-colors w-32 sm:w-44 lg:w-56 font-normal truncate">
            Search or jump to...
          </span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 bg-white rounded border border-zinc-200/90 select-none shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search Trigger Button */}
        <button
          type="button"
          onClick={() => setIsCmdOpen(true)}
          className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl text-zinc-600 hover:text-primary-900 bg-zinc-100/80 hover:bg-zinc-100 transition-colors active:scale-95"
          aria-label="Open command search"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4" strokeWidth={2} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            aria-label={`${unreadCount > 0 ? `${unreadCount} unread ` : ''}Notifications`}
            onClick={async () => {
              await primeNotificationSound();
              setShowNotifDropdown(!showNotifDropdown);
            }}
            className={cn(
              'relative p-2.5 rounded-xl transition-all duration-150',
              showNotifDropdown
                ? 'bg-zinc-100 text-primary-900'
                : unreadCount > 0
                  ? 'text-primary-900 hover:bg-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100',
            )}
          >
            <Bell className="w-5 h-5" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm ring-2 ring-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Mobile backdrop for notification dropdown - below navbar with NO blur */}
          {showNotifDropdown && (
            <div
              className="fixed top-16 inset-x-0 bottom-0 bg-black/15 z-40 sm:hidden"
              onClick={() => setShowNotifDropdown(false)}
            />
          )}

          <AnimatePresence>
            {showNotifDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-24px)] bg-white border border-zinc-200/90 rounded-2xl shadow-[0_24px_50px_-15px_rgba(0,0,0,0.25)] z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                  <div>
                    <p className="text-sm font-semibold text-primary-900 tracking-tight">Notifications</p>
                    <p className="text-[11px] text-zinc-500">
                      {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'You’re all caught up'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
                      onClick={handleSoundToggle}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-200/60 transition-colors"
                      title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllRead()}
                        className="text-xs font-semibold text-primary-900 hover:underline px-2 py-1 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-8 h-8 text-zinc-300 mx-auto mb-2" strokeWidth={1.5} />
                      <p className="text-sm text-zinc-700 font-medium">No new notifications</p>
                      <p className="text-xs text-zinc-400 mt-0.5">We&apos;ll notify you when changes occur.</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const cfg = NOTIFICATION_CONFIG[n.type] || NOTIFICATION_CONFIG.system;
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={n._id}
                          onClick={() => {
                            if (!n.read) socketMarkRead(n._id);
                            navigate(notificationPath(n));
                            setShowNotifDropdown(false);
                          }}
                          className={cn(
                            'w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors flex items-start gap-3 group cursor-pointer',
                            !n.read && 'bg-blue-50/20',
                          )}
                        >
                          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm', cfg.iconBg)}>
                            <Icon className="w-4 h-4" strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs leading-snug', !n.read ? 'text-zinc-900 font-semibold' : 'text-zinc-600 font-normal')}>
                              {n.message}
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/80">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    Sound alerts: <strong className="text-zinc-600 font-medium">{soundEnabled ? 'Enabled' : 'Disabled'}</strong>
                  </span>
                  {user?.role !== 'client' && (
                    <button
                      onClick={() => {
                        navigate('/notifications');
                        setShowNotifDropdown(false);
                      }}
                      className="text-xs font-semibold text-primary-900 hover:underline cursor-pointer"
                    >
                      View all notifications →
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Avatar & Dropdown */}
        {user && (
          <div className="relative pl-1.5 border-l border-zinc-200/80" ref={dropdownRef}>
            <button
              aria-label="Open account menu"
              onClick={() => setShowDropdown(!showDropdown)}
              className={cn(
                'flex items-center gap-2 p-1.5 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer',
                showDropdown && 'bg-zinc-100',
              )}
            >
              <div className="relative">
                <div className="w-8 h-8 bg-primary-900 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-sm">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-400 transition-transform hidden sm:block', showDropdown && 'rotate-180')} />
            </button>

            {/* Mobile backdrop for profile dropdown - below navbar with NO blur */}
            {showDropdown && (
              <div
                className="fixed top-16 inset-x-0 bottom-0 bg-black/15 z-40 sm:hidden"
                onClick={() => setShowDropdown(false)}
              />
            )}

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-64 max-w-[calc(100vw-24px)] bg-white border border-zinc-200/90 rounded-2xl shadow-[0_20px_45px_-15px_rgba(0,0,0,0.2)] py-1.5 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/60">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 bg-primary-900 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-primary-900 tracking-tight truncate">{user.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200/80 capitalize">
                          {user.role?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    {user?.role !== 'client' && (
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 hover:text-primary-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-zinc-400" strokeWidth={1.8} />
                        <span>Workspace Settings</span>
                      </button>
                    )}

                    {user?.role !== 'client' && (
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/notifications');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-700 hover:text-primary-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Bell className="w-4 h-4 text-zinc-400" strokeWidth={1.8} />
                          <span>Notifications</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>
                    )}

                    <div className="my-1 border-t border-zinc-100" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" strokeWidth={1.8} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>

    {/* Command Palette (⌘K) */}
    <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} />
    </>
  );
}

