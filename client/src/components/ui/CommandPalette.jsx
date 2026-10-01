import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  FolderKanban,
  Receipt,
  CreditCard,
  BarChart3,
  ClipboardCheck,
  BriefcaseBusiness,
  Bell,
  Settings,
  PlusCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const ALL_COMMANDS = [
  // Navigation - Overview
  { id: 'dash', title: 'Dashboard', category: 'Overview', path: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  // Navigation - CRM
  { id: 'leads', title: 'Leads Pipeline', category: 'CRM & Pipeline', path: '/leads', icon: Users, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'clients', title: 'Clients Directory', category: 'CRM & Pipeline', path: '/clients', icon: UserCheck, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'meetings', title: 'Meetings & Calls', category: 'CRM & Pipeline', path: '/meetings', icon: Calendar, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  // Navigation - Operations
  { id: 'projects', title: 'Projects & Tasks', category: 'Operations', path: '/projects', icon: FolderKanban, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'attendance', title: 'Attendance & Clock-In', category: 'Operations', path: '/attendance', icon: ClipboardCheck, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'freelancers', title: 'Freelancers Directory', category: 'Operations', path: '/freelancers', icon: BriefcaseBusiness, roles: ['super_admin', 'admin', 'manager'] },
  // Navigation - Financials
  { id: 'invoices', title: 'Invoices & Billing', category: 'Financials', path: '/invoices', icon: Receipt, roles: ['super_admin', 'admin'] },
  { id: 'payments', title: 'Payments & Receipts', category: 'Financials', path: '/payments', icon: CreditCard, roles: ['super_admin', 'admin'] },
  { id: 'reports', title: 'Reports & Analytics', category: 'Financials', path: '/reports', icon: BarChart3, roles: ['super_admin', 'admin'] },
  // Navigation - Administration
  { id: 'notifications', title: 'Notifications Center', category: 'Administration', path: '/notifications', icon: Bell, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { id: 'users', title: 'Team & User Management', category: 'Administration', path: '/users', icon: Users, roles: ['super_admin', 'admin'] },
  { id: 'settings', title: 'Workspace Settings', category: 'Administration', path: '/settings', icon: Settings, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  // Quick Actions
  { id: 'action-lead', title: 'Create New Lead', category: 'Quick Actions', path: '/leads/new', icon: PlusCircle, roles: ['super_admin', 'admin', 'manager', 'employee'], badge: 'Action' },
  { id: 'action-client', title: 'Add New Client', category: 'Quick Actions', path: '/clients/new', icon: PlusCircle, roles: ['super_admin', 'admin', 'manager'], badge: 'Action' },
  { id: 'action-invoice', title: 'Generate New Invoice', category: 'Quick Actions', path: '/invoices/new', icon: PlusCircle, roles: ['super_admin', 'admin'], badge: 'Action' },
  { id: 'action-freelancer', title: 'Add New Freelancer', category: 'Quick Actions', path: '/freelancers/new', icon: PlusCircle, roles: ['super_admin', 'admin', 'manager'], badge: 'Action' },
];

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Filter commands by user role
  const allowedCommands = useMemo(() => {
    if (!user) return [];
    return ALL_COMMANDS.filter((cmd) => cmd.roles.includes(user.role));
  }, [user]);

  // Filter by search query
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allowedCommands;
    return allowedCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.path.toLowerCase().includes(q)
    );
  }, [allowedCommands, query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          navigate(filteredCommands[selectedIndex].path);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, navigate, onClose]);

  const handleSelect = (cmd) => {
    navigate(cmd.path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-24 px-3 sm:px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl border border-zinc-200/80 shadow-[0_24px_80px_-25px_rgba(0,0,0,0.35)] overflow-hidden z-10 flex flex-col max-h-[82vh] sm:max-h-[75vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-3 sm:py-3.5 border-b border-zinc-200/70 bg-zinc-50/50">
              <Search className="w-5 h-5 text-zinc-400 shrink-0" strokeWidth={2} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or jump to page..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-800 placeholder-zinc-400 font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-200/50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-white rounded-lg border border-zinc-200/90 select-none shadow-2xs">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto p-2 space-y-1 scrollbar-hide flex-1">
              {filteredCommands.length === 0 ? (
                <div className="py-10 text-center">
                  <Sparkles className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-600">No matching commands found</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Try searching for Leads, Projects, Invoices, or Settings</p>
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => handleSelect(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 group min-h-[44px]',
                        isSelected
                          ? 'bg-primary-900 text-white shadow-[0_2px_10px_-2px_rgba(11,11,11,0.25)]'
                          : 'hover:bg-zinc-100/80 active:bg-zinc-100 text-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-white/15 text-white'
                              : 'bg-zinc-100 text-zinc-500 group-hover:text-primary-900'
                          )}
                        >
                          <Icon className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className={cn('text-xs sm:text-sm font-medium truncate', isSelected ? 'text-white' : 'text-zinc-800')}>
                            {cmd.title}
                          </p>
                          <p className={cn('text-[11px] truncate', isSelected ? 'text-zinc-300' : 'text-zinc-400')}>
                            {cmd.category}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cmd.badge && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider',
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            )}
                          >
                            {cmd.badge}
                          </span>
                        )}
                        <ArrowRight
                          className={cn(
                            'w-3.5 h-3.5 transition-transform duration-150',
                            isSelected ? 'text-white translate-x-0.5' : 'text-zinc-300 opacity-0 group-hover:opacity-100'
                          )}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer keyboard hints */}
            <div className="px-3.5 sm:px-4 py-2.5 bg-zinc-50/80 border-t border-zinc-200/70 flex items-center justify-between text-[11px] text-zinc-400">
              <div className="flex items-center gap-3">
                <span className="hidden sm:flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white border border-zinc-200/80 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white border border-zinc-200/80 rounded">↓</kbd>
                  Navigate
                </span>
                <span className="hidden sm:flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white border border-zinc-200/80 rounded">↵</kbd>
                  Select
                </span>
                <span className="sm:hidden text-zinc-400 text-xs">
                  Tap any item to open
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400">
                {filteredCommands.length} items
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
