import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../../utils/cn';
import { LEAD_BRANDS } from '../../../constants';

function LeadCardContent({ lead }) {
  const initials = lead.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const brandLabel = LEAD_BRANDS.find((b) => b.value === lead.brand)?.label;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shrink-0 ring-1 ring-zinc-200/50">
          <span className="text-primary-900 font-semibold text-xs">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-900 truncate leading-tight">{lead.name}</p>
          {lead.company && (
            <p className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">{lead.company}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {brandLabel && (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary-50 text-primary-700 truncate max-w-[120px]">
            {brandLabel}
          </span>
        )}
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-100 text-zinc-500 capitalize truncate">
          {lead.source?.replace(/_/g, ' ') || 'Other'}
        </span>
      </div>

      {lead.assignedTo?.name && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="w-4 h-4 bg-zinc-200 rounded-full flex items-center justify-center">
            <span className="text-[8px] font-medium text-zinc-500">
              {lead.assignedTo.name[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 truncate">{lead.assignedTo.name}</span>
        </div>
      )}
    </div>
  );
}

export function LeadKanbanCardOverlay({ lead }) {
  return (
    <div className="bg-white rounded-lg border-2 border-primary-900/20 p-3.5 shadow-xl">
      <LeadCardContent lead={lead} />
    </div>
  );
}

export default function LeadKanbanCard({ lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead._id,
    data: { lead },
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
      className={cn(
        'bg-white rounded-lg border p-3.5 shadow-sm transition-all',
        isDragging
          ? 'border-primary-900/30 shadow-lg opacity-80 ring-2 ring-primary-900/10'
          : 'border-zinc-200 hover:border-zinc-300 hover:shadow-md cursor-grab active:cursor-grabbing',
      )}
    >
      <LeadCardContent lead={lead} />
    </div>
  );
}
