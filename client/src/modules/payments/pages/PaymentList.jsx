import { useState, useCallback } from 'react';
import { CreditCard, IndianRupee, Clock, TrendingUp, Briefcase } from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import toast from 'react-hot-toast';
import PaymentTable from '../components/PaymentTable';
import PaymentFilters from '../components/PaymentFilters';
import { useGetPaymentsQuery, useGetPaymentStatsQuery, useDeletePaymentMutation } from '../../../services/paymentApi';
import { useSelector } from 'react-redux';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { StatCardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import { LEAD_BRANDS } from '../../../constants';

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
  const [activeBrand, setActiveBrand] = useState('');

  const { data: paymentsData, isLoading, isFetching, refetch: refetchPayments } = useGetPaymentsQuery({ ...filters, page, limit: 10 });
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useGetPaymentStatsQuery();
  const stats = statsData?.data || {};
  const [deletePayment] = useDeletePaymentMutation();

  const payments = paymentsData?.data || [];
  const pagination = paymentsData?.pagination;
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => {
      const next = { ...newFilters };
      if (activeBrand) next.brand = activeBrand;
      else delete next.brand;
      return next;
    });
    setPage(1);
  }, [activeBrand]);

  const handleBrandChange = useCallback((brand) => {
    setActiveBrand(brand);
    setFilters((prev) => {
      const next = { ...prev };
      if (brand) next.brand = brand;
      else delete next.brand;
      return next;
    });
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
        <button aria-label="Refresh payments" onClick={() => { refetchPayments(); refetchStats(); }}
          disabled={isFetching}
          className="p-2 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50"
          title="Refresh payments"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
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

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => handleBrandChange('')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            !activeBrand
              ? 'bg-primary-900 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          All
        </button>
        {LEAD_BRANDS.map((b) => (
          <button
            key={b.value}
            onClick={() => handleBrandChange(b.value)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeBrand === b.value
                ? 'bg-primary-900 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {!statsLoading && stats.byBrand?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-700 mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Venture-wise Collection
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.byBrand.map((item) => (
              <div key={item.brand} className="bg-white rounded-lg border border-zinc-200 p-3">
                <p className="text-xs text-zinc-500 capitalize">{item.brand?.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-green-600 mt-1">
                  ₹{Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-zinc-400">{item.count} payment{item.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
