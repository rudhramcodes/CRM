import { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Trash2, AlertCircle, CheckSquare, Square } from 'lucide-react';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from '../../tasks/components/TaskPriorityBadge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { formatDate } from '../../../utils/formatters';

const SORTABLE_COLUMNS = ['title', 'status', 'priority', 'dueDate', 'createdAt'];

export default function TaskTable({
  tasks = [], loading, canEdit, canDelete,
  selectedIds = [], onSelectionChange,
  onRowClick, onEdit, onDelete, onStatusChange, onAssign,
  users = [],
}) {
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === tasks.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(tasks.map((t) => t._id));
    }
  };

  const toggleOne = (id) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    if (sortBy === 'dueDate' || sortBy === 'createdAt') {
      return (new Date(aVal) - new Date(bVal)) * dir;
    }
    return String(aVal).localeCompare(String(bVal)) * dir;
  });

  const SortIcon = ({ col }) => sortBy === col ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

  if (loading) {
    return <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center text-sm text-zinc-400">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
        <AlertCircle className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">No tasks found</p>
        <p className="text-xs text-zinc-400 mt-1">Create one to get started or adjust your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="w-10 px-3 py-3 text-left">
                <button onClick={toggleAll} className="text-zinc-400 hover:text-zinc-600">
                  {selectedIds.length === tasks.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              {['Title', 'Status', 'Priority', 'Assignee', 'Project', 'Due Date'].map((label) => {
                const key = SORTABLE_COLUMNS.find((k) => k.toLowerCase() === label.toLowerCase().replace(' ', '')) || label.toLowerCase().replace(' ', '');
                return (
                  <th key={label} className="px-3 py-3 text-left">
                    <button onClick={() => handleSort(key)} className="flex items-center gap-1 text-xs font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-700">
                      {label} <SortIcon col={key} />
                    </button>
                  </th>
                );
              })}
              {(canEdit || canDelete) && <th className="w-20 px-3 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => {
              const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
              return (
                <tr key={task._id}
                  className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                  onClick={() => onRowClick?.(task)}>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleOne(task._id)} className="text-zinc-400 hover:text-zinc-600">
                      {selectedIds.includes(task._id) ? <CheckSquare className="w-4 h-4 text-primary-900" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-medium text-zinc-700 truncate max-w-[250px]">{task.title}</p>
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {canEdit ? (
                      <Select value={task.status} onValueChange={(v) => onStatusChange?.(task._id, v)}>
                        <SelectTrigger className="h-auto px-2 py-0.5 text-xs border-0 bg-transparent hover:bg-zinc-100 [&>svg]:w-3 [&>svg]:h-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['todo', 'in_progress', 'review', 'done'].map((s) => (
                            <SelectItem key={s} value={s}><TaskStatusBadge status={s} /></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <TaskStatusBadge status={task.status} />
                    )}
                  </td>
                  <td className="px-3 py-2.5"><TaskPriorityBadge priority={task.priority} /></td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {canEdit && users.length > 0 ? (
                      <Select value={task.assignedTo?._id || ''} onValueChange={(v) => onAssign?.(task._id, v)}>
                        <SelectTrigger className="h-auto px-2 py-0.5 text-xs border-0 bg-transparent hover:bg-zinc-100 [&>svg]:w-3 [&>svg]:h-3 max-w-[120px]">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                           {(users || []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-zinc-500">{task.assignedTo?.name || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {task.project?.title && <span className="text-xs text-zinc-500">{task.project.title}</span>}
                    {!task.project?.title && <span className="text-xs text-zinc-300">—</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-zinc-500'}`}>
                    <div className="flex items-center gap-1">
                      {isOverdue && <AlertCircle className="w-3 h-3 text-red-500" />}
                      {task.dueDate ? formatDate(task.dueDate) : '—'}
                    </div>
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {canEdit && (
                          <button onClick={() => onEdit?.(task)}
                            className="p-1 rounded text-zinc-300 hover:text-primary-900 hover:bg-zinc-100" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => onDelete?.(task)}
                            className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
