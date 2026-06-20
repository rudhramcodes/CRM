import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export default function TimePicker({ value, onChange, label, error }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState('10');
  const [minutes, setMinutes] = useState('00');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      if (h) setHours(h);
      if (m) setMinutes(m);
    }
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

  const handleHourChange = (h) => {
    setHours(h);
    onChange?.(`${h}:${minutes}`);
  };

  const handleMinuteChange = (m) => {
    setMinutes(m);
    onChange?.(`${hours}:${m}`);
  };

  const displayTime = value || `${hours}:${minutes}`;

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
              {/* Hours */}
              <div className="flex-1">
                <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400 text-center border-b border-zinc-100 bg-zinc-50/50">
                  HH
                </div>
                <div className="overflow-y-auto max-h-48 scroll-smooth">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHourChange(h)}
                      className={cn(
                        'w-full px-2 py-1.5 text-sm text-center font-mono transition-colors hover:bg-zinc-50',
                        hours === h
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
                        minutes === m
                          ? 'bg-primary-50 text-primary-900 font-semibold'
                          : 'text-zinc-600',
                      )}
                    >
                      {m}
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
