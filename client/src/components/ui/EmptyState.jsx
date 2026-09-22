import { cn } from '../../utils/cn';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center', className)}>
      {Icon && (
        <div className="w-14 h-14 bg-zinc-100/80 border border-zinc-200/70 rounded-2xl flex items-center justify-center mb-4 shadow-2xs">
          <Icon className="w-7 h-7 text-zinc-400" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="font-heading text-base sm:text-lg font-bold text-primary-900 mb-1 tracking-tight">
        {title || 'No records found'}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-zinc-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
