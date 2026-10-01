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
import { ChevronLeft, ChevronRight, Video, Calendar, Clock, ExternalLink, Repeat } from 'lucide-react';
import { cn } from '../../../utils/cn';
import MeetingStatusBadge from './MeetingStatusBadge';

const WEEKDAYS = [
  { short: 'Sun', letter: 'S' },
  { short: 'Mon', letter: 'M' },
  { short: 'Tue', letter: 'T' },
  { short: 'Wed', letter: 'W' },
  { short: 'Thu', letter: 'T' },
  { short: 'Fri', letter: 'F' },
  { short: 'Sat', letter: 'S' },
];

export default function CalendarView({ meetings = [], onDayClick, onMeetingClick }) {
  const today = startOfToday();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState(today);

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
  const selectedDayKey = selectedDay ? dayKey(selectedDay) : '';
  const selectedMeetings = byDay[selectedDayKey] || [];

  const handleCellClick = (d) => {
    const key = dayKey(d);
    setSelectedDay(d);
    onDayClick?.(key);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
        {/* Month Navigator Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-4 border-b border-zinc-100">
          <div>
            <h3 className="font-heading text-base sm:text-lg font-bold text-primary-900 tracking-tight">
              {format(month, 'MMMM yyyy')}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5 hidden sm:block">
              Click on any day to inspect sessions or filter the appointment timeline
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
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
              onClick={() => {
                setMonth(startOfMonth(today));
                setSelectedDay(today);
              }}
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
              className="py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-400"
            >
              <span className="sm:hidden">{d.letter}</span>
              <span className="hidden sm:inline">{d.short}</span>
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
            const isSelected = selectedDay && isSameDay(d, selectedDay);

            return (
              <div
                key={key}
                onClick={() => handleCellClick(d)}
                className={cn(
                  'min-h-14 sm:min-h-28 p-1 sm:p-2 border-b border-zinc-100 cursor-pointer transition-colors relative hover:bg-zinc-50/70 flex flex-col justify-between',
                  !inMonth && 'bg-zinc-50/40 text-zinc-300',
                  isToday && 'bg-primary-900/5',
                  isSelected && 'ring-2 ring-primary-900 ring-inset bg-primary-900/5 z-10'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-xs font-bold flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-lg transition-all',
                      isToday
                        ? 'bg-primary-900 text-white shadow-2xs'
                        : isSelected
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : inMonth
                        ? 'text-zinc-700'
                        : 'text-zinc-300'
                    )}
                  >
                    {format(d, 'd')}
                  </span>
                  {dayMeetings.length > 0 && (
                    <span className="hidden sm:inline-block text-[10px] font-bold text-zinc-500 px-1.5 py-0.2 rounded-full bg-zinc-100 border border-zinc-200/60">
                      {dayMeetings.length}
                    </span>
                  )}
                </div>

                {/* Mobile indicators (< sm): color-coded dots */}
                <div className="flex sm:hidden items-center justify-center gap-1 mt-auto py-1">
                  {dayMeetings.slice(0, 3).map((m, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        m.status === 'completed'
                          ? 'bg-emerald-500'
                          : m.status === 'cancelled'
                          ? 'bg-rose-500'
                          : 'bg-primary-900'
                      )}
                    />
                  ))}
                  {dayMeetings.length > 3 && (
                    <span className="text-[8px] font-bold text-zinc-400 leading-none">+</span>
                  )}
                </div>

                {/* Desktop Meeting Cards (>= sm) */}
                <div className="hidden sm:block space-y-1 mt-auto">
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
                          'w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium truncate transition-all text-left shadow-2xs border cursor-pointer',
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

      {/* Mobile Agenda for Selected Day (< sm) */}
      <div className="sm:hidden bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary-900">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>
              {selectedDay ? format(selectedDay, 'EEEE, MMM d, yyyy') : 'Selected Date'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-zinc-400">
            {selectedMeetings.length} session{selectedMeetings.length !== 1 ? 's' : ''}
          </span>
        </div>

        {selectedMeetings.length === 0 ? (
          <p className="text-xs text-zinc-400 py-3 text-center">
            No meetings scheduled on this day
          </p>
        ) : (
          <div className="space-y-2">
            {selectedMeetings.map((m) => (
              <div
                key={m._id}
                onClick={() => onMeetingClick?.(m)}
                className="p-3 rounded-xl border border-zinc-200/80 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50 active:bg-zinc-100 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary-900 truncate">{m.title}</p>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {m.startTime} - {m.endTime}
                    </p>
                  </div>
                  <MeetingStatusBadge status={m.status} />
                </div>

                {m.meetingLink && (
                  <div className="pt-1.5 border-t border-zinc-100 flex items-center justify-between">
                    <a
                      href={m.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <Video className="w-3 h-3" />
                      <span>Join Meeting Link</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}