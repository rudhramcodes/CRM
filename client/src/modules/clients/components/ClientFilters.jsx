import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

export default function ClientFilters({ onFilterChange, isSuperAdmin = false }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search, status });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status, onFilterChange]);

  const clearFilters = () => {
    setSearch('');
    setStatus('active');
  };

  const isFiltered = search || (isSuperAdmin && status !== 'active');

  return (
    <div className="flex items-center gap-2 sm:gap-3 w-full">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search clients by company, contact, email, GST..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-9 py-2 bg-white border border-zinc-200/90 rounded-xl text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 transition-all shadow-2xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status Filter Dropdown (Super Admin only) */}
      {isSuperAdmin && (
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32 cursor-pointer sm:w-36 h-9.5 rounded-xl text-xs sm:text-sm border-zinc-200/90 bg-white shadow-2xs focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 font-medium">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Clear Filters Button */}
      {isFiltered && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-primary-900 bg-white hover:bg-zinc-100 border border-zinc-200/80 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      )}
    </div>
  );
}
