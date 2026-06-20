import { forwardRef, useCallback } from 'react';
import { Link, ClipboardPaste } from 'lucide-react';
import { cn } from '../../utils/cn';

const LinkInput = forwardRef(function LinkInput(
  { label, error, helperText, placeholder, className, ...props },
  ref,
) {
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && props.onChange) {
        const syntheticEvent = {
          target: { value: text },
        };
        props.onChange(syntheticEvent);
      }
    } catch {
      // Clipboard access denied or not available
    }
  }, [props.onChange]);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
      )}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Link className="w-4 h-4 text-zinc-400" />
        </div>
        <input
          ref={ref}
          type="url"
          placeholder={placeholder || 'https://...'}
          className={cn(
            'w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm transition-colors bg-zinc-50',
            'focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900',
            'placeholder:text-zinc-400 text-primary-900',
            error ? 'border-red-300' : 'border-zinc-200',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={handlePaste}
          title="Paste from clipboard"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
        >
          <ClipboardPaste className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-zinc-500 mt-1">{helperText}</p>
      )}
    </div>
  );
});

export default LinkInput;
