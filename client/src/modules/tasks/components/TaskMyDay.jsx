import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  CalendarDays,
  CornerDownLeft,
  GitBranch,
} from 'lucide-react';
import { format, isToday, isPast, isFuture, startOfToday, addDays } from 'date-fns';
import TaskPriorityBadge from './TaskPriorityBadge';
import { formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

export default function TaskMyDay({
  tasks = [],
  onTaskClick,
  onStatusChange,
  onQuickAdd,
  onReschedule,
  onOpenCreateModal,
}) {
  const [quickTitle, setQuickTitle] = useState('');
  const today = startOfToday();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

  // Categorize tasks for personal day planning
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== 'done'
  );

  const todayTasks = tasks.filter(
    (t) => (t.dueDate && isToday(new Date(t.dueDate))) || (t.status === 'in_progress' && t.status !== 'done')
  );

  const upcomingTasks = tasks.filter(
    (t) => t.dueDate && isFuture(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== 'done'
  );

  const completedTasks = tasks.filter((t) => t.status === 'done');

  const totalFocus = overdueTasks.length + todayTasks.length + completedTasks.length;
  const completedCount = completedTasks.length;
  const progressPercent = totalFocus > 0 ? Math.round((completedCount / totalFocus) * 100) : 0;

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAdd?.({
      title: quickTitle.trim(),
      dueDate: todayStr,
      status: 'todo',
    });
    setQuickTitle('');
  };

  const renderTaskItem = (task, isOverdue = false) => {
    const isDone = task.status === 'done';

    return (
      <div
        key={task._id}
        onClick={() => onTaskClick?.(task)}
        className={cn(
          'group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none',
          isDone
            ? 'bg-zinc-50/80 border-zinc-200/60 opacity-60 hover:opacity-90'
            : isOverdue
            ? 'bg-rose-50/30 border-rose-200/80 hover:border-rose-400 hover:shadow-md hover:bg-rose-50/50'
            : 'bg-white border-zinc-200/80 hover:border-blue-400/60 hover:shadow-md hover:scale-[1.004]',
        )}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Quick Toggle Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(task._id, isDone ? 'todo' : 'done');
            }}
            className="p-1 text-zinc-400 hover:text-emerald-600 transition-transform active:scale-90 shrink-0 cursor-pointer"
            title={isDone ? 'Mark as to do' : 'Mark as completed'}
          >
            {isDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
            ) : (
              <Circle className="w-5 h-5 text-zinc-300 group-hover:text-blue-500 transition-colors" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-xs sm:text-sm font-semibold truncate transition-colors',
                isDone ? 'line-through text-zinc-400' : 'text-primary-900 group-hover:text-blue-950',
              )}
            >
              {task.title}
            </p>

            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 flex-wrap">
              {task.project && (
                <span className="inline-flex items-center gap-1 font-medium text-zinc-600 bg-zinc-100/90 border border-zinc-200/60 px-2 py-0.5 rounded-lg text-[10px]">
                  <span>{task.project.title}</span>
                </span>
              )}
              {task.parent && (
                <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-lg text-[10px]">
                  <GitBranch className="w-2.5 h-2.5 text-indigo-500" />
                  <span>↳ {task.parent.title || 'Parent Task'}</span>
                </span>
              )}
              {task.dueDate && (
                <span
                  className={cn(
                    'flex items-center gap-1 font-medium',
                    isOverdue ? 'text-rose-600 font-semibold' : 'text-zinc-500',
                  )}
                >
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>{formatDate(task.dueDate)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
          {/* Overdue 1-click Quick Reschedulers */}
          {isOverdue && !isDone && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onReschedule?.(task._id, todayStr)}
                className="px-2.5 py-1 text-[10px] font-bold bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 rounded-lg shadow-2xs transition-colors cursor-pointer active:scale-95"
                title="Reschedule deadline to Today"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => onReschedule?.(task._id, tomorrowStr)}
                className="px-2.5 py-1 text-[10px] font-medium bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg shadow-2xs transition-colors cursor-pointer active:scale-95"
                title="Push deadline to Tomorrow"
              >
                Tomorrow
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <TaskPriorityBadge priority={task.priority} />
            <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Antigravity-Inspired Personal Focus Hub Hero Banner (Soft Green Emerald Theme) */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-[#065f46] via-[#047857] to-[#0d9488] text-white p-6 sm:p-8 shadow-[0_20px_45px_-15px_rgba(4,120,87,0.3)]">
        {/* Antigravity Dot Matrix Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.3) 1.25px, transparent 1.25px)',
            backgroundSize: '18px 18px',
          }}
        />

        {/* Soft Ambient Gradient Glow Orbs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {/* Illuminated Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-[11px] font-semibold tracking-wide backdrop-blur-md mb-2 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                <span>PERSONAL FOCUS HUB</span>
              </div>

              {/* Explicit !text-white to prevent global css override */}
              <h2 className="text-2xl sm:text-3xl font-extrabold !text-white tracking-tight drop-shadow-sm">
                {format(today, 'EEEE, MMMM d')}
              </h2>

              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1.5 font-normal">
                {progressPercent === 100 && totalFocus > 0
                  ? '🎉 All day goals achieved! Outstanding execution.'
                  : totalFocus === 0
                  ? 'All caught up! No active tasks due today.'
                  : `${overdueTasks.length + todayTasks.length} pending focus task${
                      overdueTasks.length + todayTasks.length !== 1 ? 's' : ''
                    } remaining for today.`}
              </p>
            </div>

            {/* Schedule CTA */}
            <button
              type="button"
              onClick={() => onOpenCreateModal?.({ dueDate: todayStr })}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-bold text-xs transition-all shadow-lg shadow-emerald-950/20 hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>Schedule Task</span>
            </button>
          </div>

          {/* Pure White Velocity Progress Line */}
          {totalFocus > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-emerald-100 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Today's Execution Progress
                </span>
                <span className="font-bold text-white">
                  {completedCount}/{totalFocus} deliverables ({progressPercent}%)
                </span>
              </div>
              <div className="h-2 w-full bg-black/20 backdrop-blur-xs rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(255,255,255,0.85)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Glassmorphic Inline Quick Add Input */}
          <form onSubmit={handleQuickSubmit} className="pt-1">
            <div className="relative flex items-center group">
              <input
                type="text"
                placeholder="+ Add a task directly to today's focus..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full text-xs sm:text-sm pl-4 pr-28 py-3 bg-black/15 hover:bg-black/20 focus:bg-black/25 !text-white placeholder-emerald-200/60 border border-white/20 focus:border-white/40 rounded-2xl outline-none backdrop-blur-md transition-all shadow-inner focus:ring-2 focus:ring-white/20"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                {quickTitle.trim() ? (
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3] text-emerald-700" />
                    <span>Add</span>
                    <span className="text-[10px] text-zinc-400 font-mono">↵</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 border border-white/25 text-white text-[11px] font-medium font-mono select-none">
                    <span>Enter</span>
                    <CornerDownLeft className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Sections Stack */}
      <div className="space-y-6">
        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Overdue Checkpoints
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 border border-rose-200/80 shadow-2xs">
                  {overdueTasks.length}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">Action required</span>
            </div>
            <div className="space-y-2">
              {overdueTasks.map((t) => renderTaskItem(t, true))}
            </div>
          </div>
        )}

        {/* Today's Focus Section */}
        {todayTasks.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
                  Today's Deliverables
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 border border-blue-200/80 shadow-2xs">
                  {todayTasks.length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {todayTasks.map((t) => renderTaskItem(t, false))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {upcomingTasks.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  Upcoming Deadlines
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200/80">
                  {upcomingTasks.length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {upcomingTasks.map((t) => renderTaskItem(t, false))}
            </div>
          </div>
        )}

        {/* Completed Section */}
        {completedTasks.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Completed Deliverables
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200/80">
                  {completedTasks.length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {completedTasks.map((t) => renderTaskItem(t, false))}
            </div>
          </div>
        )}

        {/* If completely empty */}
        {tasks.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-zinc-800">No tasks currently scheduled</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Start by typing a task in the quick add box above or schedule one with full details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
