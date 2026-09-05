import { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, Bell, Volume2, VolumeX, Search, User, Settings, LogOut } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
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

export default function Header({ onMobileMenuOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = useSelector((state) => state.ui.pageTitle);
  const routeTitle = location.pathname.startsWith('/invoices')
    ? (location.pathname === '/invoices' ? 'Invoices' : 'Invoice Detail')
    : location.pathname.startsWith('/payments')
      ? (location.pathname === '/payments' ? 'Payments' : 'Payment Detail')
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
        className={cn('flex items-start gap-3 px-4 py-3 bg-white rounded-lg shadow-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-all w-80')}>
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', cfg.iconBg)}>
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-700 leading-snug">{notification.message}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    ), { duration: 4000, position: 'top-right' });
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
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          aria-label="Toggle sidebar"
          onClick={() => dispatch(toggleSidebar())}
          className="hidden lg:flex p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
        >
          <Menu className="w-4.5 h-4.5" strokeWidth={1.5} />
        </button>
        <button
          aria-label="Open navigation menu"
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
        >
          <Menu className="w-4.5 h-4.5" strokeWidth={1.5} />
        </button>
        <h1 className="font-heading text-base font-semibold text-primary-900">
          {routeTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center bg-zinc-50 rounded-lg px-3 py-1.5 border border-zinc-200">
          <Search className="w-3.5 h-3.5 text-zinc-400 mr-2" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm text-zinc-600 placeholder-zinc-400 w-36"
          />
        </div>

        <div className="relative" ref={notifRef}>
          <button aria-label={`${unreadCount > 0 ? `${unreadCount} unread ` : ''}Notifications`} onClick={async () => { await primeNotificationSound(); setShowNotifDropdown(!showNotifDropdown); }}
            className={cn('relative p-2 rounded-lg hover:bg-zinc-100 transition-colors', unreadCount > 0 ? 'text-primary-900' : 'text-zinc-400')}>

            <Bell className="w-4.5 h-4.5" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-zinc-200 rounded-lg shadow-lg z-50">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100">
                <div>
                  <p className="text-sm font-semibold text-primary-900">Notifications</p>
                  <p className="text-[11px] text-zinc-400">{unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'} onClick={handleSoundToggle} className="p-1.5 rounded-md text-zinc-400 hover:text-primary-900 hover:bg-zinc-100" title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}>
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>
                  {unreadCount > 0 && (
                    <button onClick={() => markAllRead()} className="text-xs text-primary-900 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-6">No new notifications</p>
                ) : (
                  notifications.map((n) => {
                    const cfg = NOTIFICATION_CONFIG[n.type] || NOTIFICATION_CONFIG.system;
                    const Icon = cfg.icon;
                    return (
                      <button key={n._id} onClick={() => { if (!n.read) socketMarkRead(n._id); navigate(notificationPath(n)); setShowNotifDropdown(false); }}
                        className={cn('w-full text-left px-3 py-2.5 hover:bg-zinc-50 border-b border-zinc-50 last:border-0 flex items-start gap-2.5',
                          !n.read && 'bg-blue-50/30')}>
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', cfg.iconBg)}>
                          <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm leading-snug', !n.read ? 'text-zinc-900 font-medium' : 'text-zinc-600')}>
                            {n.message}
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-100 bg-zinc-50/60">
                <span className="text-[11px] text-zinc-400">Sound {soundEnabled ? 'on' : 'off'}</span>
                {user?.role !== 'client' && (
                  <button onClick={() => { navigate('/notifications'); setShowNotifDropdown(false); }}
                    className="text-xs font-medium text-primary-900 hover:underline">
                    View all notifications
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {user && (
          <div className="relative pl-2 border-l border-zinc-200 ml-1" ref={dropdownRef}>
            <button
              aria-label="Open account menu"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center">
                <span className="text-primary-900 font-medium text-xs">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg py-1">
                <div className="px-3 py-2 border-b border-zinc-100">
                  <p className="text-sm font-medium text-primary-900 truncate">{user.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
                {user?.role !== 'client' && (
                  <button
                    onClick={() => { setShowDropdown(false); navigate('/settings'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Settings
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
