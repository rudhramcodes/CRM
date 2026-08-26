import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { NOTIFICATION_CONFIG } from '../constants';
import { cn } from '../../../utils/cn';

const priorityStyles = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-zinc-100 text-zinc-500 ring-zinc-200',
};

const priorityLabels = { high: 'High', medium: 'Medium', low: 'Low' };

export default function NotificationItem({ notification, onMarkRead, onDelete }) {
  const navigate = useNavigate();
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.system;
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.read && onMarkRead) {
      onMarkRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${notification.read ? '' : 'Unread '}${config.label}: ${notification.message}`}
      className={cn(
        'relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-zinc-50 last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-900/30',
        notification.read ? 'bg-white hover:bg-zinc-50' : 'bg-[#F6F0DF]/55 hover:bg-[#F6F0DF]/80',
        !notification.read && 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#B3712D]',
      )}
    >
      {/* Icon */}
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', config.iconBg)}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {!notification.read && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#B3712D]" title="Unread notification">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B3712D]" aria-hidden="true" />
              Unread
            </span>
          )}
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', config.badgeBg)}>
            {config.label}
          </span>
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', priorityStyles[notification.priority] || priorityStyles.medium)}>
            {priorityLabels[notification.priority] || 'Medium'} priority
          </span>
        </div>
        <p className={cn(
          'text-sm leading-snug',
          notification.read ? 'text-zinc-600' : 'text-zinc-900 font-medium',
        )}>
          {notification.message}
        </p>
        <p className="text-[11px] text-zinc-400 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Delete */}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification._id); }}
          aria-label="Delete notification"
          title="Delete notification"
          className="text-zinc-300 hover:text-red-500 transition-colors p-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
