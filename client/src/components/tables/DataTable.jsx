import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import Loader from '../ui/Loader';
import EmptyState from '../ui/EmptyState';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';

const PAGE_SIZES = [10, 20, 50];

export default function DataTable({
  columns,
  data,
  loading,
  error,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyTitle = 'No data found',
  emptyDescription = 'No records to display.',
  onRowClick,
  pageSize = 10,
  serverPagination = false,
  page = 1,
  total,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onPageSizeChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange = () => {},
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const selectAllRef = useRef(null);

  // Disable internal search in server mode — server handles it via external filters
  const showSearch = searchable && !serverPagination;

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredData = useMemo(() => {
    if (!searchQuery || !showSearch) return data || [];
    const query = searchQuery.toLowerCase();
    return (data || []).filter((row) =>
      columns.some((col) => {
        const value = col.accessor ? row[col.accessor] : '';
        return String(value).toLowerCase().includes(query);
      }),
    );
  }, [data, searchQuery, columns, showSearch]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Server mode: data is already paginated server-side
  // Client mode: slice locally
  const displayData = serverPagination
    ? sortedData
    : sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Pagination values
  const effPage = serverPagination ? page : currentPage;
  const effPageSize = serverPagination ? (pageSize || 10) : pageSize;
  const effTotalPages = serverPagination ? (totalPages || 1) : Math.ceil(sortedData.length / effPageSize);
  const effTotal = serverPagination ? (total || sortedData.length) : sortedData.length;

  const handlePageChange = (p) => {
    if (serverPagination) {
      onPageChange?.(p);
    } else {
      setCurrentPage(p);
    }
  };

  const handlePageSizeChange = (size) => {
    const numSize = Number(size);
    if (serverPagination) {
      onPageSizeChange?.(numSize);
    } else {
      // In client mode, reset to page 1 when changing size
      setCurrentPage(1);
      // Pass up if caller wants to track it
      onPageSizeChange?.(numSize);
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-4 h-4 text-zinc-400" />;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-primary-900" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary-900" />
    );
  };

  const displayedIds = useMemo(() => displayData.map((row) => row._id).filter(Boolean), [displayData]);
  const allDisplayedSelected = displayedIds.length > 0 && displayedIds.every((id) => selectedIds.includes(id));
  const someDisplayedSelected = displayedIds.some((id) => selectedIds.includes(id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someDisplayedSelected && !allDisplayedSelected;
    }
  }, [someDisplayedSelected, allDisplayedSelected]);

  const handleSelectAll = () => {
    if (allDisplayedSelected) {
      onSelectionChange(selectedIds.filter((id) => !displayedIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...displayedIds])]);
    }
  };

  const handleSelectRow = (row) => {
    if (selectedIds.includes(row._id)) {
      onSelectionChange(selectedIds.filter((id) => id !== row._id));
    } else {
      onSelectionChange([...selectedIds, row._id]);
    }
  };

  if (loading) {
    return (
      <div className="card p-12">
        <Loader size="lg" text="Loading data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-12">
        <EmptyState
          title="Error loading data"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="card">
      {showSearch && (
        <div className="card-header">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 bg-zinc-50"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allDisplayedSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-zinc-300 text-primary-900 focus:ring-primary-900 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.accessor || col.header}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider',
                    col.sortable !== false && 'cursor-pointer select-none',
                  )}
                  onClick={() => col.sortable !== false && handleSort(col.accessor)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && getSortIcon(col.accessor)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              displayData.map((row, i) => (
                <tr
                  key={row._id || i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'hover:bg-zinc-50 transition-colors',
                    onRowClick && 'cursor-pointer',
                    selectable && selectedIds.includes(row._id) && 'bg-primary-50/50 hover:bg-primary-50/70',
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.name || row._id}`}
                        checked={selectedIds.includes(row._id)}
                        onChange={() => handleSelectRow(row)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-zinc-300 text-primary-900 focus:ring-primary-900 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.accessor || col.header} className="px-4 py-3 text-sm text-zinc-700">
                      {col.cell
                        ? col.cell({ getValue: () => row[col.accessor], value: row[col.accessor], row })
                        : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(effTotalPages > 1 || onPageSizeChange || serverPagination) && (
        <div className="card-footer flex items-center justify-between px-4 py-3 border-t border-zinc-200">
          <div className="flex items-center gap-3">
            <p className="text-sm text-zinc-500">
              {effTotal === 0
                ? 'No results'
                : `Showing ${(effPage - 1) * effPageSize + 1} to ${Math.min(effPage * effPageSize, effTotal)} of ${effTotal}`}
            </p>
            {(serverPagination || onPageSizeChange) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">per page:</span>
                <Select
                  value={String(effPageSize)}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="w-16 h-7 text-xs px-2 py-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(effPage - 1)}
              disabled={serverPagination ? !hasPrevPage : effPage === 1}
              className="px-3 py-1 text-sm border border-zinc-300 rounded-md hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: effTotalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === effTotalPages || Math.abs(p - effPage) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-zinc-400">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(p)}
                    className={cn(
                      'w-8 h-8 text-sm rounded-md',
                      effPage === p
                        ? 'bg-primary-900 text-white'
                        : 'border border-zinc-300 hover:bg-zinc-50',
                    )}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => handlePageChange(effPage + 1)}
              disabled={serverPagination ? !hasNextPage : effPage === effTotalPages}
              className="px-3 py-1 text-sm border border-zinc-300 rounded-md hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
