import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import { NAV_ITEMS } from '../constants';

export default function Sidebar({ open, onClose }) {
  const user = useSelector((state) => state.auth.user);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  );

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
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-zinc-200 transition-all duration-300 flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'lg:w-56' : 'lg:w-16',
        )}
      >
        <div className="flex items-center justify-between h-14 px-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-900 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-heading font-bold text-sm">R</span>
            </div>
            {sidebarOpen && (
              <span className="font-heading font-semibold text-sm text-primary-900">Rudhram</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-zinc-100"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-zinc-100 text-primary-900'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
                )
              }
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" strokeWidth={1.5} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && user && (
          <div className="p-3 border-t border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-primary-900 font-medium text-xs">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-700 truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-zinc-400 capitalize">
                  {user.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
