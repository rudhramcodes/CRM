import { Flag } from 'lucide-react';
import { cn } from '../../../utils/cn';

const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    color: 'bg-zinc-100 text-zinc-600 border-zinc-200/60',
    iconColor: 'text-zinc-400',
  },
  medium: {
    label: 'Medium',
    color: 'bg-sky-50 text-sky-700 border-sky-200/70',
    iconColor: 'text-sky-500',
  },
  high: {
    label: 'High',
    color: 'bg-amber-50 text-amber-800 border-amber-200/70',
    iconColor: 'text-amber-600',
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-rose-50 text-rose-800 border-rose-200/80',
    iconColor: 'text-rose-600',
  },
};

export default function TaskPriorityBadge({ priority, className = '', showIcon = true }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold tracking-tight shadow-2xs whitespace-nowrap',
        config.color,
        className,
      )}
    >
      {showIcon && <Flag className={cn('w-3 h-3 shrink-0', config.iconColor)} />}
      <span>{config.label}</span>
    </span>
  );
}
