import { useState } from 'react';
import { Plus, Trash2, Edit2, CheckSquare, Circle } from 'lucide-react';
import TaskPriorityBadge from '../../tasks/components/TaskPriorityBadge';
import Button from '../../../components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { formatDate } from '../../../utils/formatters';

export default function ProjectTasks({ tasks = [], canManage, onAdd, onUpdate, onDelete }) {
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd?.({ title: newTitle.trim(), priority: newPriority });
    setNewTitle('');
    setNewPriority('medium');
  };

  const handleToggle = (task) => {
    onUpdate?.(task._id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  if (!tasks.length && !canManage) return null;

  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary-900">Tasks ({tasks.length})</h3>
      </div>
      <div className="px-6 py-3 space-y-1">
        {tasks.length === 0
          ? <p className="text-sm text-zinc-400 text-center py-4">No tasks for this project</p>
          : [...tasks].sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0)).map((task) => (
              <div key={task._id} className="flex items-center gap-3 py-2 px-3 rounded-lg group hover:bg-zinc-50 transition-colors">
                <button onClick={() => handleToggle(task)} className="shrink-0">
                  {task.status === 'done'
                    ? <CheckSquare className="w-5 h-5 text-green-500" />
                    : <Circle className="w-5 h-5 text-zinc-300" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${task.status === 'done' ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.priority && <TaskPriorityBadge priority={task.priority} />}
                    {task.assignedTo?.name && <span className="text-xs text-zinc-400">{task.assignedTo.name}</span>}
                    {task.dueDate && <span className="text-xs text-zinc-400">Due {formatDate(task.dueDate)}</span>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <button onClick={() => { setEditingId(task._id); setEditTitle(task.title); }}
                      className="p-1 rounded text-zinc-300 hover:text-primary-900 hover:bg-zinc-100" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete?.(task._id)}
                      className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
        }
      </div>
      {canManage && (
        <div className="px-6 py-3 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a task..." onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" />
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="w-28 h-auto px-2 py-1.5 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
