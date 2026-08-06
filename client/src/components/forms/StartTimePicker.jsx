import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { toDisplay, parseTime } from '../../utils/time';

// Options start at 9:00 AM (business hours) in 30-min steps until 11:30 PM
const TIME_OPTIONS = [];
for (let h = 9; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

export default function StartTimePicker({ value, onChange, label, error }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ? toDisplay(value) : '');
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setText(value ? toDisplay(value) : '');
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const select = (time24) => {
    onChange?.(time24);
    setText(toDisplay(time24));
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    const parsed = parseTime(raw);
    if (parsed && parsed !== value) {
      onChange?.(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseTime(text);
    if (parsed) {
      setText(toDisplay(parsed));
      if (parsed !== value) onChange?.(parsed);
    } else if (text.trim()) {
      // Invalid input typed -> revert to last valid value
      setText(value ? toDisplay(value) : '');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseTime(text);
      if (parsed) {
        select(parsed);
      }
      inputRef.current?.blur();
    }
  };

  return (
    <div className="space-y-1.5" ref={rootRef}>
      {label && (
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="9:00 AM"
          value={text}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          className={cn(
            'w-full px-3 py-2.5 pr-9 rounded-lg border text-sm transition-colors bg-white',
            'focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900',
            error ? 'border-red-300' : 'border-zinc-200',
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!open);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
          aria-label="Pick time"
        >
          <Clock className="w-4 h-4" />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="max-h-56 overflow-y-auto py-1">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // keep input focus, avoid blur-before-click
                  onClick={() => select(time)}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left font-mono transition-colors hover:bg-zinc-50',
                    value === time
                      ? 'bg-primary-50 text-primary-900 font-semibold'
                      : 'text-zinc-600',
                  )}
                >
                  {toDisplay(time)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
