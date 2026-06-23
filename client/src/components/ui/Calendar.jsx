import { useCallback } from 'react';
import { DayPicker, useDayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => currentYear - 10 + i);

function getMonthOptions(currentMonth) {
  return MONTHS.map((name, idx) => ({
    value: idx,
    label: name,
    disabled: false,
  }));
}

function getYearOptions() {
  return YEARS.map((y) => ({
    value: y,
    label: String(y),
    disabled: false,
  }));
}

function DropdownCaption() {
  const { currentMonth, goToMonth } = useDayPicker();

  const handleMonthChange = useCallback(
    (e) => {
      const month = parseInt(e.target.value, 10);
      const next = new Date(currentMonth);
      next.setMonth(month);
      goToMonth(next);
    },
    [currentMonth, goToMonth],
  );

  const handleYearChange = useCallback(
    (e) => {
      const year = parseInt(e.target.value, 10);
      const next = new Date(currentMonth);
      next.setFullYear(year);
      goToMonth(next);
    },
    [currentMonth, goToMonth],
  );

  return (
    <div className="flex items-center justify-between px-3 pt-2 pb-1">
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          const prev = new Date(currentMonth);
          prev.setMonth(prev.getMonth() - 1);
          goToMonth(prev);
        }}
        className="inline-flex items-center justify-center size-7 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition-all"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex items-center gap-1.5">
        <div className="relative">
          <select
            value={currentMonth.getMonth()}
            onChange={handleMonthChange}
            className="text-sm font-medium text-zinc-800 appearance-none bg-transparent hover:bg-zinc-100 rounded-md px-2 py-1 pr-6 cursor-pointer outline-none transition-colors"
          >
            {getMonthOptions(currentMonth).map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3 text-zinc-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
        </div>
        <div className="relative">
          <select
            value={currentMonth.getFullYear()}
            onChange={handleYearChange}
            className="text-sm font-medium text-zinc-800 appearance-none bg-transparent hover:bg-zinc-100 rounded-md px-2 py-1 pr-6 cursor-pointer outline-none transition-colors"
          >
            {getYearOptions().map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3 text-zinc-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          const next = new Date(currentMonth);
          next.setMonth(next.getMonth() + 1);
          goToMonth(next);
        }}
        className="inline-flex items-center justify-center size-7 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition-all"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function ButtonsCaption() {
  const { currentMonth, goToMonth } = useDayPicker();

  const formatted = `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="flex items-center justify-between px-3 pt-2 pb-1">
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          const prev = new Date(currentMonth);
          prev.setMonth(prev.getMonth() - 1);
          goToMonth(prev);
        }}
        className="inline-flex items-center justify-center size-7 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition-all"
      >
        <ChevronLeft className="size-4" />
      </button>

      <span className="text-sm font-semibold text-zinc-800 select-none">{formatted}</span>

      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          const next = new Date(currentMonth);
          next.setMonth(next.getMonth() + 1);
          goToMonth(next);
        }}
        className="inline-flex items-center justify-center size-7 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition-all"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export default function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'buttons',
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'space-y-0',
        caption_label: 'hidden',
        nav: 'hidden',
        button: 'text-sm w-full',
        day: cn(
          'relative text-sm text-zinc-700 rounded-lg transition-all size-9',
          'hover:bg-zinc-100 hover:text-zinc-900',
          'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900/30',
          props.mode === 'range'
            ? 'aria-selected:bg-primary-50 aria-selected:text-primary-900 aria-selected:rounded-none'
            : '',
        ),
        day_button: cn(
          'text-sm rounded-lg size-9 transition-all',
          'hover:scale-105 active:scale-95',
        ),
        day_selected: cn(
          '!bg-primary-900 !text-white !shadow-sm !shadow-primary-900/20',
          'hover:!bg-primary-800 hover:!text-white',
          'focus-visible:!bg-primary-900 focus-visible:!text-white',
        ),
        day_today: cn(
          'font-semibold text-primary-900',
          'after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2',
          'after:size-1 after:rounded-full after:bg-primary-900',
        ),
        day_outside: 'text-zinc-300 aria-selected:text-zinc-400',
        day_disabled: 'text-zinc-300 !cursor-not-allowed hover:bg-transparent hover:text-zinc-300',
        day_hidden: 'invisible',
        day_range_start: '!rounded-l-lg !rounded-r-none',
        day_range_end: '!rounded-r-lg !rounded-l-none',
        day_range_middle: '!bg-primary-50 !text-primary-900 !rounded-none',
        head: 'flex gap-0.5 px-3',
        head_cell: 'text-xs font-semibold text-zinc-400 size-9 flex items-center justify-center uppercase tracking-wider',
        row: 'flex gap-0.5 px-3',
        tbody: 'space-y-0.5 pb-3',
        ...classNames,
      }}
      components={{
        Chevron: () => null,
        Caption: captionLayout === 'dropdown' ? DropdownCaption : ButtonsCaption,
      }}
      {...props}
    />
  );
}
