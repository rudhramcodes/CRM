import { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const HOURS12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')); // 01..12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

// 24h "HH:mm" -> display parts (hour 1-12, minute 2-digit, period)
const toParts = (value) => {
  if (!value) return { hour: '09', minute: '00', period: 'AM' };
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return { hour: '09', minute: '00', period: 'AM' };
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return {
    hour: String(hour12).padStart(2, '0'),
    minute: String(m).padStart(2, '0'),
    period: h >= 12 ? 'PM' : 'AM',
  };
};

// display parts -> 24h "HH:mm"
const to24 = (hour, minute, period) => {
  let h = Number(hour) % 12; // 12 -> 0
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
};

export default function TimePicker({ value, onChange, label, error }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const initial = useMemo(() => toParts(value), [value]);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState(initial.period);

  useEffect(() => {
    const parts = toParts(value);
    setHour(parts.hour);
    setMinute(parts.minute);
    setPeriod(parts.period);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const emit = (h, m, p) => onChange?.(to24(h, m, p));

  const handleHourChange = (h) => {
    setHour(h);
    emit(h, period === 'PM' ? minute : minute, period);
  };

  const handleMinuteChange = (m) => {
    setMinute(m);
    emit(hour, m, period);
  };

  const handlePeriodChange = (p) => {
    setPeriod(p);
    emit(hour, minute, p);
  };

  const displayTime = value
    ? `${toParts(value).hour}:${toParts(value).minute} ${toParts(value).period}`
    : `${hour}:${minute} ${period}`;

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors bg-zinc-50 text-left',
            'focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900',
            error ? 'border-red-300' : 'border-zinc-200',
          )}
        >
          <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className="flex-1 text-primary-900 font-mono">{displayTime}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="flex divide-x divide-zinc-100">
              {/* Hours 1-12 */}
              <div className="flex-1">
                <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400 text-center border-b border-zinc-100 bg-zinc-50/50">
                  HH
                </div>
                <div className="overflow-y-auto max-h-48 scroll-smooth">
                  {HOURS12.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHourChange(h)}
                      className={cn(
                        'w-full px-2 py-1.5 text-sm text-center font-mono transition-colors hover:bg-zinc-50',
                        hour === h
                          ? 'bg-primary-50 text-primary-900 font-semibold'
                          : 'text-zinc-600',
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes */}
              <div className="flex-1">
                <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400 text-center border-b border-zinc-100 bg-zinc-50/50">
                  MM
                </div>
                <div className="overflow-y-auto max-h-48 scroll-smooth">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMinuteChange(m)}
                      className={cn(
                        'w-full px-2 py-1.5 text-sm text-center font-mono transition-colors hover:bg-zinc-50',
                        minute === m
                          ? 'bg-primary-50 text-primary-900 font-semibold'
                          : 'text-zinc-600',
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* AM/PM */}
              <div className="flex-1">
                <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400 text-center border-b border-zinc-100 bg-zinc-50/50">
                  &
                </div>
                <div className="overflow-y-auto max-h-48 scroll-smooth">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePeriodChange(p)}
                      className={cn(
                        'w-full px-2 py-1.5 text-sm text-center font-mono transition-colors hover:bg-zinc-50',
                        period === p
                          ? 'bg-primary-50 text-primary-900 font-semibold'
                          : 'text-zinc-600',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}