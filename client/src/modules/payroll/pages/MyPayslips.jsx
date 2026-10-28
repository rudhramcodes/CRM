import { useState } from 'react';
import { Download, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { useGetMySlipsQuery, useLazyDownloadSlipPdfQuery } from '../../../services/payrollApi';
import { formatCurrencyExact, formatDate } from '../../../utils/formatters';

const monthLabel = (date) =>
  new Date(date).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

export default function MyPayslips() {
  const { data, isLoading } = useGetMySlipsQuery();
  const [downloadPdf] = useLazyDownloadSlipPdfQuery();
  const [downloadingId, setDownloadingId] = useState(null);
  const slips = data?.data?.slips || [];

  const handleDownload = async (slip) => {
    setDownloadingId(slip._id);
    try {
      const blob = await downloadPdf(slip._id).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `salary-slip-${slip.employeeId || slip._id}.pdf`;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">My Payslips</h1>
        <p className="mt-1 text-sm text-zinc-500">Finalized salary slips released by payroll admin.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} /></div>
        ) : slips.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No finalized payslips yet"
            description="Salary slips appear here after payroll is finalized for the month."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Pay date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Paid days</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Net pay</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {slips.map((slip) => (
                  <tr key={slip._id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{monthLabel(slip.periodStart)}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(slip.payrollRun?.finalizedAt)}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">{slip.paidDays} / {slip.payrollDays}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCurrencyExact(slip.netPay)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(slip)} loading={downloadingId === slip._id}>
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
