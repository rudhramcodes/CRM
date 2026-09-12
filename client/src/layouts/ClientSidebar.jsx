import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Calendar,
  Compass,
  UserCircle,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { logout } from '../app/store/authSlice';

const PORTAL_NAV = [
  { label: 'Dashboard', path: '/portal', icon: LayoutDashboard, end: true },
  { label: 'Projects', path: '/portal/projects', icon: FolderKanban },
  { label: 'Invoices & Ledger', path: '/portal/invoices', icon: Receipt },
  { label: 'Meetings', path: '/portal/meetings', icon: Calendar },
  { label: 'Guide', path: '/portal/guide', icon: Compass },
  { label: 'Profile', path: '/portal/profile', icon: UserCircle },
];

export default function ClientSidebar({ open, onClose }) {
  const user = useSelector((state) => state.auth.user);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/portal/login');
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-white border-r border-zinc-200 transition-all duration-300 flex flex-col shadow-sm',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          sidebarOpen ? 'lg:w-56' : 'lg:w-16',
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-heading font-black text-sm">R</span>
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <span className="font-heading font-bold text-sm text-primary-900 truncate block tracking-tight">
                  RUDHRAM
                </span>
                <span className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase block -mt-0.5">
                  Client Portal
                </span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {PORTAL_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-50 text-primary-900 font-semibold border-l-2 border-primary-900 shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-zinc-200 bg-zinc-50/50">
          {sidebarOpen && user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-2 rounded-lg bg-white border border-zinc-200 shadow-xs">
              <div className="w-7 h-7 bg-primary-100 text-primary-900 rounded-full flex items-center justify-center shrink-0 font-bold text-xs">
                {user.name?.[0]?.toUpperCase() || 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-800 truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3" /> Verified Client
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            {sidebarOpen && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}