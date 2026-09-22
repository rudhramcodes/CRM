import { LEAD_STATUS } from '../../../constants';
import { cn } from '../../../utils/cn';

const statusStyles = {
  new: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200/80',
    dot: 'bg-sky-500',
  },
  contacted: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
    dot: 'bg-amber-500',
  },
  meeting_scheduled: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200/80',
    dot: 'bg-violet-500',
  },
  proposal_sent: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200/80',
    dot: 'bg-indigo-500',
  },
  won: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  lost: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200/80',
    dot: 'bg-rose-500',
  },
};

const statusLabels = LEAD_STATUS.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.label }),
  {},
);

export default function LeadStatusBadge({ status, className, showDot = true }) {
  const style = statusStyles[status] || statusStyles.new;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs transition-colors',
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />}
      <span>{statusLabels[status] || status}</span>
    </span>
  );
}

