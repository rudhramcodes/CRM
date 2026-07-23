import { IndianRupee, TrendingUp, Wallet, PiggyBank, GitBranch, Target, Zap, Users, UserCheck, UserX, Building2, FileText, Clock, CheckCircle, AlertTriangle, ListTodo, BarChart3 } from 'lucide-react';

export const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  meeting_scheduled: 'Meeting Scheduled',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function fmtTooltip(val) {
  if (typeof val !== 'number') return val;
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}
