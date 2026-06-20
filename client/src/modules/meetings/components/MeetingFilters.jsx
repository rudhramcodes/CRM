import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { MEETING_STATUS } from '../../../constants';

export default function MeetingFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  const handleChange = useCallback(
    (key, value) => {
      const updated = { ...filters, [key]: value };
      setFilters(updated);
      onFilterChange?.(updated);
    },
    [filters, onFilterChange],
  );

  const clearFilters = useCallback(() => {
    const cleared = { search: '', status: '', dateFrom: '', dateTo: '' };
    setFilters(cleared);
    onFilterChange?.(cleared);
  }, [onFilterChange]);

  const hasFilters = filters.search || filters.status || filters.dateFrom || filters.dateTo;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Search meetings..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900"
            />
          </div>
        </div>

        {/* Status */}
        <div className="min-w-[150px]">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white"
          >
            <option value="">All Status</option>
            {MEETING_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="min-w-[150px]">
          <label className="block text-xs font-medium text-zinc-500 mb-1">From Date</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900"
          />
        </div>

        {/* Date To */}
        <div className="min-w-[150px]">
          <label className="block text-xs font-medium text-zinc-500 mb-1">To Date</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
