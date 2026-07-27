import { useState, useMemo, useCallback } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TASK_STATUS } from '../../../constants';
import TaskKanbanCard, { TaskKanbanCardOverlay } from './TaskKanbanCard';
import TaskStatusBadge from './TaskStatusBadge';
import { cn } from '../../../utils/cn';

const COLUMN_ID_PREFIX = 'kanban-col-';

const statusColors = {
  todo: 'bg-zinc-400',
  in_progress: 'bg-blue-500',
  review: 'bg-amber-500',
  done: 'bg-green-500',
};

function KanbanColumn({ status, label, tasks, onTaskClick }) {
  const droppableId = COLUMN_ID_PREFIX + status;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const taskIds = useMemo(() => tasks.map((t) => t._id), [tasks]);

  return (
    <div ref={setNodeRef} className={cn(
      'flex flex-col bg-zinc-50/50 rounded-xl border min-w-[260px] w-[260px] max-h-full',
      isOver ? 'border-primary-900/30 bg-primary-50/30' : 'border-zinc-200',
    )}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', statusColors[status] || 'bg-zinc-400')} />
          <span className="text-sm font-semibold text-zinc-700">{label}</span>
        </div>
        <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">{tasks.length}</span>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-[120px]">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-zinc-300 italic">Drop tasks here</div>
          ) : (
            tasks.map((task) => (
              <div key={task._id} onClick={() => onTaskClick?.(task)}>
                <TaskKanbanCard task={task} />
              </div>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function TaskKanbanBoard({ tasks = [], loading, onTaskClick, onStatusChange, onReorder }) {
  const [activeTask, setActiveTask] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = useMemo(() => {
    const grouped = {};
    TASK_STATUS.forEach((s) => { grouped[s.value] = []; });
    tasks.forEach((task) => {
      const status = task.status || 'todo';
      if (grouped[status]) grouped[status].push(task);
      else grouped[status] = [task];
    });
    return grouped;
  }, [tasks]);

  const handleDragStart = useCallback((event) => {
    const task = event.active.data.current?.task;
    if (task) setActiveTask(task);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id;
    let targetStatus = null;

    if (typeof over.id === 'string' && over.id.startsWith(COLUMN_ID_PREFIX)) {
      targetStatus = over.id.replace(COLUMN_ID_PREFIX, '');
    }
    if (!targetStatus) {
      for (const [status, statusTasks] of Object.entries(columns)) {
        if (statusTasks.some((t) => t._id === over.id)) {
          targetStatus = status;
          break;
        }
      }
    }

    if (targetStatus) {
      const task = active.data.current?.task;
      if (task && task.status !== targetStatus) {
        onStatusChange?.(task._id, targetStatus);
      }
      const colTasks = columns[targetStatus] || [];
      const orderedIds = colTasks.map((t) => t._id);
      if (task && task.status !== targetStatus) {
        orderedIds.unshift(taskId);
      }
      onReorder?.({ status: targetStatus, orderedIds });
    }
  }, [columns, onStatusChange, onReorder]);

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-zinc-400">Loading board...</div>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {TASK_STATUS.map(({ value, label }) => (
          <KanbanColumn key={value} status={value} label={label} tasks={columns[value] || []} onTaskClick={onTaskClick} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <div className="rotate-2 opacity-90"><TaskKanbanCardOverlay task={activeTask} /></div> : null}
      </DragOverlay>
    </DndContext>
  );
}
