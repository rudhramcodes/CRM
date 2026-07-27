import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar } from 'lucide-react';
import TaskPriorityBadge from './TaskPriorityBadge';
import { formatDate } from '../../../utils/formatters';

function TaskCardContent({ task }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-primary-900 leading-snug">{task.title}</p>
        {task.priority && <TaskPriorityBadge priority={task.priority} />}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {task.assignedTo?.name ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-zinc-100 rounded-full flex items-center justify-center">
              <span className="text-[9px] font-medium text-zinc-500">
                {task.assignedTo.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 truncate max-w-[100px]">{task.assignedTo.name}</span>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-300">Unassigned</span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[11px] text-zinc-400">
            <Calendar className="w-3 h-3" /> {formatDate(task.dueDate)}
          </span>
        )}
      </div>
      {task.checklistProgress > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-900 rounded-full" style={{ width: `${task.checklistProgress}%` }} />
          </div>
          <span className="text-[10px] text-zinc-400">{task.checklistProgress}%</span>
        </div>
      )}
    </div>
  );
}

export function TaskKanbanCardOverlay({ task }) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-3 shadow-sm">
      <TaskCardContent task={task} />
    </div>
  );
}

export default function TaskKanbanCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-zinc-200 p-3 shadow-sm hover:shadow-md hover:border-zinc-300 cursor-grab active:cursor-grabbing transition-all"
    >
      <TaskCardContent task={task} />
    </div>
  );
}
