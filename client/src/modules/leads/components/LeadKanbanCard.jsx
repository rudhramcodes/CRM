import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LeadStatusBadge from './LeadStatusBadge';

export default function LeadKanbanCard({ lead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead._id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const initials = lead.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-zinc-200 p-3 shadow-sm hover:shadow-md hover:border-zinc-300 cursor-grab active:cursor-grabbing transition-all space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-primary-900 font-medium text-[11px]">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary-900 truncate">
              {lead.name}
            </p>
            {lead.company && (
              <p className="text-[11px] text-zinc-400 truncate">{lead.company}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] text-zinc-400 capitalize truncate">
          {lead.source?.replace(/_/g, ' ') || 'Other'}
        </span>
        {lead.email && (
          <span className="text-[11px] text-zinc-400 truncate">{lead.email}</span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        {lead.assignedTo?.name && (
          <span className="text-[11px] text-zinc-400 truncate">
            {lead.assignedTo.name}
          </span>
        )}
      </div>
    </div>
  );
}
