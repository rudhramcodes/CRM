import { useState } from 'react';
import { Plus, CheckCircle2, Circle, Loader2, PlayCircle, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/forms/DatePicker';

function getStatusIcon(status) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'in_progress':
      return <PlayCircle className="w-5 h-5 text-blue-500" />;
    default:
      return <Circle className="w-5 h-5 text-zinc-300" />;
  }
}

function getNextStatus(current) {
  if (current === 'completed') return 'pending';
  return 'completed';
}

export default function ProjectMilestones({ milestones = [], onUpdate, canManage }) {
  const [updatingIndex, setUpdatingIndex] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const updated = [
      ...milestones,
      {
        title: newTitle.trim(),
        description: '',
        dueDate: newDueDate || undefined,
        status: 'pending',
      },
    ];
    onUpdate(updated);
    setNewTitle('');
    setNewDueDate('');
  };

  const handleStatusToggle = async (index) => {
    if (updatingIndex !== null) return;
    setUpdatingIndex(index);

    const milestone = milestones[index];
    const nextStatus = getNextStatus(milestone.status);
    const updated = milestones.map((m, i) => {
      if (i !== index) return m;
      return {
        ...m,
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
      };
    });

    try {
      await onUpdate(updated);
    } finally {
      setUpdatingIndex(null);
    }
  };

  const handleRemove = (index) => {
    const updated = milestones.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const completed = milestones.filter((m) => m.status === 'completed').length;
  const progress = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="px-6 py-4 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-900">
            Milestones ({completed}/{milestones.length})
          </h3>
          {milestones.length > 0 && (
            <span className="text-xs text-zinc-500">{progress}% complete</span>
          )}
        </div>
        {milestones.length > 0 && (
          <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-900 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="px-6 py-3 space-y-2">
        {milestones.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">No milestones yet</p>
        ) : (
          milestones.map((milestone, index) => {
            const isUpdating = updatingIndex === index;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors group ${
                  isUpdating ? 'opacity-60' : 'hover:bg-zinc-50'
                }`}
              >
                <button
                  onClick={() => handleStatusToggle(index)}
                  disabled={!canManage || isUpdating}
                  className="shrink-0 relative"
                  title={
                    canManage
                      ? milestone.status === 'completed'
                        ? 'Mark as pending'
                        : 'Mark as completed'
                      : milestone.status
                  }
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                  ) : (
                    getStatusIcon(milestone.status)
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      milestone.status === 'completed'
                        ? 'text-zinc-400 line-through'
                        : 'text-zinc-700'
                    }`}
                  >
                    {milestone.title}
                  </p>
                  {milestone.dueDate && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {canManage && !isUpdating && (
                  <button
                    onClick={() => handleRemove(index)}
                    className="p-1 rounded-md text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Remove milestone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {canManage && (
        <div className="px-6 py-3 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a milestone..."
              className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <DatePicker
              value={newDueDate}
              onChange={setNewDueDate}
              placeholder="Due date"
              className="w-40"
            />
            <Button type="button" size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
