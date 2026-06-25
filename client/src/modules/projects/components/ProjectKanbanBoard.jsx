import { useState, useMemo, useCallback } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PROJECT_STATUS } from '../../../constants';
import ProjectKanbanCard from './ProjectKanbanCard';
import { cn } from '../../../utils/cn';

const COL_ID = 'kanban-col-';

function KanbanColumn({ status, label, color, projects, onProjectClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: COL_ID + status });
  const ids = useMemo(() => projects.map((p) => p._id), [projects]);

  return (
    <div ref={setNodeRef}
      className={cn('flex flex-col bg-zinc-50/50 rounded-xl border min-w-[260px] w-[260px] max-h-full',
        isOver ? 'border-primary-900/30 bg-primary-50/30' : 'border-zinc-200')}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', color)} />
          <span className="text-sm font-semibold text-zinc-700">{label}</span>
        </div>
        <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">{projects.length}</span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-[120px]">
          {projects.length === 0
            ? <div className="flex items-center justify-center h-20 text-xs text-zinc-300 italic">Drop projects here</div>
            : projects.map((p) => (
                <div key={p._id} onClick={() => onProjectClick?.(p)}><ProjectKanbanCard project={p} /></div>
              ))
          }
        </div>
      </SortableContext>
    </div>
  );
}

export default function ProjectKanbanBoard({ projects = [], loading, onProjectClick, onStatusChange }) {
  const [active, setActive] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = useMemo(() => {
    const g = {};
    PROJECT_STATUS.forEach((s) => { g[s.value] = []; });
    projects.forEach((p) => { const s = p.status || 'planning'; if (g[s]) g[s].push(p); else g[s] = [p]; });
    return g;
  }, [projects]);

  const handleDragStart = useCallback((e) => {
    const p = e.active.data.current?.project;
    if (p) setActive(p);
  }, []);

  const handleDragEnd = useCallback((e) => {
    const { active, over } = e;
    setActive(null);
    if (!over) return;
    let target = null;
    if (typeof over.id === 'string' && over.id.startsWith(COL_ID)) target = over.id.replace(COL_ID, '');
    if (!target) {
      for (const [s, ps] of Object.entries(columns)) { if (ps.some((p) => p._id === over.id)) { target = s; break; } }
    }
    if (target) {
      const p = active.data.current?.project;
      if (p && p.status !== target) onStatusChange?.(p._id, target);
    }
  }, [columns, onStatusChange]);

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-zinc-400">Loading board...</div>;
  if (!projects.length) return <div className="flex items-center justify-center h-64 text-sm text-zinc-400">No projects to display.</div>;

  const colors = { planning: 'bg-purple-500', active: 'bg-green-500', review: 'bg-yellow-500', completed: 'bg-blue-500' };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {PROJECT_STATUS.map(({ value, label }) => (
          <KanbanColumn key={value} status={value} label={label} color={colors[value]}
            projects={columns[value] || []} onProjectClick={onProjectClick} />
        ))}
      </div>
      <DragOverlay>
        {active ? <div className="rotate-2 opacity-90"><ProjectKanbanCard project={active} /></div> : null}
      </DragOverlay>
    </DndContext>
  );
}
