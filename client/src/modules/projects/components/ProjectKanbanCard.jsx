import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProjectPriorityBadge from './ProjectPriorityBadge';

export default function ProjectKanbanCard({ project }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project._id,
    data: { project },
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="bg-white rounded-lg border border-zinc-200 p-3 shadow-sm hover:shadow-md hover:border-zinc-300 cursor-grab active:cursor-grabbing transition-all space-y-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-primary-900 font-medium text-[11px]">{project.title?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary-900 truncate">{project.title}</p>
          {project.tags?.length > 0 && <p className="text-[11px] text-zinc-400 truncate">{project.tags.slice(0, 2).join(', ')}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <ProjectPriorityBadge priority={project.priority} />
        {project.teamMembers?.length > 0 && (
          <span className="text-[11px] text-zinc-400">{project.teamMembers.length}m</span>
        )}
      </div>
    </div>
  );
}
