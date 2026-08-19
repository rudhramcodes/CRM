import { Link } from 'react-router-dom';
import { FolderOpen, ArrowRight } from 'lucide-react';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { getStatusColor } from '../../../utils/formatters';
import { useGetProjectsQuery } from '../../../services/projectApi';
import { useGetClientMeQuery } from '../../../services/clientApi';

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  review: 'Review',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

export default function PortalProjects() {
  const { data, isLoading, isError, error } = useGetProjectsQuery({ limit: 100 });
  const { data: me } = useGetClientMeQuery();
  const projects = data?.data?.projects || data?.projects || data?.data || [];

  const projectProgress = (project) => {
    const milestones = project.milestones || [];
    if (!milestones.length) return null;
    const done = milestones.filter((m) => m.status === 'completed').length;
    return { done, total: milestones.length, pct: Math.round((done / milestones.length) * 100) };
  };

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Could not load projects"
        description={error?.data?.message || 'Something went wrong. Please try again.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-primary-900">Projects</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {me?.data?.client?.companyName ? `${me.data.client.companyName}'s projects` : 'Your projects'}
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="You don't have any projects yet"
          description="When we start work for you, your projects will appear here with milestones, tasks, and chat."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const progress = projectProgress(project);
            return (
              <Link
                key={project._id}
                to={`/portal/projects/${project._id}`}
                className="group bg-white rounded-xl border border-zinc-200 p-5 hover:border-primary-900/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-900/5 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-primary-900" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(project.status)}`}>
                    {STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-primary-900 mb-1 group-hover:text-primary-700 transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-zinc-400 mb-4">{project.client?.companyName || '—'}</p>
                {progress ? (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-500">Milestones</span>
                      <span className="text-zinc-400">{progress.done}/{progress.total} done</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-900 rounded-full transition-all"
                        style={{ width: `${progress.pct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">No milestones yet</p>
                )}
                <div className="mt-4 flex items-center gap-1 text-xs text-primary-900 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View project <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}