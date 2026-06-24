import { FolderKanban, Edit2, Trash2 } from 'lucide-react';
import ProjectStatusBadge from './ProjectStatusBadge';
import ProjectPriorityBadge from './ProjectPriorityBadge';
import { formatDate } from '../../../utils/formatters';

const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export default function ProjectTable({
  projects = [],
  loading,
  error,
  onRowClick,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-12 text-center text-sm text-zinc-400">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-12 text-center">
          <p className="text-sm text-red-600">Failed to load projects</p>
        </div>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-12 text-center">
          <FolderKanban className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No projects found</p>
          <p className="text-xs text-zinc-400 mt-1">Create a project to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Project
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Budget
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Deadline
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {projects.map((project) => (
              <tr
                key={project._id}
                onClick={() => onRowClick?.(project)}
                className="hover:bg-zinc-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                      <FolderKanban className="w-4 h-4 text-primary-900" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary-900">{project.title}</p>
                      {project.tags?.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {project.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-4 py-3">
                  <ProjectPriorityBadge priority={project.priority} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-700">
                    {project.budget > 0
                      ? formatCurrency(project.budget, project.currency)
                      : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-700">
                    {project.deadline ? formatDate(project.deadline) : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(project);
                        }}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(project);
                        }}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
