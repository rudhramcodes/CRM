import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import Loader from '../ui/Loader';
import EmptyState from '../ui/EmptyState';

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
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredData = useMemo(() => {
    if (!searchQuery || !searchable) return data || [];
    const query = searchQuery.toLowerCase();
    return (data || []).filter((row) =>
      columns.some((col) => {
        const value = col.accessor ? row[col.accessor] : '';
        return String(value).toLowerCase().includes(query);
      }),
    );
  }, [data, searchQuery, columns, searchable]);

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

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-4 h-4 text-zinc-400" />;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-primary-900" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary-900" />
    );
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
      {searchable && (
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
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => (
                <tr
                  key={row._id || i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'hover:bg-zinc-50 transition-colors',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.accessor || col.header} className="px-4 py-3 text-sm text-zinc-700">
                      {col.cell
                        ? col.cell({ value: row[col.accessor], row })
                        : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="card-footer flex items-center justify-between px-4 py-3 border-t border-zinc-200">
          <p className="text-sm text-zinc-500">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-zinc-300 rounded-md hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-zinc-400">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      'w-8 h-8 text-sm rounded-md',
                      currentPage === p
                        ? 'bg-primary-900 text-white'
                        : 'border border-zinc-300 hover:bg-zinc-50',
                    )}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
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
