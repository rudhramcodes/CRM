import { useState, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/Popover';
import Calendar from '../ui/Calendar';

export default function DatePicker({ value, onChange, label, error, placeholder }) {
  const [date, setDate] = useState(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (isValid(d)) setDate(d);
    }
  }, [value]);

  const handleSelect = (selectedDate) => {
    setDate(selectedDate);
    setOpen(false);
    onChange?.(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors bg-zinc-50 text-left',
              'focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900',
              error ? 'border-red-300' : 'border-zinc-200',
              !date && 'text-zinc-400',
            )}
          >
            <CalendarIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="flex-1">
              {date ? format(date, 'PPP') : placeholder || 'Pick a date'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
