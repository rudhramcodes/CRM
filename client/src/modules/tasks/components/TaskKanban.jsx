import { useState } from 'react';
import {
  Plus,
  Clock,
  CheckSquare,
  MessageSquare,
  AlertCircle,
  User,
  CheckCircle2,
  Circle,
  Trash2,
  ChevronDown,
  Lock,
  GitBranch,
} from 'lucide-react';
import TaskPriorityBadge from './TaskPriorityBadge';
import { formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'border-zinc-200 bg-zinc-50/70', badge: 'bg-zinc-200/80 text-zinc-700' },
  { id: 'in_progress', label: 'In Progress', color: 'border-blue-200/80 bg-blue-50/30', badge: 'bg-blue-100 text-blue-800' },
  { id: 'review', label: 'Review', color: 'border-amber-200/80 bg-amber-50/30', badge: 'bg-amber-100 text-amber-800' },
  { id: 'done', label: 'Done', color: 'border-emerald-200/80 bg-emerald-50/30', badge: 'bg-emerald-100 text-emerald-800' },
];

export default function TaskKanban({
  tasks = [],
  onTaskClick,
  onStatusChange,
  onQuickAdd,
  onDelete,
  onOpenCreateModal,
}) {
  const [quickTitles, setQuickTitles] = useState({});
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    if (dragOverColumn !== columnId) setDragOverColumn(columnId);
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the column element itself
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDragOverColumn(null);
    setDraggedTaskId(null);
    if (taskId && columnId) {
      onStatusChange?.(taskId, columnId);
    }
  };

  const handleQuickAddSubmit = (columnId, e) => {
    e.preventDefault();
    const title = (quickTitles[columnId] || '').trim();
    if (!title) return;
    onQuickAdd?.({ title, status: columnId });
    setQuickTitles((prev) => ({ ...prev, [columnId]: '' }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start pb-4 overflow-x-auto">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);
        const overdueInCol = columnTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < new Date() && col.id !== 'done'
        ).length;
        const isDragTarget = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
            className={cn(
              'rounded-2xl border p-3 flex flex-col min-h-[500px] transition-all duration-200 min-w-[260px]',
              col.color,
              isDragTarget ? 'border-primary-900 ring-2 ring-primary-900/20 bg-primary-900/5' : '',
            )}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="font-heading text-xs font-bold uppercase tracking-wider text-zinc-800">
                  {col.label}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs',
                    col.badge,
                  )}
                >
                  {columnTasks.length}
                </span>
                {overdueInCol > 0 && (
                  <span
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700"
                    title={`${overdueInCol} task${overdueInCol > 1 ? 's' : ''} overdue in this stage`}
                  >
                    <AlertCircle className="w-2.5 h-2.5" />
                    <span>{overdueInCol}</span>
                  </span>
                )}
              </div>

              {/* Add modal button */}
              <button
                type="button"
                onClick={() => onOpenCreateModal?.({ status: col.id })}
                className="p-1 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-white/80 transition-colors cursor-pointer"
                title={`Create task in ${col.label}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Inline Card Form */}
            <form
              onSubmit={(e) => handleQuickAddSubmit(col.id, e)}
              className="mb-3"
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="+ Quick add task (press Enter)..."
                  value={quickTitles[col.id] || ''}
                  onChange={(e) =>
                    setQuickTitles((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  className="w-full text-xs px-3 py-2 bg-white border border-zinc-200/90 rounded-xl shadow-2xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-all font-medium"
                />
              </div>
            </form>

            {/* Cards Stack */}
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
              {columnTasks.length === 0 ? (
                <div className={cn(
                  'h-28 border border-dashed rounded-xl flex items-center justify-center text-xs text-zinc-400 transition-colors',
                  isDragTarget ? 'border-primary-900 bg-white/70' : 'border-zinc-300/80'
                )}>
                  {isDragTarget ? 'Drop task here' : `No tasks in ${col.label.toLowerCase()}`}
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isDone = task.status === 'done';
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
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task._id)}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        'group bg-white rounded-xl border border-zinc-200/80 p-3.5 shadow-2xs hover:border-zinc-300 hover:shadow-md transition-all cursor-pointer active:cursor-grabbing space-y-2.5 select-none relative',
                        draggedTaskId === task._id && 'opacity-40 scale-95',
                        isDone && 'bg-zinc-50/70 border-zinc-200/50',
                      )}
                    >
                      {/* Project Tag & Priority & Blocked & Quick Actions */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.project ? (
                            <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                              {task.project.title || 'Project'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-zinc-400">General Task</span>
                          )}

                          {isBlocked && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shadow-2xs"
                              title="Blocked by incomplete dependent tasks"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Blocked</span>
                            </span>
                          )}

                          {task.parent && (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded-md shadow-2xs"
                              title={`Subtask of: ${task.parent.title || 'Parent Task'}`}
                            >
                              <GitBranch className="w-2.5 h-2.5 text-indigo-500" />
                              <span className="truncate max-w-[130px]">↳ {task.parent.title || 'Parent Task'}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <TaskPriorityBadge priority={task.priority} />
                          {/* Quick delete on hover */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.(task);
                            }}
                            className="p-1 rounded text-zinc-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Title with fast 1-click round checkbox */}
                      <div className="flex items-start gap-2">
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
                            <Circle className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500" />
                          )}
                        </button>
                        <p className={cn(
                          'font-semibold text-xs leading-snug line-clamp-2 flex-1',
                          isDone ? 'line-through text-zinc-400' : 'text-primary-900',
                        )}>
                          {task.title}
                        </p>
                      </div>

                      {/* Checklist Progress if exists */}
                      {checklistTotal > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                            <span className="flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-zinc-400" />
                              Checklist
                            </span>
                            <span>
                              {checklistDone}/{checklistTotal}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-900 rounded-full transition-all"
                              style={{
                                width: `${Math.round((checklistDone / checklistTotal) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Card Footer: Due Date, Assignee, Meta Icons, Quick Stage Selector */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px] text-zinc-400">
                        {task.dueDate ? (
                          <span
                            className={cn(
                              'flex items-center gap-1 font-medium',
                              isOverdue ? 'text-rose-600 font-semibold' : 'text-zinc-500',
                            )}
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{formatDate(task.dueDate)}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-300">No due date</span>
                        )}

                        <div className="flex items-center gap-2 shrink-0">
                          {task.comments?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-zinc-400">
                              <MessageSquare className="w-3 h-3" />
                              <span className="text-[10px]">{task.comments.length}</span>
                            </span>
                          )}

                          {task.assignedTo ? (
                            <div
                              className="w-5 h-5 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold text-[9px] shadow-2xs"
                              title={task.assignedTo.name || 'Assignee'}
                            >
                              {(task.assignedTo.name?.[0] || 'U').toUpperCase()}
                            </div>
                          ) : (
                            <div
                              className="w-5 h-5 rounded-full bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-400"
                              title="Unassigned"
                            >
                              <User className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
