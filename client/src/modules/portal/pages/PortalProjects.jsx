import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderOpen, ArrowRight, Layers } from 'lucide-react';
import EmptyState from '../../../components/ui/EmptyState';
import { useGetProjectsQuery } from '../../../services/projectApi';

const STATUS_CONFIG = {
  planning: { label: 'Discovery', color: 'text-sky-700 bg-sky-50 border-sky-200' },
  active: { label: 'In Progress', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  review: { label: 'Review Stage', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  completed: { label: 'Completed', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  on_hold: { label: 'On Hold', color: 'text-zinc-600 bg-zinc-100 border-zinc-200' },
  cancelled: { label: 'Cancelled', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export default function PortalProjects() {
  const { data, isLoading, isError, error } = useGetProjectsQuery({ limit: 100 });
  const projects = data?.data?.projects || data?.projects || data?.data || [];

  const projectProgress = (project) => {
    const deliverables = project.deliverables || [];
    if (!deliverables.length) return null;
    const done = deliverables.filter((d) => d.status === 'delivered').length;
    return { done, total: deliverables.length, pct: Math.round((done / deliverables.length) * 100) };
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-48 bg-zinc-200 rounded-xl animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-zinc-100 border border-zinc-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50 text-center text-rose-700">
        <p className="font-semibold">{error?.data?.message || 'Something went wrong loading projects.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-4 h-4 text-primary-900" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-900">
            Client Production Hub
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 font-heading">
          Active Projects
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Track production progress, creative deliverables, team assignments, and collaborate in real-time.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <EmptyState
            title="No projects currently active"
            description="When work commences, your dedicated timeline and deliverables will appear here."
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project, idx) => {
            const progress = projectProgress(project);
            const statusMeta = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;

            return (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link
                  to={`/portal/projects/${project._id}`}
                  className="group flex flex-col justify-between h-full p-6 rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs transition-all duration-150 relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-900">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 group-hover:text-primary-900 transition-colors font-heading truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Code: <span className="font-mono text-zinc-700 font-medium">{project.projectCode || '—'}</span> &bull;{' '}
                      Brand: <span className="capitalize">{project.brand || 'Rudhram'}</span>
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-zinc-100 space-y-3">
                    {progress ? (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-zinc-500 font-medium">Deliverables Complete</span>
                          <span className="font-mono text-zinc-800 font-semibold">
                            {progress.done} / {progress.total} ({progress.pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-900 rounded-full transition-all duration-500"
                            style={{ width: `${progress.pct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">Briefing & scope initialization</p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-primary-900 font-medium">Open Workspace</span>
                      <span className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:bg-primary-900 group-hover:text-white transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}