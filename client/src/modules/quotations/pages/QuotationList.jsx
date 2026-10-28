import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSignature, Plus, FileText, Send, CheckCircle, XCircle, Clock, IndianRupee, TrendingUp,
} from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import toast from 'react-hot-toast';
import QuotationTable from '../components/QuotationTable';
import QuotationFilters from '../components/QuotationFilters';
import {
  useGetQuotationsQuery,
  useGetQuotationStatsQuery,
  useUpdateQuotationStatusMutation,
  useDeleteQuotationMutation,
} from '../../../services/quotationApi';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { StatCardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import { LEAD_BRANDS } from '../../../constants';

const BRAND_LABELS = LEAD_BRANDS.reduce((acc, b) => ({ ...acc, [b.value]: b.label }), {});

const statCards = [
  { key: 'total', label: 'Total Quotations', icon: FileSignature, color: 'text-blue-600 bg-blue-50' },
  { key: 'draft', label: 'Draft', icon: FileText, color: 'text-zinc-600 bg-zinc-50' },
  { key: 'sent', label: 'Sent', icon: Send, color: 'text-blue-600 bg-blue-50' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600 bg-red-50' },
  { key: 'expired', label: 'Expired', icon: Clock, color: 'text-amber-600 bg-amber-50' },
];

export default function QuotationList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [activeBrand, setActiveBrand] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const {
    data: quotationsData,
    isLoading,
    isFetching,
    refetch: refetchQuotations,
  } = useGetQuotationsQuery({ ...filters, page, limit: 10 });
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetQuotationStatsQuery();
  const [updateStatus] = useUpdateQuotationStatusMutation();
  const [deleteQuotation] = useDeleteQuotationMutation();

  const quotations = quotationsData?.data || [];
  const pagination = quotationsData?.pagination;
  const stats = statsData?.data || {};
  const financials = stats.financials || {};

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(() => {
      const next = { ...newFilters };
      if (activeBrand) next.brand = activeBrand;
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

  const handleStatusChange = useCallback(
    async (id, status) => {
      try {
        await updateStatus({ id, status }).unwrap();
        toast.success(
          status === 'sent'
            ? 'Quotation sent successfully'
            : `Quotation marked ${status}`,
        );
        refetchStats();
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to update status');
      }
    },
    [updateStatus, refetchStats],
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteQuotation(id).unwrap();
        toast.success('Quotation deleted successfully');
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to delete quotation');
      } finally {
        setDeleteTarget(null);
      }
    },
    [deleteQuotation],
  );

  const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Quotations</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Create, send, and track client proposals.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Refresh quotations"
            onClick={() => { refetchQuotations(); refetchStats(); }}
            disabled={isFetching}
            className="p-2 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50"
            title="Refresh quotations"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={() => navigate('/quotations/new')}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Quotation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsLoading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
            <div key={card.key} className="bg-white rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-zinc-500">{card.label}</span>
              </div>
              <p className="text-xl font-bold text-zinc-900">{stats?.[card.key] ?? 0}</p>
            </div>
          ))}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-4">
        <div className="flex flex-wrap items-center gap-6">
          <IndianRupee className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-xs text-zinc-500">Quoted Value</p>
            <p className="text-lg font-bold text-zinc-900">{statsLoading ? '-' : formatCurrency(financials.totalValue)}</p>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <p className="text-xs text-zinc-500">Accepted Value</p>
            <p className="text-lg font-bold text-green-600">{statsLoading ? '-' : formatCurrency(financials.acceptedValue)}</p>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <p className="text-xs text-zinc-500">Total Budget</p>
            <p className="text-lg font-bold text-zinc-700">{statsLoading ? '-' : formatCurrency(financials.totalBudget)}</p>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <p className="text-xs text-zinc-500">Conversion Rate</p>
            <p className="text-lg font-bold text-indigo-600 inline-flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {statsLoading ? '-' : `${stats?.conversionRate ?? 0}%`}
            </p>
          </div>
        </div>
      </div>

      {!statsLoading && stats?.byBrand && Object.keys(stats.byBrand).length > 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quotations By Venture</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byBrand).map(([brand, count]) => (
              <div key={brand} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100">
                <span className="text-sm font-medium text-zinc-700">{BRAND_LABELS[brand] || brand}</span>
                <span className="text-sm font-bold text-primary-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {[{ value: '', label: 'All' }, ...LEAD_BRANDS].map((brand) => (
          <button
            key={brand.value || 'all'}
            onClick={() => handleBrandChange(brand.value)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeBrand === brand.value
                ? 'bg-primary-900 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {brand.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-4">
        <QuotationFilters onFilterChange={handleFilterChange} />
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} /></div>
        ) : quotations.length === 0 ? (
          <EmptyState
            title="No quotations yet"
            description="Create your first quotation to send a professional proposal."
            action={
              <Button onClick={() => navigate('/quotations/new')}>
                <Plus className="w-4 h-4 mr-1.5" /> Create Quotation
              </Button>
            }
          />
        ) : (
          <>
            <QuotationTable
              quotations={quotations}
              onDelete={setDeleteTarget}
              onStatusChange={handleStatusChange}
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
        onConfirm={() => handleDelete(deleteTarget)}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
