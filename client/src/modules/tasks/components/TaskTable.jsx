import { useState, useMemo } from 'react';
import {
  Clock,
  CheckSquare,
  MessageSquare,
  Trash2,
  Edit2,
  User,
  FolderKanban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Circle,
  Lock,
  GitBranch,
} from 'lucide-react';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from './TaskPriorityBadge';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';
import { TASK_STATUS, TASK_PRIORITY } from '../../../constants';
import { formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };
const STATUS_ORDER = { todo: 1, in_progress: 2, review: 3, done: 4 };

export default function TaskTable({
  tasks = [],
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onDelete,
}) {
  const [sortKey, setSortKey] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    if (!sortKey) return tasks;

    return [...tasks].sort((a, b) => {
      let result = 0;
      if (sortKey === 'title') {
        result = (a.title || '').localeCompare(b.title || '');
      } else if (sortKey === 'status') {
        result = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0);
      } else if (sortKey === 'priority') {
        result = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
      } else if (sortKey === 'dueDate') {
        if (!a.dueDate && !b.dueDate) result = 0;
        else if (!a.dueDate) result = 1;
        else if (!b.dueDate) result = -1;
        else result = new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortKey === 'project') {
        const titleA = a.project?.title || '';
        const titleB = b.project?.title || '';
        result = titleA.localeCompare(titleB);
      }
      return sortDir === 'asc' ? result : -result;
    });
  }, [tasks, sortKey, sortDir]);

  const renderSortIndicator = (key) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-primary-900" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary-900" />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
      {/* Desktop Table (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              <th className="px-4 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="rounded border-zinc-300 text-primary-900 focus:ring-primary-900 cursor-pointer"
                  title="Select all tasks"
                />
              </th>
              <th
                onClick={() => handleSort('title')}
                className="px-4 py-3.5 cursor-pointer select-none group hover:text-primary-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Task Title</span>
                  {renderSortIndicator('title')}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-4 py-3.5 cursor-pointer select-none group hover:text-primary-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortIndicator('status')}
                </div>
              </th>
              <th
                onClick={() => handleSort('priority')}
                className="px-4 py-3.5 cursor-pointer select-none group hover:text-primary-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Priority</span>
                  {renderSortIndicator('priority')}
                </div>
              </th>
              <th
                onClick={() => handleSort('dueDate')}
                className="px-4 py-3.5 cursor-pointer select-none group hover:text-primary-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Due Date</span>
                  {renderSortIndicator('dueDate')}
                </div>
              </th>
              <th
                onClick={() => handleSort('project')}
                className="px-4 py-3.5 cursor-pointer select-none group hover:text-primary-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Project</span>
                  {renderSortIndicator('project')}
                </div>
              </th>
              <th className="px-4 py-3.5">Assignee</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-zinc-400">
                  No tasks match your filters.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => {
                const isSelected = selectedIds.includes(task._id);
                const isOverdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== 'done';

                const isBlocked = (task.dependsOn || []).some(
                  (d) => d && (d.status ? d.status !== 'done' : true)
                );

                const checklistTotal = task.checklists?.length || 0;
                const checklistDone =
                  task.checklists?.filter((c) => c.checked)?.length || 0;

                return (
                  <tr
                    key={task._id}
                    onClick={() => onTaskClick?.(task)}
                    className={cn(
                      'hover:bg-zinc-50/80 cursor-pointer transition-colors',
                      isSelected && 'bg-primary-900/5',
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(task._id)}
                        className="rounded border-zinc-300 text-primary-900 focus:ring-primary-900 cursor-pointer"
                      />
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <div className="min-w-0 max-w-sm">
                        <div className="flex items-center gap-1.5">
                          <p className={cn(
                            'font-semibold truncate',
                            task.status === 'done' ? 'line-through text-zinc-400' : 'text-zinc-900'
                          )}>
                            {task.title}
                          </p>
                          {isBlocked && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded shrink-0 shadow-2xs"
                              title="Blocked by incomplete dependent tasks"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Blocked</span>
                            </span>
                          )}
                          {task.parent && (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded-md shrink-0 shadow-2xs"
                              title={`Subtask of: ${task.parent.title || 'Parent Task'}`}
                            >
                              <GitBranch className="w-2.5 h-2.5 text-indigo-500" />
                              <span className="truncate max-w-[140px]">↳ {task.parent.title || 'Parent Task'}</span>
                            </span>
                          )}
                        </div>
                        {checklistTotal > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                            <CheckSquare className="w-3 h-3" />
                            <span>
                              {checklistDone}/{checklistTotal} items
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={task.status}
                        onValueChange={(val) => onStatusChange?.(task._id, val)}
                      >
                        <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent p-0 shadow-none cursor-pointer focus:ring-0">
                          <TaskStatusBadge status={task.status} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                          {TASK_STATUS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Priority Dropdown */}
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={task.priority}
                        onValueChange={(val) => onPriorityChange?.(task._id, val)}
                      >
                        <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent p-0 shadow-none cursor-pointer focus:ring-0">
                          <TaskPriorityBadge priority={task.priority} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                          {TASK_PRIORITY.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {task.dueDate ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[11px] font-medium',
                            isOverdue ? 'text-rose-600 font-semibold' : 'text-zinc-600',
                          )}
                        >
                          <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{formatDate(task.dueDate)}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>

                    {/* Project */}
                    <td className="px-4 py-3.5">
                      {task.project ? (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-600 font-medium truncate max-w-[130px]">
                          <FolderKanban className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{task.project.title}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3.5">
                      {task.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold text-[9px] shrink-0 shadow-2xs">
                            {(task.assignedTo.name?.[0] || 'U').toUpperCase()}
                          </div>
                          <span className="text-xs text-zinc-700 truncate max-w-[100px]">
                            {task.assignedTo.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onTaskClick?.(task)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="View / Edit Task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete?.(task)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch Cards (< md) */}
      <div className="md:hidden divide-y divide-zinc-100">
        {sortedTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No tasks match your filters.
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isSelected = selectedIds.includes(task._id);
            const isDone = task.status === 'done';
            const isOverdue =
              task.dueDate &&
              new Date(task.dueDate) < new Date() &&
              task.status !== 'done';

            const isBlocked = (task.dependsOn || []).some(
              (d) => d && (d.status ? d.status !== 'done' : true)
            );

            return (
              <div
                key={task._id}
                onClick={() => onTaskClick?.(task)}
                className={cn(
                  'p-4 space-y-3 bg-white hover:bg-zinc-50/60 active:bg-zinc-100/50 transition-all cursor-pointer',
                  isSelected && 'bg-primary-900/5',
                )}
              >
                {/* Header row: Checkbox, Project, Priority, Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(task._id)}
                      className="rounded border-zinc-300 text-primary-900 focus:ring-primary-900 cursor-pointer"
                    />
                    {task.project ? (
                      <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                        {task.project.title}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400">General</span>
                    )}

                    {isBlocked && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded shadow-2xs"
                        title="Blocked by incomplete dependent tasks"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span>Blocked</span>
                      </span>
                    )}

                    {task.parent && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded"
                        title="Subtask"
                      >
                        <GitBranch className="w-2.5 h-2.5 text-zinc-400" />
                        <span>Subtask</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                  </div>
                </div>

                {/* Task Title with 1-click round checkbox */}
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange?.(task._id, isDone ? 'todo' : 'done');
                    }}
                    className="p-0.5 text-zinc-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer mt-0.5"
                    title={isDone ? 'Mark as to do' : 'Mark as done'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-4 h-4 text-zinc-300" />
                    )}
                  </button>
                  <h4 className={cn(
                    'text-xs sm:text-sm font-semibold leading-snug flex-1',
                    isDone ? 'line-through text-zinc-400' : 'text-primary-900'
                  )}>
                    {task.title}
                  </h4>
                </div>

                {/* Footer: Due date & Assignee & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                  {task.dueDate ? (
                    <span
                      className={cn(
                        'flex items-center gap-1 text-[11px]',
                        isOverdue ? 'text-rose-600 font-semibold' : 'text-zinc-500',
                      )}
                    >
                      <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>{formatDate(task.dueDate)}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-300 text-[11px]">No due date</span>
                  )}

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {task.assignedTo && (
                      <div className="flex items-center gap-1 text-[11px] text-zinc-600">
                        <div className="w-4 h-4 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold text-[8px]">
                          {(task.assignedTo.name?.[0] || 'U').toUpperCase()}
                        </div>
                        <span className="truncate max-w-[80px]">{task.assignedTo.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete?.(task)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
