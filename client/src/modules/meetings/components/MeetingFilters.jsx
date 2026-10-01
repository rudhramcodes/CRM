import { useState, useCallback, useEffect } from 'react';
import { Search, Building2, X } from 'lucide-react';
import { MEETING_STATUS } from '../../../constants';
import { DatePickerSimple } from '../../../components/ui/DatePickerSimple';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';
import { useGetClientsQuery } from '../../../services/clientApi';

export default function MeetingFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    client: '',
    dateFrom: '',
    dateTo: '',
  });

  const { data: clientsData } = useGetClientsQuery({ limit: 100 });
  const clients = clientsData?.data || (Array.isArray(clientsData) ? clientsData : []) || [];

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeFilters = {};
      if (filters.search) activeFilters.search = filters.search;
      if (filters.status) activeFilters.status = filters.status;
      if (filters.client) activeFilters.client = filters.client;
      if (filters.dateFrom) activeFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) activeFilters.dateTo = filters.dateTo;
      onFilterChange?.(activeFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const handleChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', status: '', client: '', dateFrom: '', dateTo: '' });
  }, []);

  const hasFilters =
    filters.search || filters.status || filters.client || filters.dateFrom || filters.dateTo;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap">
      {/* Search Input */}
      <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          placeholder="Search meetings by title, agenda..."
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
        {/* Client Filter */}
        <div className="col-span-1 sm:w-44">
          <Select
            value={filters.client || 'all'}
            onValueChange={(value) => handleChange('client', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-full rounded-xl border-zinc-200/90 bg-white text-xs sm:text-sm h-9 shadow-2xs font-medium">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="col-span-1 sm:w-36">
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => handleChange('status', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-full rounded-xl border-zinc-200/90 bg-white text-xs sm:text-sm h-9 shadow-2xs font-medium">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
              <SelectItem value="all">All Status</SelectItem>
              {MEETING_STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="col-span-1 sm:w-36">
          <DatePickerSimple
            value={filters.dateFrom}
            onChange={(val) => handleChange('dateFrom', val)}
            placeholder="From date"
          />
        </div>

        {/* Date To */}
        <div className="col-span-1 sm:w-36">
          <DatePickerSimple
            value={filters.dateTo}
            onChange={(val) => handleChange('dateTo', val)}
            placeholder="To date"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-primary-900 bg-white hover:bg-zinc-100 border border-zinc-200/80 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer h-9"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

