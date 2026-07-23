import { useState, useCallback } from 'react';
import { CreditCard, IndianRupee, Clock, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentTable from '../components/PaymentTable';
import PaymentFilters from '../components/PaymentFilters';
import { useGetPaymentsQuery, useGetPaymentStatsQuery, useDeletePaymentMutation } from '../../../services/paymentApi';
import { useSelector } from 'react-redux';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { StatCardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';

const statCards = [
  { key: 'totalCollected', label: 'Total Collected', icon: IndianRupee, color: 'text-green-600 bg-green-50', format: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'pendingAmount', label: 'Total Outstanding', icon: Clock, color: 'text-orange-600 bg-orange-50', format: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'methodCount', label: 'Payment Methods', icon: TrendingUp, color: 'text-blue-600 bg-blue-50', format: (v) => v },
];

export default function PaymentList() {
  const user = useSelector((state) => state.auth.user);
  const canDelete = user?.role === 'super_admin';

  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);

  const { data: paymentsData, isLoading, isFetching } = useGetPaymentsQuery({ ...filters, page, limit: 10 });
  const { data: statsData, isLoading: statsLoading } = useGetPaymentStatsQuery();
  const stats = statsData?.data || {};
  const [deletePayment] = useDeletePaymentMutation();

  const payments = paymentsData?.data || [];
  const pagination = paymentsData?.pagination;
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const confirmDelete = useCallback((id) => {
    setDeleteTarget(id);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deletePayment(deleteTarget).unwrap();
      toast.success('Payment deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete payment');
      setDeleteTarget(null);
    }
  }, [deleteTarget, deletePayment]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Payments</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statsLoading
          ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
          <div key={card.key} className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-zinc-500">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-zinc-900">
              {statsLoading ? '-' : card.format(card.key === 'methodCount' ? (stats?.byMethod?.length || 0) : stats?.[card.key])}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-4">
        <PaymentFilters onFilterChange={handleFilterChange} />
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} /></div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Payments will appear here once recorded against invoices."
          />
        ) : (
          <>
            <PaymentTable
              payments={payments}
              onDelete={confirmDelete}
              canDelete={canDelete}
            />
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200">
                <span className="text-sm text-zinc-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This will also update the invoice balance."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
