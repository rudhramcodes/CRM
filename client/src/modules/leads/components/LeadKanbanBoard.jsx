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
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LEAD_STATUS } from '../../../constants';
import LeadKanbanCard, { LeadKanbanCardOverlay } from './LeadKanbanCard';
import { cn } from '../../../utils/cn';

const COLUMN_ID_PREFIX = 'kanban-col-';

const STATUS_CONFIGS = {
  new: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 border-sky-200/80',
    headerBg: 'bg-sky-50/30',
  },
  contacted: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
    headerBg: 'bg-amber-50/30',
  },
  meeting_scheduled: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border-violet-200/80',
    headerBg: 'bg-violet-50/30',
  },
  proposal_sent: {
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    headerBg: 'bg-indigo-50/30',
  },
  won: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    headerBg: 'bg-emerald-50/30',
  },
  lost: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    headerBg: 'bg-rose-50/30',
  },
};

function KanbanColumn({ status, label, leads, onLeadClick }) {
  const droppableId = COLUMN_ID_PREFIX + status;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const cfg = STATUS_CONFIGS[status] || STATUS_CONFIGS.new;

  const leadIds = useMemo(() => leads.map((l) => l._id), [leads]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col bg-zinc-50/80 rounded-2xl border min-w-[285px] w-[285px] transition-all duration-200 shrink-0 shadow-2xs',
        isOver
          ? 'border-primary-900/40 bg-zinc-100/90 shadow-md ring-2 ring-primary-900/10'
          : 'border-zinc-200/80',
      )}
    >
      {/* Column Header */}
      <div className={cn('flex items-center justify-between px-3.5 py-3 border-b border-zinc-200/70 rounded-t-2xl', cfg.headerBg)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
          <span className="text-xs sm:text-sm font-semibold text-primary-900 tracking-tight">{label}</span>
        </div>
        <span
          className={cn(
            'text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs',
            cfg.badge,
          )}
        >
          {leads.length}
        </span>
      </div>

      {/* Cards Scrollable Stream */}
      <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
        <div
          className={cn(
            'flex flex-col gap-2.5 p-2.5 overflow-y-auto flex-1 min-h-[160px] max-h-[calc(100vh-320px)] transition-colors',
            leads.length === 0 && 'flex items-center justify-center',
          )}
        >
          {leads.length === 0 ? (
            <div
              className={cn(
                'flex flex-col items-center justify-center w-full py-10 px-4 rounded-xl border-2 border-dashed transition-all',
                isOver ? 'border-primary-900/40 bg-white/80' : 'border-zinc-200/80 bg-white/40',
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium',
                  isOver ? 'text-primary-900 font-semibold' : 'text-zinc-400',
                )}
              >
                {isOver ? 'Drop lead here' : 'No leads in stage'}
              </span>
            </div>
          ) : (
            leads.map((lead) => (
              <div key={lead._id} onClick={() => onLeadClick?.(lead)} className="cursor-pointer">
                <LeadKanbanCard lead={lead} />
              </div>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function LeadKanbanBoard({ leads = [], loading, onLeadClick, onStatusChange }) {
  const [activeLead, setActiveLead] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const columns = useMemo(() => {
    const grouped = {};
    LEAD_STATUS.forEach((s) => {
      grouped[s.value] = [];
    });
    leads.forEach((lead) => {
      const status = lead.status || 'new';
      if (grouped[status]) {
        grouped[status].push(lead);
      } else {
        grouped[status] = [lead];
      }
    });
    return grouped;
  }, [leads]);

  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const lead = active.data.current?.lead;
    if (lead) setActiveLead(lead);
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveLead(null);

      if (!over) return;

      const leadId = active.id;
      let targetStatus = null;

      if (typeof over.id === 'string' && over.id.startsWith(COLUMN_ID_PREFIX)) {
        targetStatus = over.id.replace(COLUMN_ID_PREFIX, '');
      }

      if (!targetStatus) {
        for (const [status, statusLeads] of Object.entries(columns)) {
          if (statusLeads.some((l) => l._id === over.id)) {
            targetStatus = status;
            break;
          }
        }
      }

      if (targetStatus) {
        const lead = active.data.current?.lead;
        if (lead && lead.status !== targetStatus) {
          onStatusChange?.(lead._id, targetStatus);
        }
      }
    },
    [columns, onStatusChange],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-sm font-medium text-zinc-400 bg-white rounded-2xl border border-zinc-200/80 p-8">
        Loading sales pipeline board...
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-sm text-zinc-500 bg-white rounded-2xl border border-zinc-200/80 p-8 text-center">
        <p className="font-semibold text-primary-900 text-base mb-1">No leads to display</p>
        <p className="text-xs text-zinc-400 max-w-sm">
          Create some leads or adjust your venture / search filters to view your active pipeline stages.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 min-h-[450px] scrollbar-thin">
        {LEAD_STATUS.map(({ value, label }) => (
          <KanbanColumn
            key={value}
            status={value}
            label={label}
            leads={columns[value] || []}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? <LeadKanbanCardOverlay lead={activeLead} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
