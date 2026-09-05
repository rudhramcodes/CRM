import { useState } from 'react';
import { CheckCircle2, Clock3, FileText, UserRound, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useApproveRegularizationMutation, useGetRegularizationRequestsQuery } from '../../../services/attendanceApi';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Textarea from '../../../components/ui/Textarea';
import EmptyState from '../../../components/ui/EmptyState';

const formatDate = (value) => {
  if (!value) return '—';
  try { return format(new Date(value), 'dd MMM yyyy'); } catch { return '—'; }
};

const detailValue = (value) => value || 'Not provided';

export default function AttendanceRegularization() {
  const { data, isLoading, isError } = useGetRegularizationRequestsQuery('pending');
  const [approveRegularization, { isLoading: isReviewing }] = useApproveRegularizationMutation();
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const requests = data?.data?.requests || [];

  const approve = async (request) => {
    try {
      await approveRegularization({ id: request._id, action: 'approved' }).unwrap();
      toast.success('Regularization approved');
    } catch (error) {
      toast.error(error?.data?.message || 'Could not approve request');
    }
  };

  const reject = async (request) => {
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      await approveRegularization({ id: request._id, action: 'rejected', comment: reason }).unwrap();
      toast.success('Regularization rejected');
      setRejectingId(null);
      setRejectReason('');
    } catch (error) {
      toast.error(error?.data?.message || 'Could not reject request');
    }
  };

  return (
    <div className="min-h-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Attendance review</p>
          <h1 className="mt-1 text-2xl font-semibold text-primary-900">Regularization Requests</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">Review the employee’s submitted attendance details. Approve the request as-is, or reject it with a clear reason.</p>
        </div>
        <Badge variant="warning" size="lg">{requests.length} pending</Badge>
      </div>

      {isLoading && <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">Loading requests…</div>}
      {isError && <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Could not load regularization requests. Please refresh and try again.</div>}
      {!isLoading && !isError && requests.length === 0 && (
        <EmptyState icon={CheckCircle2} title="No pending requests" description="New attendance regularization requests will appear here for review." />
      )}

      <div className="space-y-4">
        {requests.map((request) => {
          const employee = request.employee || {};
          const proposed = request.regularization?.request || {};
          const isRejecting = rejectingId === request._id;
          return (
            <article key={request._id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-zinc-100 bg-[#fcfaf6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white">{employee.name?.[0]?.toUpperCase() || 'U'}</div>
                  <div>
                    <h2 className="font-semibold text-zinc-900">{employee.name || 'Unknown employee'}</h2>
                    <p className="text-xs text-zinc-500">{employee.email || 'No email'} · Attendance date {formatDate(request.date)}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <Badge variant="warning">Pending review</Badge>
                  <p className="mt-1 text-xs text-zinc-400">Submitted {formatDate(proposed.requestedAt)}</p>
                </div>
              </div>

              <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_1fr_280px]">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Employee request</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-zinc-50 p-3"><p className="text-xs text-zinc-400">Clock in</p><p className="mt-1 text-sm font-semibold text-zinc-800">{detailValue(proposed.clockInTime)}</p></div>
                    <div className="rounded-xl bg-zinc-50 p-3"><p className="text-xs text-zinc-400">Clock out</p><p className="mt-1 text-sm font-semibold text-zinc-800">{detailValue(proposed.clockOutTime)}</p></div>
                    <div className="rounded-xl bg-zinc-50 p-3"><p className="text-xs text-zinc-400">Total break</p><p className="mt-1 text-sm font-semibold text-zinc-800">{proposed.breakMinutes || 0} minutes</p></div>
                    <div className="rounded-xl bg-zinc-50 p-3"><p className="text-xs text-zinc-400">Current status</p><p className="mt-1 text-sm font-semibold capitalize text-zinc-800">{request.status?.replace('_', ' ') || '—'}</p></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Reason provided</p>
                  <div className="min-h-[132px] rounded-xl border border-zinc-100 bg-white p-4 text-sm leading-6 text-zinc-700">{proposed.reason || 'No reason provided'}</div>
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="space-y-2 text-xs text-zinc-500">
                    <p className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5" /> Requested by <strong className="text-zinc-800">{employee.name || 'Employee'}</strong></p>
                    <p className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" /> Date <strong className="text-zinc-800">{formatDate(request.date)}</strong></p>
                    <p className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Approval updates the attendance record</p>
                  </div>
                  {!isRejecting ? (
                    <div className="mt-5 flex gap-2">
                      <Button className="flex-1" size="sm" loading={isReviewing} onClick={() => approve(request)}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                      <Button className="flex-1" size="sm" variant="outline" disabled={isReviewing} onClick={() => { setRejectingId(request._id); setRejectReason(''); }}><XCircle className="h-4 w-4" /> Reject</Button>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-2">
                      <Textarea label="Rejection reason *" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={3} placeholder="Tell the employee what needs to be corrected…" />
                      <div className="flex gap-2">
                        <Button className="flex-1" size="sm" variant="danger" loading={isReviewing} onClick={() => reject(request)}>Confirm reject</Button>
                        <Button size="sm" variant="ghost" disabled={isReviewing} onClick={() => setRejectingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
