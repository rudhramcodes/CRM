import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  FileText,
  FolderKanban,
  CheckSquare,
  Receipt,
  CreditCard,
  Bell,
  Settings,
  BarChart3,
} from 'lucide-react';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CLIENT: 'client',
};

export const LEAD_STATUS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-purple-100 text-purple-800' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-800' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' },
];

export const TASK_STATUS = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-800' },
];

export const PROJECT_STATUS = [
  { value: 'planning', label: 'Planning', color: 'bg-purple-100 text-purple-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
];

export const INVOICE_STATUS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
];

export const MEETING_STATUS = [
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

export const CLIENT_STATUS = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-red-100 text-red-800' },
];

export const LEAD_SOURCES = [
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'referral', label: 'Referral' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'other', label: 'Other' },
];

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { label: 'Leads', path: '/leads', icon: Users, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { label: 'Clients', path: '/clients', icon: UserCheck, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { label: 'Meetings', path: '/meetings', icon: Calendar, roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Projects', path: '/projects', icon: FolderKanban, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { label: 'Tasks', path: '/tasks', icon: CheckSquare, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { label: 'Invoices', path: '/invoices', icon: Receipt, roles: ['super_admin', 'admin'] },
  { label: 'Payments', path: '/payments', icon: CreditCard, roles: ['super_admin', 'admin'] },
  { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['super_admin', 'admin'] },
  { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['super_admin', 'admin', 'manager', 'employee'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['super_admin'] },
];

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
