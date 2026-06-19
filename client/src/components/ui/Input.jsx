import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(function Input(
  { className, label, error, helperText, id, ...props },
  ref,
) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors bg-zinc-50',
          'focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900',
          'placeholder:text-zinc-400 text-primary-900',
          error
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-zinc-200',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-zinc-500 mt-1">{helperText}</p>
      )}
    </div>
  );
});

export default Input;
