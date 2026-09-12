import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  X,
  CreditCard,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import CredOdometer from '../components/CredOdometer';
import { useGetInvoicesQuery } from '../../../services/invoiceApi';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import toast from 'react-hot-toast';

export default function PortalInvoices() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isLoading } = useGetInvoicesQuery({ limit: 50 });
  const invoices = Array.isArray(data?.data)
    ? data.data
    : (data?.data?.invoices || data?.invoices || []);

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return inv.status === 'sent' || inv.status === 'partially_paid' || inv.status === 'draft';
    return inv.status === statusFilter;
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total ?? inv.totalAmount ?? 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => {
    if (inv.status === 'paid' || inv.status === 'cancelled') return sum;
    const invTotal = inv.total ?? inv.totalAmount ?? 0;
    const remaining = inv.balanceDue != null ? inv.balanceDue : (invTotal - (inv.paidAmount || 0));
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      setDownloadingId(invoiceId);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download invoice PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded');
    } catch (err) {
      toast.error(err.message || 'Error downloading invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Paid
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Partially Paid
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Overdue
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <Clock className="w-3.5 h-3.5 text-zinc-500" /> Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-primary-900" />
            <span className="text-xs font-semibold text-primary-900 uppercase tracking-wider">
              Billing & Ledger
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 font-heading">
            Invoices & Statements
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Review issued invoices, payment history, and download official PDF tax invoices.
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Total Invoiced</span>
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 font-heading">
            {isLoading ? <Skeleton className="h-8 w-28 bg-zinc-200" /> : <CredOdometer value={totalBilled} prefix="₹" />}
          </div>
          <p className="text-xs text-zinc-500 mt-2">Cumulative value of all invoiced accounts</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Total Paid</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-heading">
            {isLoading ? <Skeleton className="h-8 w-28 bg-zinc-200" /> : <CredOdometer value={totalPaid} prefix="₹" />}
          </div>
          <p className="text-xs text-zinc-500 mt-2">Cleared payments received</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Outstanding Due</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-700 font-heading">
            {isLoading ? <Skeleton className="h-8 w-28 bg-zinc-200" /> : <CredOdometer value={totalOutstanding} prefix="₹" />}
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {totalOutstanding > 0 ? 'Pending invoice payments' : 'All accounts fully settled'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 overflow-x-auto">
        {[
          { key: 'all', label: 'All Invoices' },
          { key: 'pending', label: 'Pending' },
          { key: 'paid', label: 'Settled' },
          { key: 'overdue', label: 'Overdue' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              statusFilter === tab.key
                ? 'bg-primary-900 text-white font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoice Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-100 border border-zinc-200 animate-pulse" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-16 text-center border border-zinc-200 rounded-2xl bg-white">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-700">No invoices found</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {statusFilter === 'all'
              ? 'Invoices generated for your projects will appear here.'
              : `No invoices currently matching the "${statusFilter}" filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs transition-all duration-150"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0 text-primary-900">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-sm text-zinc-900">{invoice.invoiceNumber}</span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Issued: {formatDate(invoice.issueDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      Due: {formatDate(invoice.dueDate)}
                    </span>
                    {invoice.project?.title && (
                      <span className="text-zinc-600 font-medium truncate max-w-[220px]">
                        Project: {invoice.project.title}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">TOTAL</span>
                  <span className="font-heading font-bold text-lg text-zinc-900">
                    {formatCurrency(invoice.total ?? invoice.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(invoice)}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                  >
                    Details
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={downloadingId === invoice._id}
                    onClick={() => handleDownloadPdf(invoice._id, invoice.invoiceNumber)}
                    className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 text-zinc-900 shadow-xl overflow-y-auto max-h-[90vh] space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Invoice Details</span>
                  <h3 className="text-xl font-bold font-heading text-zinc-900 mt-0.5">{selectedInvoice.invoiceNumber}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Issue Date</span>
                  <p className="text-xs font-semibold text-zinc-800 mt-1">{formatDate(selectedInvoice.issueDate)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Payment Due</span>
                  <p className="text-xs font-semibold text-zinc-800 mt-1">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3">Line Items</h4>
                <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200">
                  <div className="grid grid-cols-12 bg-zinc-50 px-4 py-2.5 text-[11px] font-mono text-zinc-500">
                    <span className="col-span-6">Description</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-2 text-right">Price</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>
                  {selectedInvoice.items?.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 px-4 py-3 text-xs text-zinc-700 items-center">
                      <span className="col-span-6 font-medium text-zinc-900">{item.description}</span>
                      <span className="col-span-2 text-center text-zinc-500">{item.quantity}</span>
                      <span className="col-span-2 text-right text-zinc-500">{formatCurrency(item.unitPrice)}</span>
                      <span className="col-span-2 text-right font-semibold text-zinc-900">
                        {formatCurrency((item.quantity || 1) * (item.unitPrice || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.subtotal ?? selectedInvoice.total ?? selectedInvoice.totalAmount)}</span>
                </div>
                {selectedInvoice.discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({selectedInvoice.discountPercent}%)</span>
                    <span>-{formatCurrency(selectedInvoice.discountAmount || 0)}</span>
                  </div>
                )}
                {selectedInvoice.taxRate > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>Tax / GST ({selectedInvoice.taxRate}%)</span>
                    <span>+{formatCurrency(selectedInvoice.taxAmount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-zinc-900 pt-2 border-t border-zinc-200">
                  <span>Total Amount</span>
                  <span className="font-heading text-base text-primary-900">
                    {formatCurrency(
                      selectedInvoice.total ??
                      selectedInvoice.totalAmount ??
                      ((selectedInvoice.subtotal || 0) + (selectedInvoice.taxAmount || 0) - (selectedInvoice.discountAmount || 0))
                    )}
                  </span>
                </div>
                {selectedInvoice.paidAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700 font-medium pt-1">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(selectedInvoice.paidAmount)}</span>
                  </div>
                )}
                {selectedInvoice.balanceDue != null && selectedInvoice.status !== 'paid' && (
                  <div className="flex justify-between text-xs text-amber-700 font-medium">
                    <span>Balance Due</span>
                    <span>{formatCurrency(selectedInvoice.balanceDue)}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  loading={downloadingId === selectedInvoice._id}
                  onClick={() => handleDownloadPdf(selectedInvoice._id, selectedInvoice.invoiceNumber)}
                >
                  <Download className="w-4 h-4" /> Download Official PDF
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
