import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { PAYMENT_STATUS, PAYMENT_METHODS, PAYMENT_TYPES } from '../../../constants';
import { DatePickerSimple } from '../../../components/ui/DatePickerSimple';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

export default function PaymentFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentMethod: '',
    paymentType: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeFilters = {};
      if (filters.search) activeFilters.search = filters.search;
      if (filters.status) activeFilters.status = filters.status;
      if (filters.paymentMethod) activeFilters.paymentMethod = filters.paymentMethod;
      if (filters.paymentType) activeFilters.paymentType = filters.paymentType;
      if (filters.dateFrom) activeFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) activeFilters.dateTo = filters.dateTo;
      onFilterChange(activeFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const clearFilters = () => {
    setFilters({ search: '', status: '', paymentMethod: '', paymentType: '', dateFrom: '', dateTo: '' });
  };

  const hasFilters = filters.search || filters.status || filters.paymentMethod || filters.paymentType || filters.dateFrom || filters.dateTo;

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by reference..."
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white"
        />
      </div>

      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => setFilters((p) => ({ ...p, status: value === 'all' ? '' : value }))}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {PAYMENT_STATUS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.paymentMethod || 'all'}
        onValueChange={(value) => setFilters((p) => ({ ...p, paymentMethod: value === 'all' ? '' : value }))}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All Methods" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Methods</SelectItem>
          {PAYMENT_METHODS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.paymentType || 'all'}
        onValueChange={(value) => setFilters((p) => ({ ...p, paymentType: value === 'all' ? '' : value }))}
      >
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Payment Types" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Payment Types</SelectItem>
          {PAYMENT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <DatePickerSimple
        label=""
        placeholder="From date"
        value={filters.dateFrom}
        onChange={(val) => setFilters((p) => ({ ...p, dateFrom: val }))}
      />

      <DatePickerSimple
        label=""
        placeholder="To date"
        value={filters.dateTo}
        onChange={(val) => setFilters((p) => ({ ...p, dateTo: val }))}
      />

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
