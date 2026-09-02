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
  Clock,
  Sparkles,
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
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingLeave, setRejectingLeave] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState('');

  useEffect(() => {
    dispatch(setPageTitle('Leave Management'));
  }, [dispatch]);

  const { data: leavesData, isLoading, error: leavesError } = useGetLeavesQuery({ page, limit: 10 });
  const { data: balanceData } = useGetLeaveBalanceQuery(user?._id, { skip: !user?._id });
  const [applyLeave, { isLoading: applying }] = useApplyLeaveMutation();
  const [approveLeave, { isLoading: approving }] = useApproveLeaveMutation();
  const [rejectLeave, { isLoading: rejecting }] = useRejectLeaveMutation();

  const leaves = leavesData?.data?.leaves || [];
  const pagination = leavesData?.data?.pagination || {};
  const balance = balanceData?.data?.balance || balanceData?.data || {};
  const isAdmin = ['super_admin', 'admin', 'manager'].includes(user?.role);

  // Calculate duration in days between start and end date
  const leaveDuration = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (!isValid(start) || !isValid(end)) return 0;
    const diff = differenceInCalendarDays(end, start);
    return diff >= 0 ? diff + 1 : -1;
  }, [form.startDate, form.endDate]);

  // Selected leave type balance
  const currentTypeBalance = balance[form.leaveType]?.balance;

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-adjust end date if start date is changed to a date after current end date
      if (field === 'startDate' && value && prev.endDate) {
        if (new Date(value) > new Date(prev.endDate)) {
          updated.endDate = value;
        }
      }

      return updated;
    });

    // Clear field-specific error and server error on change
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

    if (!form.leaveType) {
      errors.leaveType = 'Please select a leave type';
    }

    if (!form.startDate) {
      errors.startDate = 'Start date is required';
    }

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
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reject leave request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Leave Management</h2>
          <p className="text-sm text-zinc-500 mt-1">Apply for and track employee leave requests</p>
        </div>
        <Button onClick={handleOpenForm}>
          <Plus className="w-4 h-4" />
          Apply Leave
        </Button>
      </div>

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
                        {b && (
                          <span className="text-xs text-zinc-400">
                            ({b.balance ?? 0} left)
                          </span>
                        )}
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
                  Total Duration: <strong className="text-zinc-900">{leaveDuration} {leaveDuration === 1 ? 'day' : 'days'}</strong>
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
              <span className={`text-xs ${form.reason.length < 10 && form.reason.length > 0 ? 'text-amber-600 font-medium' : 'text-zinc-400'}`}>
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

      {/* Reject Leave Modal (Proper UI replacing prompt) */}
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
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Rejection Reason *
            </label>
            <Textarea
              value={rejectComment}
              onChange={(e) => {
                setRejectComment(e.target.value);
                if (rejectError) setRejectError('');
              }}
              placeholder="State the reason why this leave request is being rejected..."
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

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : leaves.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No leave records"
            description="You have not submitted any leave requests yet."
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
                {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {leaves.map((leave) => {
                const s = new Date(leave.startDate);
                const e = new Date(leave.endDate);
                const days = isValid(s) && isValid(e) ? Math.max(1, differenceInCalendarDays(e, s) + 1) : null;
                return (
                  <tr key={leave._id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{leave.employee?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 capitalize">{leave.leaveType?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {isValid(s) ? format(s, 'dd MMM') : '—'} — {isValid(e) ? format(e, 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {days ? `${days} ${days === 1 ? 'day' : 'days'}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 max-w-[220px] truncate" title={leave.reason}>
                      {leave.reason}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[leave.status] || 'default'}>{leave.status}</Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {leave.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleApprove(leave._id)}
                              disabled={approving}
                              title="Approve leave"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenReject(leave)}
                              disabled={rejecting}
                              title="Reject leave"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
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
            title="No leave records"
            description="You have not submitted any leave requests yet."
            action={
              <Button onClick={handleOpenForm}>
                <Plus className="w-4 h-4" /> Apply Leave
              </Button>
            }
          />
        ) : (
          leaves.map((leave) => {
            const s = new Date(leave.startDate);
            const e = new Date(leave.endDate);
            const days = isValid(s) && isValid(e) ? Math.max(1, differenceInCalendarDays(e, s) + 1) : null;
            return (
              <div key={leave._id} className="bg-white rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-zinc-900">{leave.employee?.name || '—'}</p>
                  <Badge variant={STATUS_BADGE[leave.status] || 'default'}>{leave.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-500 mb-1">
                  <span className="capitalize">{leave.leaveType?.replace('_', ' ')}</span>
                  {days && <span>{days} {days === 1 ? 'day' : 'days'}</span>}
                </div>
                <p className="text-sm text-zinc-600">
                  {isValid(s) ? format(s, 'dd MMM') : '—'} — {isValid(e) ? format(e, 'dd MMM yyyy') : '—'}
                </p>
                {leave.reason && <p className="text-sm text-zinc-500 mt-2 bg-zinc-50 p-2.5 rounded-lg">{leave.reason}</p>}
                {isAdmin && leave.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleApprove(leave._id)} loading={approving}>
                      <Check className="h-3.5 w-3.5 text-green-600" /> Approve
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => handleOpenReject(leave)}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

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
    </div>
  );
}
