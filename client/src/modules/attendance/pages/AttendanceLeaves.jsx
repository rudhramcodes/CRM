import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  useGetLeavesQuery,
  useApplyLeaveMutation,
  useApproveLeaveMutation,
  useRejectLeaveMutation,
  useGetLeaveBalanceQuery,
} from '../../../services/attendanceApi';
import { useGetUsersQuery } from '../../../services/userApi';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import Modal from '../../../components/ui/Modal';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { DatePickerSimple } from '../../../components/ui/DatePickerSimple';
import Textarea from '../../../components/ui/Textarea';
import { format, differenceInCalendarDays, isValid } from 'date-fns';
import {
  Plus,
  Check,
  X,
  Calendar,
  AlertCircle,
  Info,
  CalendarDays,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Filter,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const LEAVE_TYPE_OPTIONS = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'comp_off', label: 'Comp Off' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other Leave' },
];

const STATUS_BADGE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const BALANCE_KEYS = ['casual', 'sick', 'earned', 'comp_off'];

export default function AttendanceLeaves() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'admin', 'manager'].includes(user?.role);

  // Active view tab for admins/managers: 'pending' | 'all' | 'my'
  const [activeTab, setActiveTab] = useState(isAdmin ? 'pending' : 'my');
  const [page, setPage] = useState(1);

  // Filter States
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingLeave, setRejectingLeave] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Apply Form State
  const [form, setForm] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    dispatch(setPageTitle('Leave Management'));
  }, [dispatch]);

  // Determine query parameters based on tab and filters
  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: 10,
    };

    if (search) params.search = search;
    if (leaveTypeFilter && leaveTypeFilter !== 'all') params.leaveType = leaveTypeFilter;
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;

    if (isAdmin) {
      if (activeTab === 'pending') {
        params.status = 'pending';
      } else if (activeTab === 'my') {
        params.employee = user?._id;
        if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      } else {
        // 'all' tab
        if (employeeFilter && employeeFilter !== 'all') params.employee = employeeFilter;
        if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      }
    } else {
      // Normal employee
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
    }

    return params;
  }, [page, search, leaveTypeFilter, dateFrom, dateTo, isAdmin, activeTab, statusFilter, employeeFilter, user?._id]);

  const { data: leavesData, isLoading, error: leavesError } = useGetLeavesQuery(queryParams);
  const { data: balanceData } = useGetLeaveBalanceQuery(user?._id, { skip: !user?._id });
  const { data: usersData } = useGetUsersQuery({ limit: 100 }, { skip: !isAdmin });

  const [applyLeave, { isLoading: applying }] = useApplyLeaveMutation();
  const [approveLeave, { isLoading: approving }] = useApproveLeaveMutation();
  const [rejectLeave, { isLoading: rejecting }] = useRejectLeaveMutation();

  const leaves = Array.isArray(leavesData?.data)
    ? leavesData.data
    : Array.isArray(leavesData?.data?.leaves)
      ? leavesData.data.leaves
      : Array.isArray(leavesData?.leaves)
        ? leavesData.leaves
        : [];
  const pagination = leavesData?.pagination || leavesData?.data?.pagination || {};
  const pendingCount = pagination?.pendingCount ?? (Array.isArray(leaves) ? leaves.filter((l) => l.status === 'pending').length : 0);
  const balance = balanceData?.data?.balance || balanceData?.data || balanceData?.balance || {};
  const users = Array.isArray(usersData?.data?.users)
    ? usersData.data.users
    : Array.isArray(usersData?.data)
      ? usersData.data
      : Array.isArray(usersData?.users)
        ? usersData.users
        : [];

  const hasActiveFilters =
    Boolean(searchInput ||
    (statusFilter && statusFilter !== 'all') ||
    (leaveTypeFilter && leaveTypeFilter !== 'all') ||
    (employeeFilter && employeeFilter !== 'all') ||
    dateFrom ||
    dateTo);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setLeaveTypeFilter('');
    setEmployeeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // Calculate duration in days between start and end date for apply modal
  const leaveDuration = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (!isValid(start) || !isValid(end)) return 0;
    const diff = differenceInCalendarDays(end, start);
    return diff >= 0 ? diff + 1 : -1;
  }, [form.startDate, form.endDate]);

  const currentTypeBalance = balance[form.leaveType]?.balance;

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'startDate' && value && prev.endDate) {
        if (new Date(value) > new Date(prev.endDate)) {
          updated.endDate = value;
        }
      }
      return updated;
    });

    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverError) setServerError('');
  };

  const validateForm = () => {
    const errors = {};
    if (!form.leaveType) errors.leaveType = 'Please select a leave type';
    if (!form.startDate) errors.startDate = 'Start date is required';
    if (!form.endDate) {
      errors.endDate = 'End date is required';
    } else if (form.startDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (isValid(start) && isValid(end) && end < start) {
        errors.endDate = 'End date must be on or after start date';
      }
    }
    if (!form.reason || !form.reason.trim()) {
      errors.reason = 'Please enter a reason for your leave request';
    } else if (form.reason.trim().length < 10) {
      errors.reason = 'Reason must be at least 10 characters long';
    } else if (form.reason.trim().length > 1000) {
      errors.reason = 'Reason cannot exceed 1000 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    try {
      await applyLeave(form).unwrap();
      toast.success('Leave application submitted successfully');
      setShowForm(false);
      setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
      setFormErrors({});
      setServerError('');
    } catch (err) {
      const errMsg = err?.data?.message || err?.message || 'Failed to submit leave request';
      setServerError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleOpenForm = () => {
    setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
    setFormErrors({});
    setServerError('');
    setShowForm(true);
  };

  const handleApprove = async (id) => {
    try {
      await approveLeave({ id, comment: 'Approved' }).unwrap();
      toast.success('Leave request approved');
      if (viewingLeave?._id === id) setViewingLeave(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to approve leave request');
    }
  };

  const handleOpenReject = (leave) => {
    setRejectingLeave(leave);
    setRejectComment('');
    setRejectError('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectComment.trim()) {
      setRejectError('Please provide a reason for rejection');
      return;
    }
    try {
      await rejectLeave({ id: rejectingLeave._id, comment: rejectComment.trim() }).unwrap();
      toast.success('Leave request rejected');
      setRejectModalOpen(false);
      setRejectingLeave(null);
      setRejectComment('');
      setRejectError('');
      if (viewingLeave?._id === rejectingLeave._id) setViewingLeave(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reject leave request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-primary-900">Leave Management</h2>
            {isAdmin && pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                {pendingCount} Pending Approval{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {isAdmin
              ? 'Review employee leave applications, approve requests, and monitor leave balances'
              : 'Apply for leave and track your requests and remaining balances'}
          </p>
        </div>
        <Button onClick={handleOpenForm}>
          <Plus className="w-4 h-4" />
          Apply Leave
        </Button>
      </div>

      {leavesError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load leave records</p>
            <p className="text-xs text-red-600 mt-0.5">{leavesError?.data?.message || leavesError?.message || 'Something went wrong'}</p>
          </div>
        </div>
      )}

      {/* Balance Cards */}
      {BALANCE_KEYS.some((k) => balance[k]) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BALANCE_KEYS.map((key) => {
            const b = balance[key];
            if (!b) return null;
            const item = LEAVE_TYPE_OPTIONS.find((l) => l.value === key);
            const isLow = b.balance <= 2 && b.total > 0;
            return (
              <div
                key={key}
                className="bg-white rounded-xl border border-zinc-200 p-4 transition-all hover:border-zinc-300"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500 uppercase font-medium">{item?.label || key}</p>
                  {isLow && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Low
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <p className="text-2xl font-bold text-zinc-900">{b.balance ?? 0}</p>
                  <p className="text-xs text-zinc-400">/ {b.total} days</p>
                </div>
                <div className="mt-2 w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary-900 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, b.total ? ((b.balance ?? 0) / b.total) * 100 : 0))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin / Manager Tabs */}
      {isAdmin && (
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
          <button
            onClick={() => {
              setActiveTab('pending');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-primary-900 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Approvals</span>
            {pendingCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-xs font-semibold ${
                  activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-primary-900 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>All Requests</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('my');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'my'
                ? 'bg-primary-900 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Leaves</span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={isAdmin ? 'Search employee or reason...' : 'Search in reason...'}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white"
            />
          </div>

          {/* Employee Filter (For Admin in 'All Requests' tab) */}
          {isAdmin && activeTab === 'all' && (
            <div className="w-full sm:w-48">
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
          )}

          {/* Status Filter (When not in fixed 'pending' tab) */}
          {(activeTab !== 'pending' || !isAdmin) && (
            <div className="w-full sm:w-36">
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Leave Type Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={leaveTypeFilter || 'all'}
              onValueChange={(val) => {
                setLeaveTypeFilter(val === 'all' ? '' : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Leave Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {LEAVE_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DatePickerSimple
              value={dateFrom}
              onChange={(val) => {
                setDateFrom(val);
                setPage(1);
              }}
              placeholder="From date"
            />
            <DatePickerSimple
              value={dateTo}
              onChange={(val) => {
                setDateTo(val);
                setPage(1);
              }}
              placeholder="To date"
            />
          </div>

          {/* Clear Button */}
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
          <TableSkeleton rows={5} />
        ) : leaves.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={
              activeTab === 'pending'
                ? 'No pending leave requests'
                : 'No leave records found'
            }
            description={
              activeTab === 'pending'
                ? 'All employee leave requests have been reviewed and processed.'
                : 'No leave records match your current filters.'
            }
            action={
              <Button onClick={handleOpenForm}>
                <Plus className="w-4 h-4" /> Apply Leave
              </Button>
            }
          />
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {leaves.map((leave) => {
                const s = new Date(leave.startDate);
                const e = new Date(leave.endDate);
                const days = isValid(s) && isValid(e) ? Math.max(1, differenceInCalendarDays(e, s) + 1) : null;
                const isPending = leave.status === 'pending';

                return (
                  <tr key={leave._id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-primary-100 text-primary-900 flex items-center justify-center font-semibold text-xs shrink-0">
                          {leave.employee?.name ? leave.employee.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{leave.employee?.name || '—'}</p>
                          <p className="text-xs text-zinc-400">{leave.employee?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700 capitalize">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">
                        {leave.leaveType?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {isValid(s) ? format(s, 'dd MMM') : '—'} — {isValid(e) ? format(e, 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-800">
                      {days ? `${days} ${days === 1 ? 'day' : 'days'}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 max-w-[200px]">
                      <p className="truncate" title={leave.reason}>
                        {leave.reason}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[leave.status] || 'default'}>
                        {leave.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingLeave(leave)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {isAdmin && isPending && (
                          <>
                            <button
                              onClick={() => handleApprove(leave._id)}
                              disabled={approving}
                              title="Approve leave"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenReject(leave)}
                              disabled={rejecting}
                              title="Reject leave"
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : leaves.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={
              activeTab === 'pending'
                ? 'No pending leave requests'
                : 'No leave records found'
            }
            description="No records match your filters."
          />
        ) : (
          leaves.map((leave) => {
            const s = new Date(leave.startDate);
            const e = new Date(leave.endDate);
            const days = isValid(s) && isValid(e) ? Math.max(1, differenceInCalendarDays(e, s) + 1) : null;
            const isPending = leave.status === 'pending';

            return (
              <div key={leave._id} className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-primary-100 text-primary-900 flex items-center justify-center font-semibold text-xs shrink-0">
                      {leave.employee?.name ? leave.employee.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 text-sm">{leave.employee?.name || '—'}</p>
                      <span className="text-xs text-zinc-500 capitalize">{leave.leaveType?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <Badge variant={STATUS_BADGE[leave.status] || 'default'}>{leave.status}</Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600 bg-zinc-50 p-2 rounded-lg">
                  <span>
                    {isValid(s) ? format(s, 'dd MMM') : '—'} — {isValid(e) ? format(e, 'dd MMM yyyy') : '—'}
                  </span>
                  <span className="font-semibold text-zinc-900">{days ? `${days} ${days === 1 ? 'day' : 'days'}` : ''}</span>
                </div>

                <p className="text-xs text-zinc-600 line-clamp-2">{leave.reason}</p>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                  <button
                    onClick={() => setViewingLeave(leave)}
                    className="text-xs text-primary-900 font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>

                  {isAdmin && isPending && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleApprove(leave._id)} loading={approving}>
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleOpenReject(leave)}>
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Apply for Leave" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-xs uppercase tracking-wide">Application Error</p>
                <p className="text-sm mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          {/* Leave Type */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-zinc-700">Leave Type *</label>
              {currentTypeBalance !== undefined && (
                <span className="text-xs text-zinc-500">
                  Available:{' '}
                  <strong className={currentTypeBalance > 0 ? 'text-zinc-900 font-semibold' : 'text-amber-600 font-semibold'}>
                    {currentTypeBalance} days
                  </strong>
                </span>
              )}
            </div>
            <Select value={form.leaveType} onValueChange={(val) => handleFieldChange('leaveType', val)}>
              <SelectTrigger className={formErrors.leaveType ? 'border-red-300' : ''}>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPE_OPTIONS.map((opt) => {
                  const b = balance[opt.value];
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center justify-between w-full gap-4">
                        <span>{opt.label}</span>
                        {b && <span className="text-xs text-zinc-400">({b.balance ?? 0} left)</span>}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {formErrors.leaveType && <p className="text-xs text-red-600 mt-1">{formErrors.leaveType}</p>}
          </div>

          {/* Dates using Shadcn DatePicker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Start Date *</label>
              <DatePickerSimple
                value={form.startDate}
                onChange={(val) => handleFieldChange('startDate', val)}
                placeholder="Pick start date"
                error={!!formErrors.startDate}
              />
              {formErrors.startDate && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.startDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">End Date *</label>
              <DatePickerSimple
                value={form.endDate}
                onChange={(val) => handleFieldChange('endDate', val)}
                placeholder="Pick end date"
                minDate={form.startDate || undefined}
                error={!!formErrors.endDate}
              />
              {formErrors.endDate && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Leave Duration Summary Card */}
          {leaveDuration > 0 && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-zinc-700">
                <CalendarDays className="w-4 h-4 text-zinc-500" />
                <span>
                  Total Duration:{' '}
                  <strong className="text-zinc-900">
                    {leaveDuration} {leaveDuration === 1 ? 'day' : 'days'}
                  </strong>
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-medium">
                {form.startDate && format(new Date(form.startDate), 'dd MMM')}
                {form.startDate && form.endDate && form.startDate !== form.endDate && ` – ${format(new Date(form.endDate), 'dd MMM yyyy')}`}
                {form.startDate && form.endDate && form.startDate === form.endDate && ` ${format(new Date(form.startDate), 'yyyy')}`}
              </span>
            </div>
          )}

          {leaveDuration < 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>End date cannot be earlier than start date.</span>
            </div>
          )}

          {currentTypeBalance !== undefined && leaveDuration > currentTypeBalance && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Requested {leaveDuration} days exceed your {form.leaveType.replace('_', ' ')} balance ({currentTypeBalance} days). Excess days may be marked as unpaid leave.
              </span>
            </div>
          )}

          {/* Reason */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-zinc-700">Reason for Leave *</label>
              <span
                className={`text-xs ${form.reason.length < 10 && form.reason.length > 0 ? 'text-amber-600 font-medium' : 'text-zinc-400'}`}
              >
                {form.reason.length}/1000 (min 10)
              </span>
            </div>
            <Textarea
              value={form.reason}
              onChange={(e) => handleFieldChange('reason', e.target.value)}
              placeholder="Provide a detailed explanation for your leave request..."
              rows={3}
              className={formErrors.reason ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}
            />
            {formErrors.reason && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.reason}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={applying}>
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      {viewingLeave && (
        <Modal
          open={!!viewingLeave}
          onClose={() => setViewingLeave(null)}
          title="Leave Request Details"
          size="md"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary-100 text-primary-900 flex items-center justify-center font-semibold text-sm">
                  {viewingLeave.employee?.name ? viewingLeave.employee.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900">{viewingLeave.employee?.name || '—'}</h4>
                  <p className="text-xs text-zinc-400">{viewingLeave.employee?.email}</p>
                </div>
              </div>
              <Badge variant={STATUS_BADGE[viewingLeave.status] || 'default'}>{viewingLeave.status}</Badge>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-100 text-sm">
              <div>
                <p className="text-xs text-zinc-400">Leave Type</p>
                <p className="font-medium text-zinc-900 capitalize mt-0.5">
                  {viewingLeave.leaveType?.replace('_', ' ')}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Duration</p>
                <p className="font-medium text-zinc-900 mt-0.5">
                  {(() => {
                    const s = new Date(viewingLeave.startDate);
                    const e = new Date(viewingLeave.endDate);
                    const d = isValid(s) && isValid(e) ? Math.max(1, differenceInCalendarDays(e, s) + 1) : null;
                    return d ? `${d} ${d === 1 ? 'day' : 'days'}` : '—';
                  })()}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-xs text-zinc-400">Leave Period</p>
                <p className="font-medium text-zinc-900 mt-0.5">
                  {viewingLeave.startDate && format(new Date(viewingLeave.startDate), 'dd MMMM yyyy')} —{' '}
                  {viewingLeave.endDate && format(new Date(viewingLeave.endDate), 'dd MMMM yyyy')}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-xs text-zinc-400">Submitted On</p>
                <p className="font-medium text-zinc-900 mt-0.5">
                  {viewingLeave.createdAt ? format(new Date(viewingLeave.createdAt), 'dd MMM yyyy, hh:mm a') : '—'}
                </p>
              </div>
            </div>

            {/* Reason */}
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Reason for Request</p>
              <div className="p-3 bg-zinc-50 rounded-lg text-sm text-zinc-800 leading-relaxed border border-zinc-100">
                {viewingLeave.reason}
              </div>
            </div>

            {/* If processed */}
            {viewingLeave.status !== 'pending' && viewingLeave.approvedBy && (
              <div className="p-3 bg-zinc-50 rounded-lg text-xs space-y-1 border border-zinc-100">
                <p className="text-zinc-500">
                  Reviewed by: <strong className="text-zinc-800">{viewingLeave.approvedBy.name}</strong>
                </p>
                {viewingLeave.comment && (
                  <p className="text-zinc-500">
                    Comment: <span className="text-zinc-800 font-medium">{viewingLeave.comment}</span>
                  </p>
                )}
              </div>
            )}

            {/* Admin Action Buttons if Pending */}
            {isAdmin && viewingLeave.status === 'pending' && (
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => handleOpenReject(viewingLeave)}
                  disabled={rejecting}
                >
                  <X className="w-4 h-4" /> Reject Request
                </Button>
                <Button
                  type="button"
                  onClick={() => handleApprove(viewingLeave._id)}
                  loading={approving}
                >
                  <Check className="w-4 h-4" /> Approve Leave
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Leave Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectingLeave(null);
          setRejectComment('');
          setRejectError('');
        }}
        title="Reject Leave Request"
        size="sm"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-sm space-y-1">
            <p className="text-zinc-600">
              Employee: <strong className="text-zinc-900">{rejectingLeave?.employee?.name || '—'}</strong>
            </p>
            <p className="text-zinc-600">
              Type: <span className="capitalize">{rejectingLeave?.leaveType?.replace('_', ' ')}</span>
            </p>
            <p className="text-zinc-600">
              Dates:{' '}
              {rejectingLeave?.startDate && format(new Date(rejectingLeave.startDate), 'dd MMM yyyy')} —{' '}
              {rejectingLeave?.endDate && format(new Date(rejectingLeave.endDate), 'dd MMM yyyy')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Rejection Reason *</label>
            <Textarea
              value={rejectComment}
              onChange={(e) => {
                setRejectComment(e.target.value);
                if (rejectError) setRejectError('');
              }}
              placeholder="State why this leave request is being rejected..."
              rows={3}
              required
              className={rejectError ? 'border-red-300' : ''}
            />
            {rejectError && <p className="text-xs text-red-600 mt-1">{rejectError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectingLeave(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={rejecting}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
