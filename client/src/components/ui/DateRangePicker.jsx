import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import Button from './Button';
import Calendar from './Calendar';
import { Popover, PopoverTrigger, PopoverContent } from './Popover';

const PRESETS = [
  { label: 'Today', getRange: () => ({ from: new Date(), to: new Date() }) },
  { label: 'This Week', getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'This Month', getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last 7 Days', getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: 'Last 30 Days', getRange: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
];

export default function DateRangePicker({ from, to, onSelect }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState({ from, to });

  const display = from && to
    ? `${format(from, 'dd MMM')} — ${format(to, 'dd MMM yyyy')}`
    : 'Select date range';

  const handlePreset = (preset) => {
    const range = preset.getRange();
    setSelected(range);
    onSelect?.(range);
    setOpen(false);
  };

  const handleSelect = (range) => {
    setSelected(range);
    if (range?.from && range?.to) {
      onSelect?.(range);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start font-normal text-sm px-3 py-2 h-auto min-w-[200px]">
          <span className="flex-1 text-left truncate">{display}</span>
          <CalendarIcon className="size-4 text-zinc-400 shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r border-zinc-200 p-2 space-y-1 min-w-[120px]">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className="w-full px-2 py-1.5 text-sm text-left rounded-md hover:bg-zinc-100 text-zinc-700"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
