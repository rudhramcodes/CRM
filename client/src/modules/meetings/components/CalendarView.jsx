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
import { ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { cn } from '../../../utils/cn';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <div>
          <h3 className="font-heading text-base sm:text-lg font-bold text-primary-900 tracking-tight">
            {format(month, 'MMMM yyyy')}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Click on any day to filter sessions or click a meeting to view details
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMonth(subMonths(month, 1))}
            className="p-1.5 rounded-xl border border-zinc-200/80 bg-white text-zinc-500 hover:text-primary-900 hover:bg-zinc-50 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(today))}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:text-primary-900 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            className="p-1.5 rounded-xl border border-zinc-200/80 bg-white text-zinc-500 hover:text-primary-900 hover:bg-zinc-50 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/70 text-center">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className="py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-zinc-100">
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
                'min-h-28 p-2 border-b border-zinc-100 cursor-pointer transition-colors relative hover:bg-zinc-50/70 flex flex-col justify-between',
                !inMonth && 'bg-zinc-50/40 text-zinc-300',
                isToday && 'bg-primary-900/5'
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    'text-xs font-bold flex items-center justify-center w-6 h-6 rounded-lg transition-all',
                    isToday
                      ? 'bg-primary-900 text-white shadow-2xs'
                      : inMonth
                        ? 'text-zinc-700'
                        : 'text-zinc-300'
                  )}
                >
                  {format(d, 'd')}
                </span>
                {dayMeetings.length > 0 && (
                  <span className="text-[10px] font-bold text-zinc-500 px-1.5 py-0.2 rounded-full bg-zinc-100 border border-zinc-200/60">
                    {dayMeetings.length}
                  </span>
                )}
              </div>

              {/* Day Meetings Stack */}
              <div className="space-y-1 mt-auto">
                {dayMeetings.slice(0, 3).map((m) => {
                  const isCompleted = m.status === 'completed';
                  const isCancelled = m.status === 'cancelled';

                  return (
                    <button
                      key={m._id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMeetingClick?.(m);
                      }}
                      title={`${m.title} (${m.startTime})`}
                      className={cn(
                        'w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium truncate transition-all text-left shadow-2xs border',
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                          : isCancelled
                            ? 'bg-rose-50 text-rose-800 border-rose-200/60 line-through opacity-70'
                            : 'bg-white hover:bg-zinc-50 text-primary-900 border-zinc-200/80'
                      )}
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          isCompleted
                            ? 'bg-emerald-500'
                            : isCancelled
                              ? 'bg-rose-500'
                              : 'bg-sky-500'
                        )}
                      />
                      <span className="truncate flex-1 font-semibold">{m.title}</span>
                      {m.meetingLink && (
                        <Video className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                      )}
                    </button>
                  );
                })}

                {dayMeetings.length > 3 && (
                  <p className="px-1 text-[10px] font-semibold text-zinc-400">
                    +{dayMeetings.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}