import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { CLIENT_STATUS } from '../../../constants';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

export default function ClientFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeFilters = {};
      if (filters.search) activeFilters.search = filters.search;
      if (filters.status) activeFilters.status = filters.status;
      onFilterChange(activeFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const clearFilters = () => {
    setFilters({ search: '', status: '' });
  };

  const hasFilters = filters.search || filters.status;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search clients by company, contact, email..."
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white"
        />
      </div>

      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => setFilters((p) => ({ ...p, status: value === 'all' ? '' : value }))}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {CLIENT_STATUS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
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
