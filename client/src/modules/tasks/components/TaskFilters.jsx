import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { TASK_STATUS, TASK_PRIORITY } from '../../../constants';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';

export default function TaskFilters({ onFilterChange, projects = [], users = [] }) {
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', assignedTo: '', project: '' });

  useEffect(() => {
    const timer = setTimeout(() => onFilterChange(filters), 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const clear = () => setFilters({ search: '', status: '', priority: '', assignedTo: '', project: '' });
  const hasFilters = Object.values(filters).some(Boolean);
  const set = (key, value) => setFilters((p) => ({ ...p, [key]: value }));

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="text" placeholder="Search tasks..." value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white" />
      </div>

      <Select value={filters.status || 'all'} onValueChange={(v) => set('status', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {TASK_STATUS.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.priority || 'all'} onValueChange={(v) => set('priority', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {TASK_PRIORITY.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.assignedTo || 'all'} onValueChange={(v) => set('assignedTo', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Assignee" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          {users.map((u) => (
            <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.project || 'all'} onValueChange={(v) => set('project', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Project" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <button onClick={clear} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 shrink-0">
          <X className="w-4 h-4" /> Clear
        </button>
      )}
    </div>
  );
}
