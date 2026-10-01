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
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Flag,
  CheckCircle2,
  Circle,
  Plus,
} from 'lucide-react';
import TaskPriorityBadge from './TaskPriorityBadge';
import TaskStatusBadge from './TaskStatusBadge';
import { cn } from '../../../utils/cn';

const WEEKDAYS = [
  { short: 'Sun', letter: 'S' },
  { short: 'Mon', letter: 'M' },
  { short: 'Tue', letter: 'T' },
  { short: 'Wed', letter: 'W' },
  { short: 'Thu', letter: 'T' },
  { short: 'Fri', letter: 'F' },
  { short: 'Sat', letter: 'S' },
];

export default function TaskCalendar({
  tasks = [],
  onTaskClick,
  onStatusChange,
  onOpenCreateModal,
}) {
  const today = startOfToday();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState(today);

  const byDay = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = format(new Date(t.dueDate), 'yyyy-MM-dd');
      (map[key] = map[key] || []).push(t);
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayKey = (d) => format(d, 'yyyy-MM-dd');
  const selectedDayKey = selectedDay ? dayKey(selectedDay) : '';
  const selectedTasks = byDay[selectedDayKey] || [];

  return (
    <div className="space-y-4">
      {/* Calendar Month Container */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
        {/* Month Navigator Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-4 border-b border-zinc-100">
          <div>
            <h3 className="font-heading text-base sm:text-lg font-bold text-primary-900 tracking-tight">
              {format(month, 'MMMM yyyy')}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5 hidden sm:block">
              Inspect task deadlines, milestones, and daily deliverables
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
            const dayTasks = byDay[key] || [];
            const inMonth = isSameMonth(d, month);
            const isCurrentDay = isSameDay(d, today);
            const isSelected = selectedDay && isSameDay(d, selectedDay);

            return (
              <div
                key={key}
                onClick={() => setSelectedDay(d)}
                className={cn(
                  'min-h-14 sm:min-h-28 p-1 sm:p-2 border-b border-zinc-100 cursor-pointer transition-all relative hover:bg-zinc-50/80 flex flex-col justify-between select-none',
                  !inMonth && 'bg-zinc-50/40 text-zinc-300',
                  isCurrentDay && 'bg-primary-900/5',
                  isSelected && 'ring-2 ring-primary-900 ring-inset bg-primary-900/5 z-10',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-xs font-bold flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-lg transition-all',
                      isCurrentDay
                        ? 'bg-primary-900 text-white shadow-2xs'
                        : isSelected
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : inMonth
                        ? 'text-zinc-700'
                        : 'text-zinc-300',
                    )}
                  >
                    {format(d, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="hidden sm:inline-block text-[10px] font-bold text-zinc-500 px-1.5 py-0.2 rounded-full bg-zinc-100 border border-zinc-200/60">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Mobile indicators (< sm): color-coded dots */}
                <div className="flex sm:hidden items-center justify-center gap-1 mt-auto py-1">
                  {dayTasks.slice(0, 3).map((t, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        t.status === 'done'
                          ? 'bg-emerald-500'
                          : t.priority === 'urgent'
                          ? 'bg-rose-500'
                          : 'bg-primary-900',
                      )}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[8px] font-bold text-zinc-400 leading-none">+</span>
                  )}
                </div>

                {/* Desktop Task Cards (>= sm) */}
                <div className="hidden sm:block space-y-1 mt-auto">
                  {dayTasks.slice(0, 3).map((t) => {
                    const isDone = t.status === 'done';

                    return (
                      <button
                        key={t._id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick?.(t);
                        }}
                        className={cn(
                          'w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium truncate transition-all text-left shadow-2xs border cursor-pointer',
                          isDone
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60 line-through opacity-70'
                            : 'bg-white hover:bg-zinc-50 text-primary-900 border-zinc-200/80',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            isDone ? 'bg-emerald-500' : 'bg-primary-900',
                          )}
                        />
                        <span className="truncate flex-1 font-semibold">{t.title}</span>
                      </button>
                    );
                  })}

                  {dayTasks.length > 3 && (
                    <p className="px-1 text-[10px] font-semibold text-zinc-400">
                      +{dayTasks.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Drawer Card (both desktop and mobile) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <h4 className="text-sm font-bold text-primary-900">
              {selectedDay ? format(selectedDay, 'EEEE, MMMM d, yyyy') : 'Selected Date'}
            </h4>
            <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {selectedTasks.length} deadline{selectedTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenCreateModal?.({ dueDate: selectedDayKey })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-900 text-white hover:bg-primary-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task for this Day</span>
          </button>
        </div>

        {selectedTasks.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            No deadlines scheduled for {selectedDay ? format(selectedDay, 'MMMM d') : 'this day'}.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {selectedTasks.map((t) => {
              const isDone = t.status === 'done';

              return (
                <div
                  key={t._id}
                  onClick={() => onTaskClick?.(t)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all cursor-pointer space-y-2',
                    isDone
                      ? 'bg-zinc-50/70 border-zinc-200/60 opacity-60'
                      : 'bg-white hover:bg-zinc-50/80 border-zinc-200/80 hover:border-zinc-300 shadow-2xs',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange?.(t._id, isDone ? 'todo' : 'done');
                        }}
                        className="p-0.5 text-zinc-400 hover:text-emerald-600 transition-colors shrink-0"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-300" />
                        )}
                      </button>
                      <p className={cn(
                        'text-xs font-bold truncate flex-1',
                        isDone ? 'line-through text-zinc-400' : 'text-primary-900'
                      )}>
                        {t.title}
                      </p>
                    </div>
                    <TaskStatusBadge status={t.status} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <span className="truncate max-w-[140px] font-medium text-zinc-600">
                      {t.project?.title || 'General Task'}
                    </span>
                    <TaskPriorityBadge priority={t.priority} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
