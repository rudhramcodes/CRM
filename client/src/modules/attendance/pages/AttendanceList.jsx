import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { useGetAttendanceListQuery, useGetAttendanceOverviewStatsQuery } from '../../../services/attendanceApi';
import { useGetUsersQuery } from '../../../services/userApi';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import ManualEntryModal from '../components/ManualEntryModal';
import AttendanceDetailModal from '../components/AttendanceDetailModal';
import AttendanceEditModal from '../components/AttendanceEditModal';
import LocationBadge from '../../../components/ui/LocationBadge';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isValid } from 'date-fns';
import { DatePickerSimple } from '../../../components/ui/DatePickerSimple';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import {
  Search,
  ClipboardCheck,
  Pencil,
  X,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  Home,
  FileText,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
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

const formatDateStr = (date) => {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
};

export default function AttendanceList() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const initialTodayStr = formatDateStr(new Date());
  const [dateFrom, setDateFrom] = useState(initialTodayStr);
  const [dateTo, setDateTo] = useState(initialTodayStr);
  const [datePreset, setDatePreset] = useState('today');

  // Modals state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordToEdit, setRecordToEdit] = useState(null);

  const isAdmin = ['super_admin', 'admin', 'manager'].includes(user?.role);

  useEffect(() => {
    dispatch(setPageTitle('Attendance Records'));
  }, [dispatch]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Date Presets Handler
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    setPage(1);
    const today = new Date();

    if (preset === 'today') {
      const formatted = formatDateStr(today);
      setDateFrom(formatted);
      setDateTo(formatted);
    } else if (preset === 'yesterday') {
      const yesterday = subDays(today, 1);
      const formatted = formatDateStr(yesterday);
      setDateFrom(formatted);
      setDateTo(formatted);
    } else if (preset === 'this_week') {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = endOfWeek(today, { weekStartsOn: 1 });
      setDateFrom(formatDateStr(start));
      setDateTo(formatDateStr(end));
    } else if (preset === 'this_month') {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      setDateFrom(formatDateStr(start));
      setDateTo(formatDateStr(end));
    } else if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  };

  const handleCustomDateChange = (from, to) => {
    let nextTo = to;
    if (from && to && from > to) {
      nextTo = from;
    }
    setDateFrom(from);
    setDateTo(nextTo);
    setDatePreset(!from && !nextTo ? 'all' : 'custom');
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setEmployeeFilter('');
    const resetToday = formatDateStr(new Date());
    setDateFrom(resetToday);
    setDateTo(resetToday);
    setDatePreset('today');
    setPage(1);
  };

  const isDefaultDate = datePreset === 'today' && dateFrom === initialTodayStr && dateTo === initialTodayStr;
  const hasActiveFilters =
    Boolean(searchInput || search || statusFilter || employeeFilter || !isDefaultDate);

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
  const users = usersData?.data?.users || usersData?.data || [];

  const { data: overviewData } = useGetAttendanceOverviewStatsQuery();
  const dailyStats = overviewData?.data || {
    totalEmployees: 0,
    presentCount: 0,
    wfhCount: 0,
    leaveCount: 0,
    absentCount: 0,
    lateCount: 0,
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Attendance Records</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Monitor, inspect, and manage daily employee presence, work hours, and shifts
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowManualEntry(true)} className="shrink-0">
            <Pencil className="w-4 h-4 mr-1.5" />
            Manual Entry
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Error loading records: {error?.data?.message || error?.message || 'Something went wrong'}.</span>
        </div>
      )}

      {/* KPI Overview Cards (Real-time Company Daily Snapshot) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Staff Card */}
        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Total Staff</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-zinc-900">{dailyStats.totalEmployees}</span>
          </div>
          <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Employees & Managers</p>
        </div>

        {/* Present Today Card */}
        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Present Today</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900">{dailyStats.presentCount}</span>
            {dailyStats.wfhCount > 0 && (
              <span className="text-[11px] text-zinc-500 font-medium">({dailyStats.wfhCount} WFH)</span>
            )}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Attended work</p>
        </div>

        {/* Absent Today Card */}
        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Absent Today</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-zinc-900">{dailyStats.absentCount}</span>
          </div>
          <p className="text-[11px] text-rose-600 font-medium mt-0.5">Not clocked in</p>
        </div>

        {/* On Leave Today Card */}
        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">On Leave Today</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-zinc-900">{dailyStats.leaveCount}</span>
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-0.5">Approved leaves</p>
        </div>

        {/* Late Arrivals Card */}
        <div className="col-span-2 sm:col-span-1 p-4 rounded-xl border border-zinc-200 bg-white shadow-xs cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Late Arrivals</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-zinc-900">{dailyStats.lateCount}</span>
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">Past grace period</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3 shadow-xs">
        {/* Date Quick Presets */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-zinc-400 font-medium mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date:
            </span>
            {[
              { key: 'all', label: 'All Records' },
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'this_week', label: 'This Week' },
              { key: 'this_month', label: 'This Month' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePresetChange(preset.key)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  datePreset === preset.key
                    ? 'bg-primary-900 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2">
            <DatePickerSimple
              value={dateFrom}
              onChange={(val) => handleCustomDateChange(val, dateTo)}
              placeholder="From Date"
            />
            <span className="text-zinc-400 text-xs font-medium">to</span>
            <DatePickerSimple
              value={dateTo}
              onChange={(val) => handleCustomDateChange(dateFrom, val)}
              placeholder="To Date"
            />
          </div>
        </div>

        {/* Search & Select Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by employee name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(val) => {
                setStatusFilter(val === 'all' ? '' : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.keys(STATUS_BADGE).map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="capitalize">{s.replace('_', ' ')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Dropdown */}
          <div className="w-full sm:w-52">
            <Select
              value={employeeFilter || 'all'}
              onValueChange={(val) => {
                setEmployeeFilter(val === 'all' ? '' : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <TableSkeleton rows={10} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No attendance records found"
            description="Try changing the date range or status filters to view records."
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50/80 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Date & Shift
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Hours & Overtime
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Break
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records.map((rec) => {
                  const emp = rec.employee || {};
                  const isLeave = rec.status === 'leave';
                  const isAbsent = rec.status === 'absent';
                  const shift = rec.shift || {};

                  return (
                    <tr
                      key={rec._id}
                      onClick={() => setSelectedRecord(rec)}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Employee Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-900 text-white flex items-center justify-center font-semibold text-xs shrink-0 ring-1 ring-zinc-200">
                            {getInitials(emp.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-primary-900 transition-colors">
                              {emp.name || '—'}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {emp.role ? (
                                <span className="capitalize">{emp.role.replace('_', ' ')}</span>
                              ) : (
                                emp.email || '—'
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date & Shift Column */}
                      <td className="px-4 py-3.5">
                        <div className="text-sm font-medium text-zinc-800">
                          {rec.date ? format(new Date(rec.date), 'dd MMM yyyy') : '—'}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {shift.name ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-zinc-100 text-zinc-600">
                              {shift.name}
                            </span>
                          ) : (
                            'General Shift'
                          )}
                        </div>
                      </td>

                      {/* Clock In Column */}
                      <td className="px-4 py-3.5">
                        {rec.clockIn?.time ? (
                          <div>
                            <span className="text-sm font-semibold text-zinc-800">
                              {format(new Date(rec.clockIn.time), 'hh:mm a')}
                            </span>
                            {rec.isLate && (
                              <div className="mt-0.5">
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                  +{rec.lateMinutes || 0}m Late
                                </span>
                              </div>
                            )}
                            {rec.clockIn?.location?.lat != null && (
                              <div className="mt-1">
                                <LocationBadge location={rec.clockIn.location} size="sm" />
                              </div>
                            )}
                          </div>
                        ) : isLeave ? (
                          <span className="text-xs text-purple-600 font-medium italic">On Leave</span>
                        ) : isAbsent ? (
                          <span className="text-xs text-rose-500 font-medium italic">No Clock In</span>
                        ) : (
                          <span className="text-zinc-400 text-sm">—</span>
                        )}
                      </td>

                      {/* Clock Out Column */}
                      <td className="px-4 py-3.5">
                        {rec.clockOut?.time ? (
                          <div>
                            <span className="text-sm font-semibold text-zinc-800">
                              {format(new Date(rec.clockOut.time), 'hh:mm a')}
                            </span>
                            {rec.clockOut?.location?.lat != null && (
                              <div className="mt-1">
                                <LocationBadge location={rec.clockOut.location} size="sm" />
                              </div>
                            )}
                          </div>
                        ) : rec.clockIn?.time ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            In Progress
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-sm">—</span>
                        )}
                      </td>

                      {/* Hours & Overtime Column */}
                      <td className="px-4 py-3.5">
                        {rec.workHours ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-zinc-900">{rec.workHours}h</span>
                            {rec.overtime > 0 && (
                              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                +{rec.overtime}h OT
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-sm">—</span>
                        )}
                      </td>

                      {/* Break Column */}
                      <td className="px-4 py-3.5 text-sm text-zinc-600">
                        {rec.totalBreakMinutes ? `${rec.totalBreakMinutes}m` : <span className="text-zinc-400">—</span>}
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={STATUS_BADGE[rec.status] || 'default'}>
                            {rec.status?.replace('_', ' ')}
                          </Badge>
                          {rec.isWFH && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              <Home className="w-3 h-3" /> WFH
                            </span>
                          )}
                          {isLeave && rec.leave?.leaveType && (
                            <span className="text-[11px] text-purple-700 font-medium capitalize">
                              {rec.leave.leaveType} leave
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(rec)}
                            title="View Breakdown Details"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setRecordToEdit(rec)}
                              title="Edit Record"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No attendance records"
            description="No records match your active filters."
          />
        ) : (
          records.map((rec) => {
            const emp = rec.employee || {};
            const isLeave = rec.status === 'leave';

            return (
              <div
                key={rec._id}
                onClick={() => setSelectedRecord(rec)}
                className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3 cursor-pointer hover:border-zinc-300 transition-colors shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-900 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                      {getInitials(emp.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-zinc-900">{emp.name || '—'}</p>
                      <p className="text-xs text-zinc-500">
                        {rec.date ? format(new Date(rec.date), 'dd MMM yyyy') : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={STATUS_BADGE[rec.status] || 'default'}>
                      {rec.status?.replace('_', ' ')}
                    </Badge>
                    {rec.isWFH && (
                      <span className="text-[10px] text-blue-700 font-medium bg-blue-50 px-1 rounded">WFH</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-100">
                  <div>
                    <span className="text-zinc-400">In:</span>{' '}
                    <span className="font-medium text-zinc-800">
                      {rec.clockIn?.time ? format(new Date(rec.clockIn.time), 'hh:mm a') : isLeave ? 'Leave' : '—'}
                    </span>
                    {rec.isLate && <span className="text-[10px] text-amber-600 block">+{rec.lateMinutes}m Late</span>}
                  </div>
                  <div>
                    <span className="text-zinc-400">Out:</span>{' '}
                    <span className="font-medium text-zinc-800">
                      {rec.clockOut?.time ? format(new Date(rec.clockOut.time), 'hh:mm a') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Work Hours:</span>{' '}
                    <span className="font-semibold text-zinc-900">{rec.workHours ? `${rec.workHours}h` : '—'}</span>
                    {rec.overtime > 0 && <span className="text-[10px] text-emerald-600 block">+{rec.overtime}h OT</span>}
                  </div>
                  <div>
                    <span className="text-zinc-400">Break:</span>{' '}
                    <span className="font-medium text-zinc-800">
                      {rec.totalBreakMinutes ? `${rec.totalBreakMinutes}m` : '—'}
                    </span>
                  </div>
                  {rec.clockIn?.location?.lat != null && (
                    <div className="col-span-2 pt-1 border-t border-zinc-50 flex items-center gap-1.5">
                      <span className="text-zinc-400">Location:</span>
                      <LocationBadge location={rec.clockIn.location} size="sm" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(rec)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => setRecordToEdit(rec)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
          <p className="text-xs text-zinc-500">
            Showing page <span className="font-semibold text-zinc-800">{pagination.page}</span> of{' '}
            <span className="font-semibold text-zinc-800">{pagination.totalPages}</span> ({pagination.total || records.length} total records)
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ManualEntryModal open={showManualEntry} onClose={() => setShowManualEntry(false)} />

      <AttendanceDetailModal
        record={selectedRecord}
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        isAdmin={isAdmin}
        onEdit={(rec) => setRecordToEdit(rec)}
      />

      <AttendanceEditModal
        record={recordToEdit}
        open={Boolean(recordToEdit)}
        onClose={() => setRecordToEdit(null)}
      />
    </div>
  );
}
