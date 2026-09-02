import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { useGetAttendanceListQuery } from '../../../services/attendanceApi';
import { useGetUsersQuery } from '../../../services/userApi';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import ManualEntryModal from '../components/ManualEntryModal';
import { format } from 'date-fns';
import { DatePickerSimple } from '../../../components/ui/DatePickerSimple';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { Search, ClipboardCheck, Pencil, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

const STATUS_BADGE = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  half_day: 'warning',
  leave: 'info',
  holiday: 'info',
  weekend: 'default',
  wfh: 'primary',
};

export default function AttendanceList() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const hasActiveFilters = searchInput || search || statusFilter || employeeFilter || dateFrom || dateTo;

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setEmployeeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  useEffect(() => {
    dispatch(setPageTitle('Attendance Records'));
  }, [dispatch]);

  const queryParams = {
    page,
    limit: 20,
    ...(search && { search }),
    ...(statusFilter && { status: statusFilter }),
    ...(employeeFilter && { employee: employeeFilter }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data, isLoading, error } = useGetAttendanceListQuery(queryParams);
  const { data: usersData } = useGetUsersQuery({ limit: 100 });

  const records = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination || {};
  const users = usersData?.data?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Attendance Records</h2>
          <p className="text-sm text-zinc-500 mt-1">View and manage all employee attendance records</p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => setShowManualEntry(true)}>
            <Pencil className="w-4 h-4" />
            Manual Entry
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          Error loading records: {error?.data?.message || error?.message || 'Something went wrong'}. Try again.
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white"
            />
          </div>
          <div className="w-full sm:w-40">
            <Select value={statusFilter || 'all'} onValueChange={(val) => { setStatusFilter(val === 'all' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.keys(STATUS_BADGE).map((s) => (
                  <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <Select value={employeeFilter || 'all'} onValueChange={(val) => { setEmployeeFilter(val === 'all' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All Employees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DatePickerSimple value={dateFrom} onChange={(val) => { setDateFrom(val); setPage(1); }} placeholder="From" />
            <DatePickerSimple value={dateTo} onChange={(val) => { setDateTo(val); setPage(1); }} placeholder="To" />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={10} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No attendance records"
            description="No records match your current filters."
          />
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Clock In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Clock Out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Hours</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Break</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {records.map((rec) => (
                <tr key={rec._id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">{rec.employee?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{rec.date ? format(new Date(rec.date), 'dd MMM yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{rec.clockIn?.time ? format(new Date(rec.clockIn.time), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{rec.clockOut?.time ? format(new Date(rec.clockOut.time), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{rec.workHours ? `${rec.workHours}h` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{rec.totalBreakMinutes ? `${rec.totalBreakMinutes}m` : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[rec.status] || 'default'}>
                      {rec.status?.replace('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No attendance records"
            description="No records match your current filters."
          />
        ) : (
          records.map((rec) => (
            <div key={rec._id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-zinc-900">{rec.employee?.name || '—'}</p>
                <Badge variant={STATUS_BADGE[rec.status] || 'default'}>
                  {rec.status?.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-zinc-500 mb-2">{rec.date ? format(new Date(rec.date), 'dd MMM yyyy') : '—'}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-zinc-400">In:</span>{' '}
                  <span className="text-zinc-700">{rec.clockIn?.time ? format(new Date(rec.clockIn.time), 'hh:mm a') : '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Out:</span>{' '}
                  <span className="text-zinc-700">{rec.clockOut?.time ? format(new Date(rec.clockOut.time), 'hh:mm a') : '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Hours:</span>{' '}
                  <span className="text-zinc-700">{rec.workHours ? `${rec.workHours}h` : '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Break:</span>{' '}
                  <span className="text-zinc-700">{rec.totalBreakMinutes ? `${rec.totalBreakMinutes}m` : '—'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>
          <span className="text-sm text-zinc-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      )}

      <ManualEntryModal open={showManualEntry} onClose={() => setShowManualEntry(false)} />
    </div>
  );
}
