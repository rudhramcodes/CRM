import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, FileWarning, RefreshCw, RotateCcw, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import ReasonModal from '../../../components/ui/ReasonModal';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import {
  useFinalizePayrollMutation,
  useGeneratePayrollMutation,
  useGetPayrollRunQuery,
  useLazyDownloadSlipPdfQuery,
  useReopenPayrollMutation,
} from '../../../services/payrollApi';
import { formatCurrencyExact, formatDate } from '../../../utils/formatters';

const monthLabel = (year, month) =>
  new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

const number = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 });

export default function PayrollRunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useGetPayrollRunQuery(id);
  const [finalizePayroll, { isLoading: isFinalizing }] = useFinalizePayrollMutation();
  const [generatePayroll, { isLoading: isRegenerating }] = useGeneratePayrollMutation();
  const [reopenPayroll] = useReopenPayrollMutation();
  const [downloadPdf] = useLazyDownloadSlipPdfQuery();
  const [showFinalize, setShowFinalize] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const run = data?.data?.run;
  const slips = data?.data?.slips || [];
  const blocked = slips.filter((slip) => !slip.ready);

  const handleFinalize = async () => {
    try {
      await finalizePayroll(id).unwrap();
      toast.success('Payroll finalized');
      setShowFinalize(false);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to finalize payroll');
    }
  };

  const handleRegenerate = async () => {
    try {
      await generatePayroll({ year: run.year, month: run.month }).unwrap();
      toast.success('Payroll draft regenerated');
      setShowRegenerate(false);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to regenerate payroll');
    }
  };

  const handleReopen = async (reason) => {
    try {
      await reopenPayroll({ id, reason }).unwrap();
      toast.success('Payroll reopened');
      setShowReopen(false);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to reopen payroll');
      throw error;
    }
  };

  const handleDownload = async (slip) => {
    setDownloadingId(slip._id);
    try {
      const blob = await downloadPdf(slip._id).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `salary-slip-${slip.employeeId || slip._id}-${run?.year}-${String(run?.month).padStart(2, '0')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Salary slip downloaded');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to download salary slip');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) return <div className="p-6"><TableSkeleton rows={8} /></div>;
  if (!run) {
    return <EmptyState icon={Wallet} title="Payroll run not found" description="The payroll run may have been removed." action={<Button onClick={() => navigate('/payroll')}>Back to payroll</Button>} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/payroll')}
            className="mt-0.5 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-900">{monthLabel(run.year, run.month)}</h1>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${run.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {run.status === 'finalized' ? 'Finalized' : 'Draft'}
              </span>
              {run.revision > 1 && <span className="text-xs text-zinc-400">Revision {run.revision}</span>}
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {run.status === 'finalized'
                ? `Finalized ${formatDate(run.finalizedAt)} by payroll admin.`
                : 'Review blocking issues before finalizing this run.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {run.status === 'draft' ? (
            <>
              <Button variant="secondary" onClick={() => setShowRegenerate(true)}>
                <RefreshCw className="h-4 w-4" /> Regenerate
              </Button>
              <Button onClick={() => setShowFinalize(true)} disabled={blocked.length > 0 || slips.length === 0}>
                <CheckCircle2 className="h-4 w-4" /> Finalize payroll
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setShowReopen(true)}>
              <RotateCcw className="h-4 w-4" /> Reopen
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Employees" value={run.totals?.employees || 0} detail={`${run.totals?.ready || 0} ready`} />
        <SummaryCard label="Gross" value={formatCurrencyExact(run.totals?.gross)} detail="Monthly earnings" />
        <SummaryCard label="Deductions" value={formatCurrencyExact(run.totals?.totalDeductions)} detail="LOP + joining/leaving" />
        <SummaryCard label="Net payable" value={formatCurrencyExact(run.totals?.net)} detail="After deductions" accent />
      </div>

      {blocked.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">{blocked.length} employee(s) are blocked</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Resolve missing attendance, pending leave, missing employee profile, salary, or bank details before finalizing.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Paid days</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">LOP</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Net</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {slips.map((slip) => (
                <tr key={slip._id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{slip.employeeName}</p>
                    <p className="text-xs text-zinc-400">{slip.employeeId || 'No employee ID'}{slip.designation ? ` · ${slip.designation}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {number(slip.paidDays)} / {number(slip.payrollDays)}
                    <p className="text-xs text-zinc-400">{number(slip.absentDays)} absent · {number(slip.halfDays)} half</p>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">{formatCurrencyExact(slip.grossEarnings)}</td>
                  <td className="px-4 py-3 text-right text-zinc-600">{formatCurrencyExact(slip.lopDeduction)}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCurrencyExact(slip.netPay)}</td>
                  <td className="px-4 py-3">
                    {slip.ready ? (
                      <span className="text-xs font-medium text-green-600">Ready</span>
                    ) : (
                      <div className="max-w-xs">
                        <span className="text-xs font-medium text-red-600">Blocked</span>
                        <p className="mt-0.5 text-xs text-red-500">{slip.issues.join('; ')}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(slip)} loading={downloadingId === slip._id}>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {slips.length === 0 && (
          <EmptyState icon={Wallet} title="No salary slips" description="No staff were eligible for this payroll period." />
        )}
      </div>

      <ConfirmDialog
        open={showRegenerate}
        onClose={() => setShowRegenerate(false)}
        onConfirm={handleRegenerate}
        title="Regenerate payroll draft"
        message="This replaces the current draft slips with fresh data from attendance, approved leave, profiles, salary, and bank details. Finalized payroll cannot be regenerated."
        confirmLabel="Regenerate draft"
        variant="primary"
        loading={isRegenerating}
      />

      <ConfirmDialog
        open={showFinalize}
        onClose={() => setShowFinalize(false)}
        onConfirm={handleFinalize}
        title="Finalize payroll"
        message="Finalizing locks this payroll period and releases salary slips to employees. Reopening later requires a reason."
        confirmLabel="Finalize payroll"
        variant="primary"
        loading={isFinalizing}
      />

      <ReasonModal
        open={showReopen}
        onClose={() => setShowReopen(false)}
        onConfirm={handleReopen}
        title="Reopen payroll"
        description="Reopening unlocks the finalized run and creates a new revision. Salary slips remain hidden until finalized again."
        confirmLabel="Reopen payroll"
        placeholder="Reason for reopening this payroll..."
      />
    </div>
  );
}

function SummaryCard({ label, value, detail, accent }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-primary-900 bg-primary-900 text-white' : 'border-zinc-200 bg-white'}`}>
      <p className={`text-xs uppercase tracking-wide ${accent ? 'text-zinc-300' : 'text-zinc-400'}`}>{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? 'text-white' : 'text-zinc-900'}`}>{value}</p>
      <p className={`mt-1 text-xs ${accent ? 'text-zinc-300' : 'text-zinc-400'}`}>{detail}</p>
    </div>
  );
}
