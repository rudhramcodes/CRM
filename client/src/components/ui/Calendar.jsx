import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'space-y-3',
        caption: 'flex justify-center relative items-center h-9',
        caption_label: 'text-sm font-medium text-zinc-900',
        nav: 'flex items-center gap-1',
        nav_button:
          'inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors',
        button: 'text-sm rounded-lg w-9 h-9',
        day: 'text-sm text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors',
        day_button: 'text-sm rounded-lg w-9 h-9',
        day_selected:
          '!bg-primary-900 !text-white hover:!bg-primary-900 focus:!bg-primary-900',
        day_today: 'font-semibold text-primary-900',
        day_outside: 'text-zinc-300',
        day_disabled: 'text-zinc-300 cursor-not-allowed',
        day_range_middle: '!bg-zinc-100 !text-zinc-900 rounded-none',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          ),
      }}
      {...props}
    />
  );
}
