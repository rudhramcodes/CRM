import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  CalendarDays,
  ExternalLink,
  Info,
} from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

const LIFECYCLE_STAGES = [
  { id: 'planning', label: 'Planning & Discovery', desc: 'Project kickoff, requirements gathering & scope definition' },
  { id: 'active', label: 'Production / Execution', desc: 'Active development, asset creation & milestone execution' },
  { id: 'review', label: 'Review & QA', desc: 'Quality audit, internal review & stakeholder approval' },
  { id: 'completed', label: 'Project Delivered', desc: 'Final deliverables handover, launch & sign-off' },
];

export default function PortalMilestonesJourney({
  milestones = [],
  currentStatus = 'active',
  projectId,
}) {
  const user = useSelector((state) => state.auth.user);
  const isStaff = user && user.role !== 'client';

  const hasRealMilestones = milestones && milestones.length > 0;

  // Real milestones calculations
  const { completedCount, inProgressCount, progressPct } = useMemo(() => {
    if (!hasRealMilestones) return { completedCount: 0, inProgressCount: 0, progressPct: 0 };
    const completed = milestones.filter((m) => m.status === 'completed').length;
    const inProgress = milestones.filter((m) => m.status === 'in_progress').length;
    const pct = Math.round((completed / milestones.length) * 100);
    return { completedCount: completed, inProgressCount: inProgress, progressPct: pct };
  }, [milestones, hasRealMilestones]);

  // Fallback lifecycle index
  const lifecycleIndex = useMemo(() => {
    switch (currentStatus) {
      case 'planning':
        return 0;
      case 'active':
        return 1;
      case 'review':
        return 2;
      case 'completed':
        return 3;
      default:
        return 1;
    }
  }, [currentStatus]);

  if (hasRealMilestones) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-7 text-zinc-900 shadow-xs relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary-900 font-semibold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> Project Milestones
            </span>
            <h3 className="text-base sm:text-lg font-bold font-heading text-zinc-900 mt-0.5">
              Production Milestone Roadmap
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Live progress synced directly from project execution.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {completedCount} of {milestones.length} Completed ({progressPct}%)
            </span>
            {isStaff && projectId && (
              <Link
                to={`/projects/${projectId}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-900 hover:text-primary-700 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-lg transition-colors"
                title="Edit milestones in CRM"
              >
                <span>Edit in CRM</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
            <span className="font-medium">Overall Milestones Progress</span>
            <span className="font-semibold text-zinc-800">{progressPct}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-zinc-100 border border-zinc-200/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-primary-900 rounded-full"
            />
          </div>
        </div>

        {/* Milestone Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((m, idx) => {
            const isCompleted = m.status === 'completed';
            const isInProgress = m.status === 'in_progress';
            const isPending = !isCompleted && !isInProgress;

            return (
              <motion.div
                key={m._id || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : isInProgress
                    ? 'border-primary-300 bg-primary-50/50 shadow-xs ring-1 ring-primary-200'
                    : 'border-zinc-200 bg-zinc-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-[11px] text-zinc-400 font-semibold">
                      Phase 0{idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isInProgress
                          ? 'bg-primary-900 text-white shadow-xs'
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Upcoming'}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 mb-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isInProgress
                          ? 'bg-primary-900 text-white'
                          : 'bg-white text-zinc-400 border border-zinc-300'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : isInProgress ? (
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                      ) : (
                        <Circle className="w-3 h-3" />
                      )}
                    </div>
                    <h4
                      className={`text-sm font-semibold tracking-tight leading-snug ${
                        isCompleted ? 'text-zinc-900' : isInProgress ? 'text-primary-950 font-bold' : 'text-zinc-700'
                      }`}
                    >
                      {m.title}
                    </h4>
                  </div>

                  {m.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-2 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-200/50 mt-2 text-[11px] text-zinc-500 flex items-center justify-between">
                  {m.dueDate ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 text-zinc-400" /> Due {formatDate(m.dueDate)}
                    </span>
                  ) : (
                    <span className="text-zinc-400">No due date</span>
                  )}
                  {isCompleted && m.completedAt && (
                    <span className="text-emerald-700 font-medium">Done {formatDate(m.completedAt)}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback view when project has no custom milestones configured yet
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-7 text-zinc-900 shadow-xs relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-primary-900 font-semibold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" /> Project Status
          </span>
          <h3 className="text-base sm:text-lg font-bold font-heading text-zinc-900 mt-0.5">
            Project Lifecycle Pipeline
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Current stage in the overall production lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-900 border border-primary-200 capitalize">
            Stage {lifecycleIndex + 1} of 4: {LIFECYCLE_STAGES[lifecycleIndex]?.label}
          </span>
          {isStaff && projectId && (
            <Link
              to={`/projects/${projectId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-900 hover:text-primary-700 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-lg transition-colors"
              title="Add custom milestones in CRM"
            >
              <span>+ Add Milestones in CRM</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Track Line */}
      <div className="relative">
        <div className="absolute top-5 left-6 right-6 h-[2px] bg-zinc-200 hidden md:block" />
        <div
          className="absolute top-5 left-6 h-[2px] bg-primary-900 transition-all duration-500 hidden md:block"
          style={{
            width: `${(lifecycleIndex / (LIFECYCLE_STAGES.length - 1)) * 100}%`,
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCompleted = idx < lifecycleIndex;
            const isCurrent = idx === lifecycleIndex;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-primary-300 bg-primary-50/60 shadow-xs ring-1 ring-primary-200'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-zinc-200 bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-primary-900 text-white ring-4 ring-primary-100 shadow-xs'
                        : 'bg-white text-zinc-400 border border-zinc-300'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    ) : isCurrent ? (
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Circle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400 font-semibold">Stage 0{idx + 1}</span>
                </div>

                <h4
                  className={`text-sm font-semibold tracking-tight ${
                    isCurrent ? 'text-primary-950 font-bold' : isCompleted ? 'text-zinc-900' : 'text-zinc-500'
                  }`}
                >
                  {stage.label}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{stage.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Informative Note */}
      <div className="mt-5 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-start gap-2.5 text-xs text-zinc-600">
        <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-zinc-800">
            Custom Milestones:
          </p>
          <p className="text-zinc-500 mt-0.5">
            No custom production milestones have been added for this project yet.
            {isStaff ? (
              <span>
                {' '}As a staff member, you can define and update specific milestones (with target dates and checklist items) directly in the{' '}
                <Link to={`/projects/${projectId}`} className="text-primary-900 font-semibold underline">
                  CRM Project Details &rarr; Milestones tab
                </Link>.
              </span>
            ) : (
              <span> Specific production milestones with dates and deliverables will appear here as soon as scheduled by your account team.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
