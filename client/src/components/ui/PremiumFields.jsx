import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { animate } from 'animejs';
import { cn } from '../../utils/cn';

const inputVariants = {
  default: 'bg-zinc-50',
  filled: 'bg-white',
  ghost: 'bg-transparent',
};

const labelVariants = {
  default: 'text-zinc-700',
  muted: 'text-zinc-500',
};

export function PremiumInput({
  label,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  icon,
  trailingIcon,
  trailingAction,
  className,
  variant = 'default',
  labelVariant = 'default',
  ...props
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const pulseGlow = () => {
    if (!inputRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    animate(inputRef.current, {
      boxShadow: ['0 0 0 0 rgba(255,255,255,0)', '0 0 0 5px rgba(255,255,255,0.08)', '0 0 0 3px rgba(255,255,255,0.03)'],
      duration: 520,
      ease: 'out(3)',
    });
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'block text-sm font-medium transition-colors',
            labelVariants[labelVariant]
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={pulseGlow}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={cn(
            'w-full px-4 py-3.5 rounded-xl border text-base transition-all duration-200',
            inputVariants[variant],
            'focus:outline-none focus:ring-2 focus:ring-primary-900/20 focus:border-primary-900',
            'placeholder:text-zinc-400 text-primary-900',
            icon ? 'pl-11' : '',
            trailingIcon || trailingAction ? 'pr-12' : '',
            error
              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
              : 'border-zinc-200',
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          )}
          {...props}
        />
        {trailingIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            {trailingIcon}
          </div>
        )}
        {trailingAction && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {trailingAction}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>{error}</p>}
      {helperText && !error && <p className="text-xs text-zinc-500">{helperText}</p>}
    </div>
  );
}

export function PremiumSelect({
  label,
  placeholder,
  value,
  onChange,
  options,
  error,
  helperText,
  required = false,
  disabled = false,
  className,
  searchable = false,
  ...props
}) {
  const selectId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);
  const choose = (nextValue) => {
    onChange({ target: { value: nextValue, name: props.name } });
    setOpen(false);
  };
  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Escape') return setOpen(false);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((current) => !current);
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = Math.max(0, options.findIndex((option) => option.value === value));
      const nextIndex = event.key === 'ArrowDown' ? Math.min(currentIndex + 1, options.length - 1) : Math.max(currentIndex - 1, 0);
      choose(options[nextIndex].value);
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-zinc-700"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div ref={rootRef} className="relative">
        <button
          id={selectId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${selectId}-options`}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-base transition-all duration-300',
            'bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary-900/20 focus:border-primary-900 focus:bg-white',
            selected ? 'text-primary-900' : 'text-zinc-400',
            error ? 'border-red-300' : 'border-zinc-200',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-zinc-400',
          )}
          {...props}
        >
          <span className="truncate">{selected?.label || placeholder || 'Select an option'}</span>
          <svg className={cn('h-5 w-5 shrink-0 text-zinc-400 transition-transform', open && 'rotate-180')} viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 010 1.414z" />
          </svg>
        </button>
        {open && (
          <ul id={`${selectId}-options`} role="listbox" className="absolute z-[70] mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.4)]">
            {options.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === value}>
                <button type="button" onClick={() => choose(option.value)} className={cn('w-full rounded-xl px-3 py-3 text-left text-sm transition-colors', option.value === value ? 'bg-zinc-900 font-semibold text-white' : 'text-zinc-700 hover:bg-zinc-100')}>
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="text-xs text-zinc-500">{helperText}</p>}
    </div>
  );
}

export function PremiumTextarea({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  rows = 3,
  maxLength,
  className,
  ...props
}) {
  const textareaId = `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-zinc-700 flex items-center justify-between"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
          {maxLength && (
            <span className="text-xs text-zinc-400 font-normal">
              {value?.length || 0}/{maxLength}
            </span>
          )}
        </label>
      )}
      <textarea
        id={textareaId}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          'w-full px-4 py-3.5 rounded-xl border text-base transition-all duration-200 bg-zinc-50 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-primary-900/20 focus:border-primary-900',
          'placeholder:text-zinc-400 text-primary-900',
          error
            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
            : 'border-zinc-200',
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="text-xs text-zinc-500">{helperText}</p>}
    </div>
  );
}

export function PremiumMultiSelect({
  label,
  value = [],
  onChange,
  options,
  selectedOptions = [],
  maxVisible = 3,
  className,
  error,
  helperText,
  required = false,
  placeholder = 'Select options...',
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue]
    );
  };

  const displayValue = selectedOptions.length > 0
    ? selectedOptions.slice(0, maxVisible).map((o) => o.label).join(', ') + (selectedOptions.length > maxVisible ? ` +${selectedOptions.length - maxVisible} more` : '')
    : placeholder;

  return (
    <div className={cn('relative', className)}>
      <label className="block text-sm font-medium text-zinc-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full px-4 py-3.5 rounded-xl border text-base text-left transition-all duration-200 bg-zinc-50',
          'focus:outline-none focus:ring-2 focus:ring-primary-900/20 focus:border-primary-900',
          value.length > 0 ? 'text-primary-900' : 'text-zinc-400',
          'pr-12',
          error
            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
            : 'border-zinc-200',
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate block">{displayValue}</span>
        <svg
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 transition-transform duration-200',
            open && 'rotate-180'
          )}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1.5 rounded-xl border border-zinc-200 bg-white shadow-lg max-h-60 overflow-auto animate-slide-down"
          role="listbox"
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              className={cn(
                'px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors',
                value.includes(opt.value)
                  ? 'bg-primary-50 text-primary-900'
                  : 'text-zinc-700 hover:bg-zinc-50'
              )}
              role="option"
              aria-selected={value.includes(opt.value)}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  value.includes(opt.value)
                    ? 'border-primary-900 bg-primary-900'
                    : 'border-zinc-300'
                )}
              >
                {value.includes(opt.value) && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span className="truncate">{opt.label}</span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-zinc-500">{helperText}</p>}
    </div>
  );
}

export default PremiumInput;
