import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { Mail, Phone, Clock, Building2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { LEAD_BRANDS, BRAND_METAS } from '../../../constants';

function LeadCardContent({ lead }) {
  const initials = lead.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'LE';

  const brandObj = LEAD_BRANDS.find((b) => b.value === lead.brand);
  const brandMeta = BRAND_METAS[lead.brand];

  return (
    <div className="space-y-3">
      {/* Header: Avatar, Name & Brand */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <span className="text-primary-900 font-bold text-xs">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold text-primary-900 truncate leading-snug">
              {lead.name}
            </p>
            {lead.company ? (
              <p className="text-[11px] text-zinc-400 truncate mt-0.5 flex items-center gap-1 font-normal">
                <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                <span className="truncate">{lead.company}</span>
              </p>
            ) : (
              <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
                {lead.email}
              </p>
            )}
          </div>
        </div>

        {/* Brand Logo / Badge */}
        {brandMeta ? (
          <div className="shrink-0">
            {brandMeta.logo ? (
              <img
                src={brandMeta.logo}
                alt={brandMeta.name}
                className="w-5 h-5 rounded-md object-contain border border-zinc-200/70 p-0.5 bg-white shadow-2xs"
                title={brandMeta.name}
              />
            ) : (
              <div
                className={cn(
                  'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-2xs bg-gradient-to-br',
                  brandMeta.gradient
                )}
                title={brandMeta.name}
              >
                {brandMeta.name?.[0] || 'R'}
              </div>
            )}
          </div>
        ) : brandObj ? (
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/60 truncate max-w-[90px]">
            {brandObj.label}
          </span>
        ) : null}
      </div>

      {/* Meta Chips: Source, Contact channels */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(lead.clientId || lead.convertedToClient?.clientId) && (
          <span
            className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/80 shrink-0"
            title={`Assigned Client ID: ${lead.clientId || lead.convertedToClient?.clientId}`}
          >
            {lead.clientId || lead.convertedToClient?.clientId}
          </span>
        )}
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/60 capitalize truncate">
          {lead.source?.replace(/_/g, ' ') || 'Direct'}
        </span>
        {lead.phone && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-normal rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60" title={lead.phone}>
            <Phone className="w-2.5 h-2.5" />
          </span>
        )}
        {lead.email && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-normal rounded-md bg-blue-50 text-blue-700 border border-blue-200/60" title={lead.email}>
            <Mail className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Footer: Assigned Rep & Creation Timestamp */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-4 h-4 rounded-full bg-zinc-200 flex items-center justify-center text-[8px] font-bold text-zinc-600 shrink-0">
            {lead.assignedTo?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="truncate max-w-[90px] text-zinc-500 font-medium">
            {lead.assignedTo?.name || 'Unassigned'}
          </span>
        </div>

        {lead.createdAt && (
          <span className="flex items-center gap-1 shrink-0 text-zinc-400" title={new Date(lead.createdAt).toLocaleDateString()}>
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function LeadKanbanCardOverlay({ lead }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-primary-900/40 p-3.5 shadow-2xl scale-105 rotate-1">
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
        'bg-white rounded-2xl border p-3.5 shadow-2xs transition-all duration-150',
        isDragging
          ? 'border-primary-900/40 shadow-xl opacity-40 ring-2 ring-primary-900/10'
          : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-md cursor-grab active:cursor-grabbing hover:-translate-y-0.5',
      )}
    >
      <LeadCardContent lead={lead} />
    </div>
  );
}
