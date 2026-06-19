import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-primary-900 text-white hover:bg-primary-800 active:bg-primary-950',
  secondary: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:bg-zinc-300 border border-zinc-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  ghost: 'text-zinc-500 hover:bg-zinc-100 active:bg-zinc-200',
  outline: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
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
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-primary-900 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
});

export default Button;
