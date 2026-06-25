import { PlusCircle, RefreshCw, Edit2, Trash2, CheckSquare, ClipboardList } from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

const ACTION_ICONS = {
  project_created: PlusCircle,
  status_changed: RefreshCw,
  tasks_updated: Edit2,
  task_added: CheckSquare,
  task_updated: Edit2,
  task_deleted: Trash2,
};

const ACTION_LABELS = {
  project_created: 'created this project',
  status_changed: (a) => `changed status from ${a.oldValue || '?'} to ${a.newValue || '?'}`,
  tasks_updated: 'updated tasks',
  task_added: 'added a task',
  task_updated: 'updated a task',
  task_deleted: 'removed a task',
};

export default function ProjectActivityLog({ activities = [], loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-400">
        Loading activities...
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
        <ClipboardList className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">No activities recorded yet</p>
        <p className="text-xs text-zinc-400 mt-1">Changes to this project will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="px-6 py-4 border-b border-zinc-100">
        <h3 className="text-sm font-semibold text-primary-900">Activity Log</h3>
      </div>
      <div className="px-6 py-4 space-y-1 max-h-[400px] overflow-y-auto">
        {activities.map((a) => {
          const Icon = ACTION_ICONS[a.action] || ClipboardList;
          const label = typeof ACTION_LABELS[a.action] === 'function' ? ACTION_LABELS[a.action](a) : (ACTION_LABELS[a.action] || a.action);
          return (
            <div key={a._id} className="flex items-start gap-3 py-2.5 border-b border-zinc-50 last:border-0">
              <div className="w-7 h-7 bg-zinc-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-700">
                  <span className="font-medium text-primary-900">{a.performedBy?.name || 'System'}</span> {label}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">{formatDate(a.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
