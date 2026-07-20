import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import DatePicker from '../../../components/forms/DatePicker';
import { TASK_STATUS, TASK_PRIORITY } from '../../../constants';

export default function TaskFilters({ onFilterChange, projects = [], users = [] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [project, setProject] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search: search || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, onFilterChange]);

  const handleChange = useCallback((key, value) => {
    const setters = { status: setStatus, priority: setPriority, assignedTo: setAssignedTo, project: setProject, dueDateFrom: setDueDateFrom, dueDateTo: setDueDateTo };
    setters[key]?.(value);
    onFilterChange({ [key]: value || undefined });
  }, [onFilterChange]);

  const clearAll = () => {
    setSearch(''); setStatus(''); setPriority(''); setAssignedTo(''); setProject(''); setDueDateFrom(''); setDueDateTo('');
    onFilterChange({});
  };

  const hasFilters = status || priority || assignedTo || project || dueDateFrom || dueDateTo;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..." 
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" />
        </div>

        <Select value={status} onValueChange={(v) => handleChange('status', v)}>
          <SelectTrigger className="w-32 h-auto py-1.5 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            {TASK_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(v) => handleChange('priority', v)}>
          <SelectTrigger className="w-32 h-auto py-1.5 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Priority</SelectItem>
            {TASK_PRIORITY.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={assignedTo} onValueChange={(v) => handleChange('assignedTo', v)}>
          <SelectTrigger className="w-36 h-auto py-1.5 text-sm"><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Assignees</SelectItem>
            {(users || []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={project} onValueChange={(v) => handleChange('project', v)}>
          <SelectTrigger className="w-36 h-auto py-1.5 text-sm"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Projects</SelectItem>
            {(projects || []).map((p) => <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>

        <DatePicker value={dueDateFrom} onChange={(v) => handleChange('dueDateFrom', v)} placeholder="From date" className="w-36" />
        <DatePicker value={dueDateTo} onChange={(v) => handleChange('dueDateTo', v)} placeholder="To date" className="w-36" />

        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 px-2 py-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
