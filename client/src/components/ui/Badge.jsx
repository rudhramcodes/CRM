import { cn } from '../../utils/cn';

const variants = {
  default: 'bg-zinc-100/90 text-zinc-700 border-zinc-200/70',
  primary: 'bg-primary-900 text-white border-primary-800 shadow-2xs',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  info: 'bg-blue-50 text-blue-700 border-blue-200/80',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
};

const dotColors = {
  default: 'bg-zinc-400',
  primary: 'bg-white',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[11px] gap-1.5',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1 text-sm gap-2',
};

export default function Badge({ className, variant = 'default', size = 'md', dot = false, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border tracking-tight select-none',
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColors[variant] || 'bg-zinc-400',
          )}
        />
      )}
      {children}
    </span>
  );
}
