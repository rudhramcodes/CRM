import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const variants = {
  primary:
    'bg-primary-900 text-white hover:bg-primary-800 active:bg-primary-950 shadow-[0_4px_14px_-3px_rgba(11,11,11,0.25)] hover:shadow-[0_6px_20px_-4px_rgba(11,11,11,0.35)]',
  secondary:
    'bg-white text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-200/90 shadow-2xs',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-[0_4px_14px_-3px_rgba(220,38,38,0.25)]',
  ghost:
    'text-zinc-600 hover:text-primary-900 hover:bg-zinc-100/80 active:bg-zinc-200/60',
  outline:
    'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-primary-900 active:bg-zinc-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
};

const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'md', disabled, loading, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-900/20 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
});

export default Button;
