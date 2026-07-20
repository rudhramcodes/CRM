import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle } from 'lucide-react';
import TaskPriorityBadge from '../../tasks/components/TaskPriorityBadge';
import { formatDate } from '../../../utils/formatters';

function TaskCardContent({ task }) {
  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();

  return (
    <div className="flex items-start gap-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-700 leading-snug line-clamp-2">{task.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <TaskPriorityBadge priority={task.priority} />
          {task.assignedTo?.name && (
            <div className="flex items-center gap-1" title={task.assignedTo.name}>
              <div className="w-5 h-5 bg-zinc-200 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-medium text-zinc-500">{task.assignedTo.name.charAt(0)}</span>
              </div>
              <span className="text-[11px] text-zinc-400 truncate max-w-[80px]">{task.assignedTo.name}</span>
            </div>
          )}
        </div>
        {task.dueDate && (
          <p className={`flex items-center gap-1 text-[11px] mt-1.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
            {isOverdue && <AlertCircle className="w-3 h-3" />}
            {formatDate(task.dueDate)}
          </p>
        )}
      </div>
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
