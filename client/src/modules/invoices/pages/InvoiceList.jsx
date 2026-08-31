import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, FileText, Send, CheckCircle, AlertTriangle, XCircle, IndianRupee, Clock } from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import toast from 'react-hot-toast';
import InvoiceTable from '../components/InvoiceTable';
import InvoiceFilters from '../components/InvoiceFilters';
import { useGetInvoicesQuery, useGetInvoiceStatsQuery, useUpdateInvoiceStatusMutation, useDeleteInvoiceMutation } from '../../../services/invoiceApi';
import { useSelector } from 'react-redux';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { StatCardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import { LEAD_BRANDS } from '../../../constants';

const statCards = [
  { key: 'total', label: 'Total Invoices', icon: FileText, color: 'text-blue-600 bg-blue-50' },
  { key: 'draft', label: 'Draft', icon: FileText, color: 'text-zinc-600 bg-zinc-50' },
  { key: 'sent', label: 'Sent', icon: Send, color: 'text-blue-600 bg-blue-50' },
  { key: 'partially_paid', label: 'Partially Paid', icon: Clock, color: 'text-indigo-600 bg-indigo-50' },
  { key: 'paid', label: 'Paid', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-zinc-400 bg-zinc-50' },
];

export default function InvoiceList() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role;

  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [activeBrand, setActiveBrand] = useState('');

  const { data: invoicesData, isLoading, isFetching, refetch: refetchInvoices } = useGetInvoicesQuery({ ...filters, page, limit: 10 });
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useGetInvoiceStatsQuery();
  const stats = statsData?.data || {};
  const [deleteInvoice] = useDeleteInvoiceMutation();
  const [updateStatus] = useUpdateInvoiceStatusMutation();

  const invoices = invoicesData?.data || [];
  const pagination = invoicesData?.pagination;
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

  const handleStatusChange = useCallback(
    async (id, status) => {
      try {
        await updateStatus({ id, status }).unwrap();
        toast.success(`Invoice ${status} successfully`);
      } catch (err) {
        toast.error(err?.data?.message || `Failed to update status`);
      }
    },
    [updateStatus],
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteInvoice(id).unwrap();
        toast.success('Invoice deleted successfully');
        setDeleteTarget(null);
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to delete invoice');
        setDeleteTarget(null);
      }
    },
    [deleteInvoice],
  );

  const confirmDelete = useCallback((id) => {
    setDeleteTarget(id);
  }, []);

  const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Invoices</h1>
        <div className="flex items-center gap-2">
          <button aria-label="Refresh invoices" onClick={() => { refetchInvoices(); refetchStats(); }}
            disabled={isFetching}
            className="p-2 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50"
            title="Refresh invoices"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={() => navigate('/invoices/new')}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {statsLoading
          ? Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
          <div key={card.key} className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-zinc-500">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-zinc-900">
              {statsLoading ? '-' : (stats?.[card.key] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-4">
        <div className="flex flex-wrap items-center gap-6">
          <IndianRupee className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-xs text-zinc-500">Revenue (Paid)</p>
            <p className="text-lg font-bold text-green-600">
              {statsLoading ? '-' : formatCurrency(stats?.revenue?.totalPaid)}
            </p>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <p className="text-xs text-zinc-500">Outstanding</p>
            <p className="text-lg font-bold text-orange-600">
              {statsLoading ? '-' : formatCurrency(stats?.revenue?.totalPending)}
            </p>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <p className="text-xs text-zinc-500">Total Invoiced</p>
            <p className="text-lg font-bold text-zinc-900">
              {statsLoading ? '-' : formatCurrency(stats?.revenue?.totalRevenue)}
            </p>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <p className="text-xs text-zinc-500">Collection Rate</p>
            <p className="text-lg font-bold text-zinc-900">
              {statsLoading
                ? '-'
                : stats?.revenue?.totalRevenue
                  ? `${Math.round((stats.revenue.totalPaid / stats.revenue.totalRevenue) * 100)}%`
                  : '0%'}
            </p>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <p className="text-xs text-zinc-500">Overdue Count</p>
            <p className="text-lg font-bold text-red-600">
              {statsLoading ? '-' : stats?.overdueCount ?? 0}
            </p>
          </div>
        </div>
        {!statsLoading && stats?.revenue?.totalRevenue > 0 && (
          <div className="mt-3 w-full bg-zinc-100 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min((stats.revenue.totalPaid / stats.revenue.totalRevenue) * 100, 100)}%` }}
            />
          </div>
        )}
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

      <div className="bg-white rounded-lg border border-zinc-200 p-4">
        <InvoiceFilters onFilterChange={handleFilterChange} />
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} /></div>
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Create your first invoice to get started."
            action={
              <Button onClick={() => navigate('/invoices/new')}>
                <Plus className="w-4 h-4 mr-1.5" /> Create Invoice
              </Button>
            }
          />
        ) : (
          <>
            <InvoiceTable
              invoices={invoices}
              onDelete={confirmDelete}
              onStatusChange={handleStatusChange}
              userRole={userRole}
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
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
