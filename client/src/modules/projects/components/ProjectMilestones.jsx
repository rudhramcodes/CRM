import { useState } from 'react';
import { Plus, CheckCircle2, PlayCircle, Loader2, Calendar, Edit2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import DatePicker from '../../../components/forms/DatePicker';

function Diamond({ status, spinning }) {
  const colors = {
    completed: 'border-green-500 bg-green-500 text-white',
    in_progress: 'border-blue-500 bg-blue-500 text-white',
    pending: 'border-zinc-300 bg-white text-zinc-400',
  };
  return (
    <div className={`w-5 h-5 rotate-45 border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${colors[status] || colors.pending} ${spinning ? 'animate-spin' : ''}`}>
      <div className="-rotate-45">
        {spinning ? (
          <Loader2 className="w-3 h-3" />
        ) : status === 'completed' ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : status === 'in_progress' ? (
          <PlayCircle className="w-3 h-3" />
        ) : null}
      </div>
    </div>
  );
}

function getNextStatus(current) {
  if (current === 'pending') return 'in_progress';
  if (current === 'in_progress') return 'completed';
  return 'pending';
}

export default function ProjectMilestones({ milestones = [], onUpdate, canManage, canDelete }) {
  const [updatingIndex, setUpdatingIndex] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onUpdate([
      ...milestones,
      { title: newTitle.trim(), description: '', dueDate: newDueDate || undefined, status: 'pending' },
    ]);
    setNewTitle('');
    setNewDueDate('');
  };

  const handleToggle = async (index) => {
    if (updatingIndex !== null) return;
    setUpdatingIndex(index);
    const m = milestones[index];
    const next = getNextStatus(m.status);
    try {
      await onUpdate(milestones.map((x, i) =>
        i !== index ? x : { ...x, status: next, completedAt: next === 'completed' ? new Date().toISOString() : null }
      ));
    } finally {
      setUpdatingIndex(null);
    }
  };

  const handleRemove = (index) => onUpdate(milestones.filter((_, i) => i !== index));

  const handleStartEdit = (index) => {
    const m = milestones[index];
    setEditingIndex(index);
    setEditTitle(m.title);
    setEditDueDate(m.dueDate || '');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditTitle('');
    setEditDueDate('');
  };

  const handleSaveEdit = (index) => {
    if (!editTitle.trim()) return;
    onUpdate(milestones.map((x, i) =>
      i !== index ? x : { ...x, title: editTitle.trim(), dueDate: editDueDate || undefined }
    ));
    handleCancelEdit();
  };

  const completed = milestones.filter((m) => m.status === 'completed').length;
  const total = milestones.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="px-6 py-4 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-900">
            Milestones {total > 0 && <span className="text-zinc-400 font-normal">({completed}/{total})</span>}
          </h3>
          {total > 0 && (
            <span className="text-xs text-zinc-500">{progress}% done</span>
          )}
        </div>
        {total > 0 && (
          <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-900 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="px-6 py-4">
        {total === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">No milestones yet</p>
        ) : (
          <div className="relative">
            {/* Vertical line behind diamonds */}
            <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-zinc-200" />

            <div className="space-y-0">
              {milestones.map((m, i) => {
                const isUpdating = updatingIndex === i;
                const isLast = i === total - 1;

                return (
                  <div key={i} className={`relative flex gap-4 ${isLast ? '' : 'pb-6'}`}>
                    {/* Diamond icon column */}
                    <div className="relative z-10 flex items-start pt-1">
                      <button
                        onClick={() => handleToggle(i)}
                        disabled={!canManage || isUpdating}
                        className="relative"
                        title={canManage ? `Mark as ${getNextStatus(m.status)}` : m.status}>
                        <Diamond status={m.status} spinning={isUpdating} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 pt-0.5 group ${isUpdating ? 'opacity-50' : ''}`}>
                      {editingIndex === i ? (
                        <div className="flex flex-col gap-2">
                          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Milestone title" autoFocus
                            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(i)} />
                          <div className="flex items-center gap-2">
                            <DatePicker value={editDueDate} onChange={setEditDueDate} placeholder="Due date" className="w-40" />
                            <Button type="button" size="sm" onClick={() => handleSaveEdit(i)} disabled={!editTitle.trim()}>
                              Save
                            </Button>
                            <button onClick={handleCancelEdit} className="text-sm text-zinc-400 hover:text-zinc-700">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`text-sm font-medium ${m.status === 'completed' ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                                {m.title}
                              </p>
                              {m.dueDate && (
                                <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(m.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                            {canManage && !isUpdating && (
                              <div className="flex items-center gap-2 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => handleStartEdit(i)}
                                  className="text-[10px] uppercase tracking-wider text-zinc-300 hover:text-primary-900">
                                  Edit
                                </button>
                                {canDelete && (
                                  <button onClick={() => handleRemove(i)}
                                    className="text-[10px] uppercase tracking-wider text-zinc-300 hover:text-red-500">
                                    Remove
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Status chip */}
                          <span className={`inline-block mt-1.5 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            m.status === 'completed' ? 'text-green-700 bg-green-50' :
                            m.status === 'in_progress' ? 'text-blue-700 bg-blue-50' :
                            'text-zinc-400 bg-zinc-50'
                          }`}>
                            {m.status === 'in_progress' ? 'In Progress' : m.status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {canManage && (
        <div className="px-6 py-3 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a milestone..."
              className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <DatePicker value={newDueDate} onChange={setNewDueDate} placeholder="Due date" className="w-40" />
            <Button type="button" size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
