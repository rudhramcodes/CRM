import { cn } from '../../../utils/cn';

const STATUS_CONFIG = {
  todo: {
    label: 'To Do',
    color: 'bg-zinc-100 text-zinc-700 border-zinc-200/80',
    dot: 'bg-zinc-400',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dot: 'bg-blue-500 animate-pulse',
  },
  review: {
    label: 'Review',
    color: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  done: {
    label: 'Done',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
};

export default function TaskStatusBadge({ status, className = '', showDot = true }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.todo;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-semibold tracking-tight shadow-2xs whitespace-nowrap',
        config.color,
        className,
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />}
      <span>{config.label}</span>
    </span>
  );
}
