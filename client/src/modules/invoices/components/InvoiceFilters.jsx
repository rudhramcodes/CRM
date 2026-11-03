import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { INVOICE_STATUS } from '../../../constants';
import { DatePickerSimple } from '../../../components/ui/DatePickerSimple';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

export default function InvoiceFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeFilters = {};
      if (filters.search) activeFilters.search = filters.search;
      if (filters.status) activeFilters.status = filters.status;
      if (filters.dateFrom) activeFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) activeFilters.dateTo = filters.dateTo;
      onFilterChange(activeFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const clearFilters = () => {
    setFilters({ search: '', status: '', dateFrom: '', dateTo: '' });
  };

  const hasFilters = filters.search || filters.status || filters.dateFrom || filters.dateTo;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
      {/* Left side: Search & Status filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            className="w-full pl-9 pr-9 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters((p) => ({ ...p, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Select
          
          value={filters.status || 'all'}
          onValueChange={(value) => setFilters((p) => ({ ...p, status: value === 'all' ? '' : value }))}
        >
          <SelectTrigger className="w-full sm:w-44 shrink-0 cursor-pointer">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent >
            <SelectItem value="all" className="cursor-pointer" >All Statuses</SelectItem>
            {INVOICE_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="cursor-pointer">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right side: From & To Date Pickers */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
        <DatePickerSimple
          label=""
          placeholder="From date"
          value={filters.dateFrom}
          onChange={(val) => setFilters((p) => ({ ...p, dateFrom: val }))}
          containerClassName="w-full sm:w-40"
        />

        <DatePickerSimple
          label=""
          placeholder="To date"
          value={filters.dateTo}
          onChange={(val) => setFilters((p) => ({ ...p, dateTo: val }))}
          containerClassName="w-full sm:w-40"
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
