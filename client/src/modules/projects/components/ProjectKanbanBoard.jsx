import { useState, useMemo, useCallback } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PROJECT_STAGES } from '../../../constants';
import ProjectKanbanCard, { ProjectKanbanCardOverlay } from './ProjectKanbanCard';
import { cn } from '../../../utils/cn';
import Skeleton from '../../../components/ui/Skeleton';

const COL_ID = 'kanban-col-';
const LEGACY_STAGE = { planning: 'planning', active: 'execution', review: 'review', completed: 'delivered' };

function KanbanColumn({ stage, label, color, projects, onProjectClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: COL_ID + stage });
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
                <div key={p._id} onClick={() => onProjectClick?.(p)}><ProjectKanbanCard project={p} disabled={!p.stage} /></div>
              ))
          }
        </div>
      </SortableContext>
    </div>
  );
}

export default function ProjectKanbanBoard({ projects = [], loading, onProjectClick, onStageChange }) {
  const [active, setActive] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = useMemo(() => {
    const g = {};
    PROJECT_STAGES.forEach((s) => { g[s.value] = []; });
    projects.forEach((p) => {
      const stage = p.stage || LEGACY_STAGE[p.status] || 'brief';
      (g[stage] || g.brief).push(p);
    });
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
      if (p?.stage && p.stage !== target) onStageChange?.(p, target);
    }
  }, [columns, onStageChange]);

  if (loading) return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-zinc-200 w-72 shrink-0 p-4 space-y-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="bg-zinc-50 rounded-lg p-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
  if (!projects.length) return <div className="flex items-center justify-center h-64 text-sm text-zinc-400">No projects to display.</div>;

  const colors = { brief: 'bg-zinc-400', planning: 'bg-purple-500', execution: 'bg-green-500', review: 'bg-yellow-500', delivered: 'bg-blue-500' };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {PROJECT_STAGES.map(({ value, label }) => (
          <KanbanColumn key={value} stage={value} label={label} color={colors[value]}
            projects={columns[value] || []} onProjectClick={onProjectClick} />
        ))}
      </div>
      <DragOverlay>
        {active ? <div className="rotate-2 opacity-90"><ProjectKanbanCardOverlay project={active} /></div> : null}
      </DragOverlay>
    </DndContext>
  );
}
