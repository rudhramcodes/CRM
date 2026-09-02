import { useState } from 'react';
import { Clock } from 'lucide-react';
import Button from './Button';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { cn } from '../../utils/cn';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function to12h(h24) {
  const h = parseInt(h24, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12} ${period}`;
}

export default function TimePicker({ value = '', onChange, label, disabled }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(value ? value.split(':')[0] : '09');
  const [minute, setMinute] = useState(value ? value.split(':')[1] : '00');

  const display = value ? `${to12h(hour)}:${minute}` : '--:--';

  const handleSelect = () => {
    onChange?.(`${hour}:${minute}`);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-zinc-700">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-start font-normal text-sm px-3 py-2 h-auto"
          >
            <span className="flex-1 text-left">{display}</span>
            <Clock className="size-4 text-zinc-400 shrink-0 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="w-16 max-h-48 overflow-y-auto border-r border-zinc-200">
              {HOURS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHour(h)}
                  className={cn(
                    'w-full px-2 py-1.5 text-sm text-center hover:bg-zinc-100',
                    hour === h && 'bg-primary-900 text-white'
                  )}
                >
                  {to12h(h)}
                </button>
              ))}
            </div>
            <div className="w-14 max-h-48 overflow-y-auto">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMinute(m)}
                  className={cn(
                    'w-full px-2 py-1.5 text-sm text-center hover:bg-zinc-100',
                    minute === m && 'bg-primary-900 text-white'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="p-2 border-t border-zinc-200">
            <Button size="sm" className="w-full" onClick={handleSelect}>
              Select
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
