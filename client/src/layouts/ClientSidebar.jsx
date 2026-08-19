import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Compass,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { getBrandTheme } from '../constants/brandThemes';
import { logout } from '../app/store/authSlice';

const PORTAL_NAV = [
  { label: 'Dashboard', path: '/portal', icon: LayoutDashboard, end: true },
  { label: 'Projects', path: '/portal/projects', icon: FolderKanban },
  { label: 'Meetings', path: '/portal/meetings', icon: Calendar },
  { label: 'Guide', path: '/portal/guide', icon: Compass },
  { label: 'Profile', path: '/portal/profile', icon: UserCircle },
];

export default function ClientSidebar({ brand = 'aghori', open, onClose }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = getBrandTheme(brand);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/portal/login');
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-white border-r border-zinc-200 transition-all duration-300 flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:w-64',
        )}
      >
        <div className="flex items-center gap-3 h-16 px-4 border-b border-zinc-100">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: theme.primary }}
          >
            <span>{theme.logoEmoji}</span>
          </div>
          <div className="min-w-0">
            <p className="font-heading font-semibold text-sm text-primary-900 truncate">
              {theme.portalName}
            </p>
            <p className="text-[11px] text-zinc-400">Client Portal</p>
          </div>
          {user && (
            <div className="ml-auto flex items-center gap-2.5 lg:hidden">
              <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-primary-900 font-medium text-xs">
                  {user.name?.[0]?.toUpperCase() || 'C'}
                </span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {PORTAL_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-900 text-white'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
                )
              }
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-zinc-100">
          {user && (
            <div className="flex items-center gap-2.5 px-1 mb-3">
              <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-primary-900 font-medium text-xs">
                  {user.name?.[0]?.toUpperCase() || 'C'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-700 truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-zinc-400 capitalize">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" strokeWidth={1.5} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}