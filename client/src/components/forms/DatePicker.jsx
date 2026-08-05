import { useState, useEffect } from 'react';
import { format, isValid, addDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/Popover';
import Calendar from '../ui/Calendar';

export default function DatePicker({ value, onChange, label, error, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(undefined);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (isValid(d)) setDate(d);
    }
  }, [value]);

  const select = (d) => {
    setDate(d);
    setOpen(false);
    onChange?.(d ? format(d, 'yyyy-MM-dd') : '');
  };

  const handleSelect = (selectedDate) => select(selectedDate);

  const quick = (offset) => () => select(addDays(new Date(), offset));

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-medium text-zinc-500">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start font-normal text-sm px-3 py-2 h-auto',
              !date && 'text-zinc-400',
              error && 'border-red-300 focus-visible:ring-red-400',
            )}
          >
            <span className="flex-1 truncate text-left">
              {date ? format(date, 'PP') : placeholder || 'Select date'}
            </span>
            <CalendarIcon className="size-4 text-zinc-400 shrink-0 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0 shadow-lg border-zinc-200/80" align="start">
          <div className="flex items-center gap-2 p-2 border-b border-zinc-100">
            <Button type="button" variant="secondary" size="sm" onClick={quick(0)} className="flex-1">
              Today
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={quick(1)} className="flex-1">
              Tomorrow
            </Button>
          </div>
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={handleSelect}
            initialFocus
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}