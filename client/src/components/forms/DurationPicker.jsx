import { useMemo, useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { toDisplay, addMinutes, toMin } from '../../utils/time';

const DURATION_PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1 hr 30 min', minutes: 90 },
  { label: '2 hours', minutes: 120 },
  { label: '2 hr 30 min', minutes: 150 },
  { label: '3 hours', minutes: 180 },
  { label: '4 hours', minutes: 240 },
];

export default function DurationPicker({ value, onChange, label, error, startTime }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

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

  const optionsWithEndTime = useMemo(
    () =>
      DURATION_PRESETS.map((d) => ({
        ...d,
        endTime: startTime ? addMinutes(startTime, d.minutes) : '',
      })),
    [startTime],
  );

  const selectedMinutes = useMemo(() => {
    const start = toMin(startTime);
    const end = toMin(value);
    if (start === null || end === null) return null;
    const diff = (end - start + 24 * 60) % (24 * 60);
    return diff > 0 ? diff : null;
  }, [startTime, value]);

  const select = (minutes) => {
    if (!startTime) return;
    onChange?.(addMinutes(startTime, minutes));
    setOpen(false);
  };

  const displayValue = selectedMinutes
    ? `${DURATION_PRESETS.find((d) => d.minutes === selectedMinutes)?.label || ''} (ends ${toDisplay(value)})`.trim()
    : value
      ? toDisplay(value)
      : 'Select duration';

  return (
    <div className="space-y-1.5" ref={rootRef}>
      {label && (
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={!startTime}
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors bg-white text-left',
            'focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900',
            error ? 'border-red-300' : 'border-zinc-200',
            !startTime && 'opacity-50 cursor-not-allowed bg-zinc-50',
          )}
        >
          <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className={cn('flex-1 truncate', value ? 'text-primary-900' : 'text-zinc-400')}>
            {displayValue}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {!startTime && (
              <div className="px-3 py-2 text-xs text-zinc-400 bg-zinc-50 border-b border-zinc-100">
                Select start time first
              </div>
            )}
            <div className="max-h-64 overflow-y-auto py-1">
              {optionsWithEndTime.map((opt) => {
                const active = selectedMinutes === opt.minutes;
                return (
                  <button
                    key={opt.minutes}
                    type="button"
                    disabled={!startTime}
                    onClick={() => select(opt.minutes)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-zinc-50',
                      active ? 'bg-primary-50 text-primary-900 font-semibold' : 'text-zinc-600',
                      !startTime && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <span className="w-20 shrink-0">{opt.label}</span>
                    <span className="flex-1 text-xs text-zinc-400 font-normal">
                      {opt.endTime ? `ends ${toDisplay(opt.endTime)}` : ''}
                    </span>
                    {active && <Check className="w-4 h-4 text-primary-900 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}