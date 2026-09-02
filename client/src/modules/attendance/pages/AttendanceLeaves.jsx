import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { useGetLeavesQuery, useApplyLeaveMutation, useApproveLeaveMutation, useRejectLeaveMutation, useGetLeaveBalanceQuery } from '../../../services/attendanceApi';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { format } from 'date-fns';
import { Plus, Check, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const LEAVE_TYPE_OPTIONS = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'comp_off', label: 'Comp Off' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
];

const STATUS_BADGE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export default function AttendanceLeaves() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    dispatch(setPageTitle('Leave Management'));
  }, [dispatch]);

  const { data: leavesData, isLoading } = useGetLeavesQuery({ page, limit: 10 });
  const { data: balanceData } = useGetLeaveBalanceQuery(user?._id, { skip: !user?._id });
  const [applyLeave, { isLoading: applying }] = useApplyLeaveMutation();
  const [approveLeave] = useApproveLeaveMutation();
  const [rejectLeave] = useRejectLeaveMutation();

  const leaves = leavesData?.data?.leaves || [];
  const pagination = leavesData?.data?.pagination || {};
  const balance = balanceData?.data?.balance || {};
  const isAdmin = ['super_admin', 'admin', 'manager'].includes(user?.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await applyLeave(form).unwrap();
      toast.success('Leave applied successfully');
      setShowForm(false);
      setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to apply leave');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveLeave({ id, comment: 'Approved' }).unwrap();
      toast.success('Leave approved');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const comment = prompt('Rejection reason:');
    if (comment === null) return;
    try {
      await rejectLeave({ id, comment }).unwrap();
      toast.success('Leave rejected');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reject');
    }
  };

  const BALANCE_KEYS = ['casual', 'sick', 'earned', 'comp_off'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Leave Management</h2>
          <p className="text-sm text-zinc-500 mt-1">Apply for and manage leave requests</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
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
            return (
              <div key={key} className="bg-white rounded-xl border border-zinc-200 p-4">
                <p className="text-xs text-zinc-500 uppercase font-medium">{item?.label || key}</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{b.balance ?? 0}</p>
                <p className="text-xs text-zinc-400 mt-0.5">of {b.total} remaining</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Apply for Leave">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Leave Type</label>
            <Select value={form.leaveType} onValueChange={(val) => setForm({ ...form, leaveType: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">End Date</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Reason</label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              required
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={applying}>Submit</Button>
          </div>
        </form>
      </Modal>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : leaves.length === 0 ? (
          <EmptyState icon={Calendar} title="No leave records" description="No leaves found." />
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {leaves.map((leave) => (
                <tr key={leave._id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">{leave.employee?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 capitalize">{leave.leaveType?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {format(new Date(leave.startDate), 'dd MMM')} — {format(new Date(leave.endDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 max-w-[200px] truncate">{leave.reason}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[leave.status] || 'default'}>{leave.status}</Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {leave.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleApprove(leave._id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-green-600 hover:bg-green-50 transition-colors"><Check className="h-4 w-4" /></button>
                          <button onClick={() => handleReject(leave._id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"><X className="h-4 w-4" /></button>
                        </div>
                      )}
                    </td>
                  )}
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
        ) : leaves.length === 0 ? (
          <EmptyState icon={Calendar} title="No leave records" description="No leaves found." />
        ) : (
          leaves.map((leave) => (
            <div key={leave._id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-zinc-900">{leave.employee?.name || '—'}</p>
                <Badge variant={STATUS_BADGE[leave.status] || 'default'}>{leave.status}</Badge>
              </div>
              <p className="text-sm text-zinc-500 mb-1 capitalize">{leave.leaveType?.replace('_', ' ')}</p>
              <p className="text-sm text-zinc-600">
                {format(new Date(leave.startDate), 'dd MMM')} — {format(new Date(leave.endDate), 'dd MMM yyyy')}
              </p>
              {leave.reason && <p className="text-sm text-zinc-500 mt-1 truncate">{leave.reason}</p>}
              {isAdmin && leave.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleApprove(leave._id)}>
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="danger" className="flex-1" onClick={() => handleReject(leave._id)}>
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrevPage}>Previous</Button>
          <span className="text-sm text-zinc-500">Page {pagination.page} of {pagination.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNextPage}>Next</Button>
        </div>
      )}
    </div>
  );
}
