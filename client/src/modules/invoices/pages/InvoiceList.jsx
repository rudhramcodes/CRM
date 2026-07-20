import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, FileText, Send, CheckCircle, AlertTriangle, XCircle, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceTable from '../components/InvoiceTable';
import InvoiceFilters from '../components/InvoiceFilters';
import { useGetInvoicesQuery, useGetInvoiceStatsQuery, useDeleteInvoiceMutation } from '../../../services/invoiceApi';
import { useSelector } from 'react-redux';
import Button from '../../../components/ui/Button';
import Loader from '../../../components/ui/Loader';
import EmptyState from '../../../components/ui/EmptyState';

const statCards = [
  { key: 'total', label: 'Total Invoices', icon: FileText, color: 'text-blue-600 bg-blue-50' },
  { key: 'draft', label: 'Draft', icon: FileText, color: 'text-zinc-600 bg-zinc-50' },
  { key: 'sent', label: 'Sent', icon: Send, color: 'text-blue-600 bg-blue-50' },
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

  const { data: invoicesData, isLoading, isFetching } = useGetInvoicesQuery({ ...filters, page, limit: 10 });
  const { data: stats, isLoading: statsLoading } = useGetInvoiceStatsQuery();
  const [deleteInvoice] = useDeleteInvoiceMutation();

  const invoices = invoicesData?.data || [];
  const pagination = invoicesData?.pagination;

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm('Are you sure you want to delete this invoice?')) return;
      try {
        await deleteInvoice(id).unwrap();
        toast.success('Invoice deleted successfully');
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to delete invoice');
      }
    },
    [deleteInvoice],
  );

  const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Invoices</h1>
        <Button onClick={() => navigate('/invoices/new')}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
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

      <div className="bg-white rounded-lg border border-zinc-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <IndianRupee className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-xs text-zinc-500">Revenue (Paid)</p>
            <p className="text-lg font-bold text-green-600">
              {statsLoading ? '-' : formatCurrency(stats?.revenue?.totalPaid)}
            </p>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <p className="text-xs text-zinc-500">Pending</p>
            <p className="text-lg font-bold text-orange-600">
              {statsLoading ? '-' : formatCurrency(stats?.revenue?.totalPending)}
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
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-4">
        <InvoiceFilters onFilterChange={handleFilterChange} />
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        {isLoading ? (
          <Loader />
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
              onDelete={handleDelete}
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
    </div>
  );
}
