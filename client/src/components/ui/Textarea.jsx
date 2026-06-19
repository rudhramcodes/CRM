import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Textarea = forwardRef(function Textarea(
  { className, label, error, id, ...props },
  ref,
) {
  const inputId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-sm transition-colors resize-y min-h-[80px]',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'placeholder:text-slate-400',
          error
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-slate-300',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default Textarea;
