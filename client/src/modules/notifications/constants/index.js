import {
  CheckSquare, AlertTriangle, ArrowRightCircle, MessageSquare, AtSign,
  FolderKanban, UserPlus, Users, Repeat, Calendar, Clock, Receipt,
  AlertCircle, CreditCard, FileText, Bell,
} from 'lucide-react';

export const NOTIFICATION_CONFIG = {
  task_assigned:     { icon: CheckSquare, iconBg: 'bg-blue-100 text-blue-600', badgeBg: 'bg-blue-100 text-blue-700', label: 'Task' },
  task_due_soon:     { icon: AlertTriangle, iconBg: 'bg-orange-100 text-orange-600', badgeBg: 'bg-orange-100 text-orange-700', label: 'Task' },
  task_status_change:{ icon: ArrowRightCircle, iconBg: 'bg-purple-100 text-purple-600', badgeBg: 'bg-purple-100 text-purple-700', label: 'Task' },
  task_comment:      { icon: MessageSquare, iconBg: 'bg-zinc-100 text-zinc-600', badgeBg: 'bg-zinc-100 text-zinc-700', label: 'Task' },
  mention:           { icon: AtSign, iconBg: 'bg-yellow-100 text-yellow-600', badgeBg: 'bg-yellow-100 text-yellow-700', label: 'Mention' },
  project_assigned:  { icon: FolderKanban, iconBg: 'bg-indigo-100 text-indigo-600', badgeBg: 'bg-indigo-100 text-indigo-700', label: 'Project' },
  lead_created:      { icon: UserPlus, iconBg: 'bg-green-100 text-green-600', badgeBg: 'bg-green-100 text-green-700', label: 'Leads' },
  lead_assigned:     { icon: Users, iconBg: 'bg-teal-100 text-teal-600', badgeBg: 'bg-teal-100 text-teal-700', label: 'Leads' },
  lead_converted:    { icon: Repeat, iconBg: 'bg-emerald-100 text-emerald-600', badgeBg: 'bg-emerald-100 text-emerald-700', label: 'Leads' },
  meeting_scheduled: { icon: Calendar, iconBg: 'bg-purple-100 text-purple-600', badgeBg: 'bg-purple-100 text-purple-700', label: 'Meeting' },
  meeting_reminder:  { icon: Clock, iconBg: 'bg-rose-100 text-rose-600', badgeBg: 'bg-rose-100 text-rose-700', label: 'Meeting' },
  invoice_paid:      { icon: Receipt, iconBg: 'bg-green-100 text-green-600', badgeBg: 'bg-green-100 text-green-700', label: 'Invoice' },
  invoice_overdue:   { icon: AlertCircle, iconBg: 'bg-red-100 text-red-600', badgeBg: 'bg-red-100 text-red-700', label: 'Invoice' },
  payment_received:  { icon: CreditCard, iconBg: 'bg-emerald-100 text-emerald-600', badgeBg: 'bg-emerald-100 text-emerald-700', label: 'Payment' },
  contract_expiry:   { icon: FileText, iconBg: 'bg-orange-100 text-orange-600', badgeBg: 'bg-orange-100 text-orange-700', label: 'Contract' },
  system:            { icon: Bell, iconBg: 'bg-zinc-100 text-zinc-600', badgeBg: 'bg-zinc-100 text-zinc-700', label: 'System' },
};

export const NOTIFICATION_TYPE_GROUPS = [
  { label: 'All Types', value: '' },
  { label: 'Tasks', value: 'task', types: ['task_assigned', 'task_due_soon', 'task_status_change', 'task_comment'] },
  { label: 'Leads', value: 'lead', types: ['lead_created', 'lead_assigned', 'lead_converted'] },
  { label: 'Meetings', value: 'meeting', types: ['meeting_scheduled', 'meeting_reminder'] },
  { label: 'Invoices', value: 'invoice', types: ['invoice_paid', 'invoice_overdue'] },
  { label: 'Payments', value: 'payment', types: ['payment_received'] },
  { label: 'Projects', value: 'project', types: ['project_assigned'] },
  { label: 'Mentions', value: 'mention', types: ['mention'] },
  { label: 'System', value: 'system', types: ['system', 'contract_expiry'] },
];
