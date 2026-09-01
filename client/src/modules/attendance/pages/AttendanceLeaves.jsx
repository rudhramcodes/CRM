import { useState } from 'react';
import { useGetLeavesQuery, useApplyLeaveMutation, useApproveLeaveMutation, useRejectLeaveMutation, useGetLeaveBalanceQuery } from '../../../services/attendanceApi';
import { useAuth } from '../../../hooks/useAuth';
import { format } from 'date-fns';
import { Plus, Check, X, Calendar } from 'lucide-react';

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'comp_off', label: 'Comp Off' },
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function AttendanceLeaves() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });

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
      setShowForm(false);
      setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id) => {
    try { await approveLeave({ id, comment: 'Approved' }).unwrap(); } catch (err) { console.error(err); }
  };

  const handleReject = async (id) => {
    const comment = prompt('Rejection reason:');
    if (comment === null) return;
    try { await rejectLeave({ id, comment }).unwrap(); } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500">Apply for and manage leave requests</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Apply Leave
        </button>
      </div>

      {Object.keys(balance).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LEAVE_TYPES.map(({ value, label }) => (
            balance[value] !== undefined && (
              <div key={value} className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500 uppercase">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{balance[value]?.remaining ?? 0}</p>
                <p className="text-xs text-gray-400">remaining</p>
              </div>
            )
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Apply for Leave</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {LEAVE_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={applying} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Submit</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No leave records</td></tr>
            ) : (
              leaves.map((leave) => (
                <tr key={leave._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{leave.employee?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{leave.leaveType?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {format(new Date(leave.startDate), 'dd MMM')} — {format(new Date(leave.endDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{leave.totalDays}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[leave.status]}`}>
                      {leave.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {leave.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleApprove(leave._id)} className="p-1 hover:bg-green-100 rounded"><Check className="h-4 w-4 text-green-600" /></button>
                          <button onClick={() => handleReject(leave._id)} className="p-1 hover:bg-red-100 rounded"><X className="h-4 w-4 text-red-600" /></button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
