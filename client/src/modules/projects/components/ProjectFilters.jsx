import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { PROJECT_STATUS } from '../../../constants';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

export default function ProjectFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeFilters = {};
      if (filters.search) activeFilters.search = filters.search;
      if (filters.status) activeFilters.status = filters.status;
      if (filters.priority) activeFilters.priority = filters.priority;
      onFilterChange(activeFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const clearFilters = () => {
    setFilters({ search: '', status: '', priority: '' });
  };

  const hasFilters = filters.search || filters.status || filters.priority;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search projects by title..."
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white"
        />
      </div>

      <Select
        value={filters.status || 'all'}
        onValueChange={(value) =>
          setFilters((p) => ({ ...p, status: value === 'all' ? '' : value }))
        }
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {PROJECT_STATUS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) =>
          setFilters((p) => ({ ...p, priority: value === 'all' ? '' : value }))
        }
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      )}
    </div>
  );
}
