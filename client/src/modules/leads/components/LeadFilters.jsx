import { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { LEAD_STATUS, LEAD_SOURCES } from '../../../constants';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

export default function LeadFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search: filters.search, status: filters.status, source: filters.source });
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const clearFilters = () => {
    setFilters({ search: '', status: '', source: '' });
  };

  const hasFilters = filters.search || filters.status || filters.source;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search leads by name, email, company..."
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          className="w-full pl-10 pr-9 py-2 bg-white border border-zinc-200/90 rounded-xl text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 transition-all shadow-2xs"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => setFilters((p) => ({ ...p, search: '' }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
        {/* Status Dropdown */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => setFilters((p) => ({ ...p, status: value === 'all' ? '' : value }))}
        >
          <SelectTrigger className="w-full sm:w-36 md:w-40 rounded-xl border-zinc-200/90 bg-white text-xs sm:text-sm h-9 shadow-2xs font-medium">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source Dropdown */}
        <Select
          value={filters.source || 'all'}
          onValueChange={(value) => setFilters((p) => ({ ...p, source: value === 'all' ? '' : value }))}
        >
          <SelectTrigger className="w-full sm:w-36 md:w-40 rounded-xl border-zinc-200/90 bg-white text-xs sm:text-sm h-9 shadow-2xs font-medium">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
            <SelectItem value="all">All Sources</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-primary-900 bg-white hover:bg-zinc-100 border border-zinc-200/80 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
