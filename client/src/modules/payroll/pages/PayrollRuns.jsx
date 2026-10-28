import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, ChevronRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import Modal from '../../../components/ui/Modal';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { useGeneratePayrollMutation, useGetPayrollRunsQuery } from '../../../services/payrollApi';
import { formatCurrencyExact, formatDate } from '../../../utils/formatters';

const monthLabel = (year, month) =>
  new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

export default function PayrollRuns() {
  const navigate = useNavigate();
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const { data, isLoading } = useGetPayrollRunsQuery(undefined);
  const [generatePayroll, { isLoading: isGenerating }] = useGeneratePayrollMutation();

  const runs = data?.data?.runs || [];

  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 24 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index - 1, 1);
      return {
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      };
    });
  }, []);

  const handleGenerate = async () => {
    if (!selectedPeriod) {
      toast.error('Select a payroll period');
      return;
    }
    const [year, month] = selectedPeriod.split('-').map(Number);
    try {
      const result = await generatePayroll({ year, month }).unwrap();
      const runId = result?.data?.run?._id;
      toast.success('Payroll draft generated');
      setShowGenerate(false);
      if (runId) navigate(`/payroll/${runId}`);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to generate payroll');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Payroll</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Generate month-end drafts, resolve exceptions, then finalize salary slips.
          </p>
        </div>
        <Button onClick={() => { setSelectedPeriod(periodOptions[0]?.value || ''); setShowGenerate(true); }}>
          <Plus className="h-4 w-4" /> Generate payroll
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={6} /></div>
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No payroll runs yet"
            description="Generate a draft after the month closes to calculate salaries from attendance and approved leave."
            action={<Button onClick={() => { setSelectedPeriod(periodOptions[0]?.value || ''); setShowGenerate(true); }}>Generate payroll</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Employees</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Gross</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Net</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Issues</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Generated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {runs.map((run) => (
                  <tr
                    key={run._id}
                    className="cursor-pointer hover:bg-zinc-50"
                    onClick={() => navigate(`/payroll/${run._id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {monthLabel(run.year, run.month)}
                      {run.revision > 1 && <span className="ml-2 text-xs text-amber-600">Rev {run.revision}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${run.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {run.status === 'finalized' ? 'Finalized' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">{run.totals?.employees || 0}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">{formatCurrencyExact(run.totals?.gross)}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCurrencyExact(run.totals?.net)}</td>
                    <td className="px-4 py-3">
                      {run.totals?.issues ? (
                        <span className="text-xs font-medium text-red-600">{run.totals.issues} blocked</span>
                      ) : (
                        <span className="text-xs text-green-600">Ready</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{formatDate(run.generatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-zinc-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        title="Generate payroll draft"
        description="Attendance, approved leave, salary, and bank details are checked before a slip is marked ready."
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">Payroll period</label>
            <select
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-900"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            A draft can be regenerated until it is finalized. Finalized payroll must be reopened with a reason.
          </p>
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-2">
            <Button variant="secondary" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={handleGenerate} loading={isGenerating}>Generate draft</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
