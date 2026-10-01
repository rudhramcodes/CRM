import { useState, useEffect, useCallback } from 'react';
import { Search, X, FolderKanban, Flag, User, Sparkles } from 'lucide-react';
import { TASK_PRIORITY } from '../../../constants';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';
import { useGetProjectsQuery } from '../../../services/projectApi';
import { useGetUsersQuery } from '../../../services/userApi';
import { cn } from '../../../utils/cn';

export default function TaskFilters({ onFilterChange, currentUserId, initialProject = '' }) {
  const [filters, setFilters] = useState({
    search: '',
    project: initialProject || '',
    priority: '',
    assignedTo: '',
    quickTab: 'all', // 'all' | 'my' | 'overdue' | 'completed'
  });

  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });
  const { data: usersData } = useGetUsersQuery({ limit: 100 });

  const projects = projectsData?.data?.projects || projectsData?.data || [];
  const users = usersData?.data?.users || (Array.isArray(usersData?.data) ? usersData.data : []) || [];

  useEffect(() => {
    if (initialProject) {
      setFilters((prev) => ({ ...prev, project: initialProject }));
    }
  }, [initialProject]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const active = {};
      if (filters.search) active.search = filters.search;
      if (filters.project && filters.project !== 'all') active.project = filters.project;
      if (filters.priority && filters.priority !== 'all') active.priority = filters.priority;
      if (filters.assignedTo && filters.assignedTo !== 'all') active.assignedTo = filters.assignedTo;
      if (filters.quickTab === 'my' && currentUserId) active.assignedTo = currentUserId;
      if (filters.quickTab === 'overdue') {
        active.dueDateTo = new Date().toISOString();
      }
      if (filters.quickTab === 'completed') active.status = 'done';
      onFilterChange?.(active);
    }, 250);

    return () => clearTimeout(timer);
  }, [filters, onFilterChange, currentUserId]);

  const handleChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      project: '',
      priority: '',
      assignedTo: '',
      quickTab: 'all',
    });
  }, []);

  const hasFilters =
    filters.search ||
    (filters.project && filters.project !== 'all') ||
    (filters.priority && filters.priority !== 'all') ||
    (filters.assignedTo && filters.assignedTo !== 'all') ||
    filters.quickTab !== 'all';

  return (
    <div className="space-y-3">
      {/* Quick Filter Pills Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0">
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'my', label: 'Assigned to Me' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => {
          const isActive = filters.quickTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleChange('quickTab', tab.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap shadow-2xs',
                isActive
                  ? 'bg-primary-900 text-white border-primary-900 shadow-sm'
                  : 'bg-white text-zinc-600 hover:text-primary-900 hover:bg-zinc-50 border-zinc-200/80',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Search & Select Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1 sm:min-w-[220px] sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search tasks, descriptions, tags..."
            className="w-full pl-10 pr-9 py-2 bg-white border border-zinc-200/90 rounded-xl text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 transition-all shadow-2xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => handleChange('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Project Filter */}
          <div className="col-span-1 sm:w-44">
            <Select
              value={filters.project || 'all'}
              onValueChange={(val) => handleChange('project', val === 'all' ? '' : val)}
            >
              <SelectTrigger className="w-full rounded-xl border-zinc-200/90 bg-white text-xs sm:text-sm h-9 shadow-2xs font-medium">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="col-span-1 sm:w-36">
            <Select
              value={filters.priority || 'all'}
              onValueChange={(val) => handleChange('priority', val === 'all' ? '' : val)}
            >
              <SelectTrigger className="w-full rounded-xl border-zinc-200/90 bg-white text-xs sm:text-sm h-9 shadow-2xs font-medium">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                <SelectItem value="all">All Priority</SelectItem>
                {TASK_PRIORITY.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee Filter */}
          <div className="col-span-1 sm:w-40">
            <Select
              value={filters.assignedTo || 'all'}
              onValueChange={(val) => handleChange('assignedTo', val === 'all' ? '' : val)}
            >
              <SelectTrigger className="w-full rounded-xl border-zinc-200/90 bg-white text-xs sm:text-sm h-9 shadow-2xs font-medium">
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                <SelectItem value="all">All Members</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-primary-900 bg-white hover:bg-zinc-100 border border-zinc-200/80 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer h-9"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
