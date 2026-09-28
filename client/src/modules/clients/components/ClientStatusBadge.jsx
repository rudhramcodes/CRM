import { CLIENT_STATUS } from '../../../constants';
import { cn } from '../../../utils/cn';

const statusStyles = {
  active: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  inactive: {
    bg: 'bg-zinc-100',
    text: 'text-zinc-600',
    border: 'border-zinc-200/80',
    dot: 'bg-zinc-400',
  },
};

const statusLabels = CLIENT_STATUS.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.label }),
  {},
);

export default function ClientStatusBadge({ status, className, showDot = true }) {
  const style = statusStyles[status] || statusStyles.active;

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

