import { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
  startOfToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../utils/cn';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarView({ meetings = [], onDayClick, onMeetingClick }) {
  const today = startOfToday();
  const [month, setMonth] = useState(startOfMonth(today));

  const byDay = useMemo(() => {
    const map = {};
    for (const m of meetings) {
      const key = format(new Date(m.date), 'yyyy-MM-dd');
      (map[key] = map[key] || []).push(m);
    }
    return map;
  }, [meetings]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayKey = (d) => format(d, 'yyyy-MM-dd');

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <h3 className="text-sm font-semibold text-primary-900">{format(month, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth(subMonths(month, 1))}
            className="p-1.5 rounded-md text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(today))}
            className="px-2 py-1 text-xs text-zinc-500 hover:text-primary-900 hover:bg-zinc-100 rounded-md transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            className="p-1.5 rounded-md text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/50">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = dayKey(d);
          const dayMeetings = byDay[key] || [];
          const inMonth = isSameMonth(d, month);
          const isToday = isSameDay(d, today);
          return (
            <div
              key={key}
              onClick={() => onDayClick?.(key)}
              className={cn(
                'min-h-24 p-1.5 border-b border-r border-zinc-50 cursor-pointer transition-colors hover:bg-zinc-50/60',
                !inMonth && 'bg-zinc-50/40',
                isToday && 'bg-primary-50/40',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-xs font-medium flex items-center justify-center size-5 rounded-full',
                    isToday ? 'bg-primary-900 text-white' : 'text-zinc-500',
                    !inMonth && 'text-zinc-300',
                  )}
                >
                  {format(d, 'd')}
                </span>
                {dayMeetings.length > 0 && (
                  <span className="text-[10px] text-zinc-400">{dayMeetings.length}</span>
                )}
              </div>
              <div className="space-y-1">
                {dayMeetings.slice(0, 3).map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMeetingClick?.(m);
                    }}
                    title={`${m.title} (${m.startTime})`}
                    className={cn(
                      'w-full flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] truncate transition-colors',
                      m.status === 'completed'
                        ? 'bg-zinc-100 text-zinc-500'
                        : 'bg-primary-50 text-primary-900 hover:bg-primary-100',
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full shrink-0',
                        m.status === 'completed' ? 'bg-zinc-400' : 'bg-primary-900',
                      )}
                    />
                    <span className="truncate">{m.title}</span>
                  </button>
                ))}
                {dayMeetings.length > 3 && (
                  <p className="px-1 text-[10px] text-zinc-400">+{dayMeetings.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}