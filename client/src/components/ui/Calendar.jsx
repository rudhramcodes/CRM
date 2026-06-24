import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '../../utils/cn';

function CalendarChevron({ className, orientation }) {
  const Icon = orientation === 'left'
    ? ChevronLeft
    : orientation === 'right'
      ? ChevronRight
      : ChevronDown;

  return <Icon className={cn('size-4', className)} />;
}

export default function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'buttons',
  startMonth,
  endMonth,
  ...props
}) {
  const hasDropdowns = captionLayout === 'dropdown';
  const currentYear = new Date().getFullYear();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={hasDropdowns ? 'dropdown' : 'label'}
      startMonth={startMonth ?? (hasDropdowns ? new Date(currentYear - 15, 0) : undefined)}
      endMonth={endMonth ?? (hasDropdowns ? new Date(currentYear + 15, 11) : undefined)}
      navLayout={hasDropdowns ? undefined : 'around'}
      className={cn('w-[280px] p-2', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'relative flex flex-col gap-1',
        month_caption: 'flex h-9 items-center justify-center px-9',
        caption_label: 'flex items-center gap-1 text-sm font-semibold text-zinc-800',
        dropdowns: 'flex items-center justify-center gap-2',
        dropdown_root: 'relative rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 hover:bg-zinc-100',
        dropdown: 'absolute inset-0 cursor-pointer opacity-0',
        months_dropdown: '',
        years_dropdown: '',
        nav: hasDropdowns
          ? 'hidden'
          : 'absolute inset-x-0 top-1 z-10 flex items-center justify-between px-1',
        button_previous: 'inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40',
        button_next: 'inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40',
        chevron: 'fill-none text-zinc-400',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex gap-0.5',
        weekday: 'flex size-9 items-center justify-center text-xs font-semibold uppercase tracking-wider text-zinc-400',
        week: 'mt-0.5 flex gap-0.5',
        weeks: '',
        day: cn(
          'relative size-9 rounded-lg text-sm text-zinc-700 transition-all',
          'hover:bg-zinc-100 hover:text-zinc-900',
          'focus-within:z-10 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-900/30',
          props.mode === 'range'
            ? 'aria-selected:bg-primary-50 aria-selected:text-primary-900 aria-selected:rounded-none'
            : '',
        ),
        day_button: 'size-9 rounded-lg text-sm transition-all hover:scale-105 active:scale-95',
        selected: cn(
          '!bg-primary-900 !text-white !shadow-sm !shadow-primary-900/20',
          'hover:!bg-primary-800 hover:!text-white',
        ),
        today: cn(
          'font-semibold text-primary-900',
          'after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary-900',
        ),
        outside: 'text-zinc-300 aria-selected:text-zinc-400',
        disabled: 'cursor-not-allowed text-zinc-300 hover:bg-transparent hover:text-zinc-300',
        hidden: 'invisible',
        range_start: '!rounded-l-lg !rounded-r-none',
        range_end: '!rounded-r-lg !rounded-l-none',
        range_middle: '!rounded-none !bg-primary-50 !text-primary-900',
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
      }}
      {...props}
    />
  );
}
