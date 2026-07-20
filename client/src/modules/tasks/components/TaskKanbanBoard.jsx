import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { TASK_STATUS } from '../../../constants';
import TaskKanbanCard, { TaskKanbanCardOverlay } from './TaskKanbanCard';
import { cn } from '../../../utils/cn';

const COLUMN_ID_PREFIX = 'kanban-col-';

function KanbanColumn({ status, label, tasks, onTaskClick }) {
  const droppableId = COLUMN_ID_PREFIX + status;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const taskIds = useMemo(() => tasks.map((t) => t._id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col bg-zinc-50/50 rounded-xl border min-w-[260px] w-[260px] max-h-full',
        isOver ? 'border-primary-900/30 bg-primary-50/30' : 'border-zinc-200',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS[status] || 'bg-zinc-400')} />
          <span className="text-sm font-semibold text-zinc-700">{label}</span>
        </div>
        <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-[120px]">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-zinc-300 italic">
              Drop tasks here
            </div>
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

const STATUS_DOT_COLORS = {
  todo: 'bg-zinc-400',
  in_progress: 'bg-blue-500',
  review: 'bg-yellow-500',
  done: 'bg-green-500',
};

export default function TaskKanbanBoard({ tasks = [], loading, onTaskClick, onStatusChange, onReorder }) {
  const [activeTask, setActiveTask] = useState(null);
  const [localColumns, setLocalColumns] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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

  const displayColumns = localColumns || columns;

  const handleDragStart = useCallback((event) => {
    const task = event.active.data.current?.task;
    if (task) setActiveTask(task);
    setLocalColumns(null);
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveTask(null);
      setLocalColumns(null);
      if (!over) return;

      const activeTaskData = active.data.current?.task;
      if (!activeTaskData) return;

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

      if (!targetStatus) return;

      if (targetStatus === activeTaskData.status) {
        const col = [...(columns[targetStatus] || [])];
        const oldIdx = col.findIndex((t) => t._id === taskId);
        const newIdx = typeof over.id === 'string' && over.id.startsWith(COLUMN_ID_PREFIX)
          ? col.length
          : col.findIndex((t) => t._id === over.id);

        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

        const reordered = arrayMove(col, oldIdx, newIdx);
        const orderedIds = reordered.map((t) => t._id);

        const next = {};
        for (const [s, st] of Object.entries(columns)) {
          next[s] = s === targetStatus ? reordered : [...st];
        }
        setLocalColumns(next);
        onReorder?.(targetStatus, orderedIds);
        return;
      }

      if (activeTaskData.status !== targetStatus) {
        onStatusChange?.(taskId, targetStatus);
      }
    },
    [columns, onStatusChange, onReorder],
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-zinc-400">Loading board...</div>;
  }

  if (!tasks.length) {
    return <div className="flex items-center justify-center h-64 text-sm text-zinc-400">No tasks to display. Create some tasks to see them on the board.</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {TASK_STATUS.map(({ value, label }) => (
          <KanbanColumn
            key={value}
            status={value}
            label={label}
            tasks={displayColumns[value] || []}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 opacity-90">
            <TaskKanbanCardOverlay task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
