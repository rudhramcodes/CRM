import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LEAD_STATUS } from '../../../constants';
import LeadKanbanCard from './LeadKanbanCard';
import { cn } from '../../../utils/cn';

const COLUMN_ID_PREFIX = 'kanban-col-';

function KanbanColumn({ status, label, color, leads, onLeadClick }) {
  const droppableId = COLUMN_ID_PREFIX + status;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const leadIds = useMemo(() => leads.map((l) => l._id), [leads]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col bg-zinc-50/50 rounded-xl border min-w-[260px] w-[260px] max-h-full',
        isOver ? 'border-primary-900/30 bg-primary-50/30' : 'border-zinc-200',
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', color)} />
          <span className="text-sm font-semibold text-zinc-700">{label}</span>
        </div>
        <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-[120px]">
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-zinc-300 italic">
              Drop leads here
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

  // Group leads by status
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

      // Check if dropped on a column
      if (typeof over.id === 'string' && over.id.startsWith(COLUMN_ID_PREFIX)) {
        targetStatus = over.id.replace(COLUMN_ID_PREFIX, '');
      }

      // Check if dropped on another card — find its column
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
      <div className="flex items-center justify-center h-64 text-sm text-zinc-400">
        Loading board...
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-zinc-400">
        No leads to display. Create some leads to see them on the board.
      </div>
    );
  }

  const statusColors = {
    new: 'bg-blue-500',
    contacted: 'bg-yellow-500',
    meeting_scheduled: 'bg-purple-500',
    proposal_sent: 'bg-indigo-500',
    won: 'bg-green-500',
    lost: 'bg-red-500',
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {LEAD_STATUS.map(({ value, label }) => (
          <KanbanColumn
            key={value}
            status={value}
            label={label}
            color={statusColors[value]}
            leads={columns[value] || []}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-2 opacity-90">
            <LeadKanbanCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
