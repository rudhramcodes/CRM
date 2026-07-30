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

const STATUS_COLORS = {
  new: { dot: 'bg-sky-500', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700' },
  contacted: { dot: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  meeting_scheduled: { dot: 'bg-violet-500', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
  proposal_sent: { dot: 'bg-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  won: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  lost: { dot: 'bg-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
};

function KanbanColumn({ status, label, color, leads, onLeadClick }) {
  const droppableId = COLUMN_ID_PREFIX + status;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const leadIds = useMemo(() => leads.map((l) => l._id), [leads]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col bg-zinc-50/50 rounded-xl border min-w-[280px] w-[280px] transition-colors',
        isOver ? 'border-primary-900/30 bg-primary-50/30' : 'border-zinc-200',
      )}
    >
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full', color.dot)} />
          <span className="text-sm font-semibold text-zinc-700">{label}</span>
        </div>
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          color.bg, color.text,
        )}>
          {leads.length}
        </span>
      </div>

      <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
        <div className={cn(
          'flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-[100px] transition-colors',
          leads.length === 0 && 'flex items-center justify-center',
        )}>
          {leads.length === 0 ? (
            <div className={cn(
              'flex flex-col items-center justify-center w-full py-8 rounded-lg border-2 border-dashed transition-colors',
              isOver ? 'border-primary-900/40 bg-primary-50/50' : 'border-zinc-200',
            )}>
              <span className={cn(
                'text-xs font-medium',
                isOver ? 'text-primary-600' : 'text-zinc-300',
              )}>
                {isOver ? 'Drop here' : 'No leads'}
              </span>
            </div>
          ) : (
            leads.map((lead) => (
              <div key={lead._id} onClick={() => onLeadClick?.(lead)}>
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
      <div className="flex items-center justify-center h-full min-h-[400px] text-sm text-zinc-400">
        Loading board...
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-sm text-zinc-400">
        No leads to display. Create some leads to see them on the board.
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
      <div className="flex gap-3 overflow-x-auto pb-3 min-h-[400px] h-full">
        {LEAD_STATUS.map(({ value, label }) => (
          <KanbanColumn
            key={value}
            status={value}
            label={label}
            color={STATUS_COLORS[value]}
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
