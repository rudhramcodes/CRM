import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { NOTIFICATION_CONFIG } from '../constants';
import { cn } from '../../../utils/cn';

const priorityDots = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-zinc-300',
};

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
      className={cn(
        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-zinc-50 last:border-0',
        notification.read ? 'bg-white hover:bg-zinc-50' : 'bg-blue-50/40 hover:bg-blue-50/60',
      )}
    >
      {/* Icon */}
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', config.iconBg)}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {!notification.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', config.badgeBg)}>
            {config.label}
          </span>
          <span className={cn('w-1.5 h-1.5 rounded-full', priorityDots[notification.priority] || priorityDots.medium)} />
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
          className="text-zinc-300 hover:text-red-500 transition-colors p-1 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
