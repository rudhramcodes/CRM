import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Send, XCircle, Trash2, Printer, Edit2, Download, CheckCircle, CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceForm from '../components/InvoiceForm';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import {
  useGetInvoiceByIdQuery,
  useGetInvoiceHtmlQuery,
  useUpdateInvoiceMutation,
  useUpdateInvoiceStatusMutation,
  useDeleteInvoiceMutation,
  useResendInvoiceEmailMutation,
} from '../../../services/invoiceApi';
import { useGetClientsQuery } from '../../../services/clientApi';
import { API_BASE_URL } from '../../../constants';
import { useGetInvoicePaymentsQuery, useCreatePaymentMutation } from '../../../services/paymentApi';
import PaymentForm from '../../payments/components/PaymentForm';
import PaymentStatusBadge from '../../payments/components/PaymentStatusBadge';
import { PAYMENT_METHODS } from '../../../constants';
import Button from '../../../components/ui/Button';
import { DetailSkeleton } from '../../../components/ui/Skeleton';

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data, isLoading, refetch } = useGetInvoiceByIdQuery(id);
  const [updateInvoice, { isLoading: isUpdating }] = useUpdateInvoiceMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateInvoiceStatusMutation();
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();
  const { data: clientsData } = useGetClientsQuery({ limit: 100 });

  const { data: paymentsData, refetch: refetchPayments } = useGetInvoicePaymentsQuery(id, { skip: !id });
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentMutation();
  const invoicePayments = paymentsData?.data?.payments || [];

  const [resendEmail, { isLoading: isResending }] = useResendInvoiceEmailMutation();
  const [isDownloading, setIsDownloading] = useState(false);

  const [loadingAction, setLoadingAction] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });

  const invoice = data?.data?.invoice;
  const { data: invoiceHtml } = useGetInvoiceHtmlQuery(id, { skip: !id });
  const clients = clientsData?.data || [];

  useEffect(() => {
    if (searchParams.get('recordPayment') === '1') {
      setShowPaymentForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Handlers ---

  const performStatusChange = async (status) => {
    setLoadingAction(status);
    try {
      await updateStatus({ id, status }).unwrap();
      toast.success(`Invoice marked as ${status}`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || `Failed to ${status} invoice`);
    } finally {
      setLoadingAction(null);
    }
  };

  const confirmAndExecute = (title, message, label, variant, action) => {
    setConfirmDialog({ open: true, title, message, confirmLabel: label, variant, onConfirm: () => { setConfirmDialog({ open: false }); action(); } });
  };

  const handleSend = () => confirmAndExecute(
    'Send Invoice', 'Send this invoice to the client? An email with invoice details will be sent.',
    'Send', 'primary', () => performStatusChange('sent'),
  );

  const handleCancel = () => confirmAndExecute(
    'Cancel Invoice', 'Cancel this invoice? This cannot be undone.',
    'Cancel', 'danger', () => performStatusChange('cancelled'),
  );

  // Payment shortcut: creates a payment via POST /api/payments for the full balance
  // Invoice status auto-updates to partially_paid or paid via recalculateInvoicePayment
  const handleFullPayment = async () => {
    const amount = invoice.balanceDue;
    if (amount <= 0) { toast.error('No balance due'); return; }
    setLoadingAction('paid');
    try {
      await createPayment({
        invoice: id, amount, paymentMethod: 'bank_transfer',
        paymentDate: new Date().toISOString().split('T')[0], status: 'completed',
      }).unwrap();
      toast.success('Payment recorded successfully');
      refetch();
      refetchPayments();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to record payment');
    } finally {
      setLoadingAction(null);
    }
  };

  const confirmFullPayment = () => {
    const isPartial = invoice.status === 'partially_paid';
    confirmAndExecute(
      isPartial ? 'Collect Remaining Payment' : 'Mark as Paid',
      `${fmt(invoice.balanceDue)} will be recorded as payment and invoice will be updated.`,
      isPartial ? 'Collect & Close' : 'Confirm Payment',
      'primary', handleFullPayment,
    );
  };

  const handleRecordPayment = async (formData) => {
    try {
      await createPayment(formData).unwrap();
      toast.success('Payment recorded successfully');
      setShowPaymentForm(false);
      refetch();
      refetchPayments();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to record payment');
    }
  };

  const handleResend = async () => {
    try {
      await resendEmail(id).unwrap();
      toast.success('Invoice email resent');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to resend email');
    }
  };

  const confirmResend = () => confirmAndExecute(
    'Resend Invoice', 'Send this invoice again to the client email?',
    'Resend', 'primary', handleResend,
  );

  const handleDelete = async () => {
    try {
      await deleteInvoice(id).unwrap();
      toast.success('Invoice deleted');
      navigate('/invoices');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete invoice');
    }
  };

  const confirmDelete = () => confirmAndExecute(
    'Delete Invoice', 'Are you sure? This cannot be undone.',
    'Delete', 'danger', handleDelete,
  );

  const handleEdit = async (formData) => {
    try {
      await updateInvoice({ id, ...formData }).unwrap();
      toast.success('Invoice updated');
      setShowEditModal(false);
    } catch (err) {
      const msg = err?.data?.message || 'Failed to update invoice';
      const errors = err?.data?.errors;
      if (errors && Array.isArray(errors)) {
        toast.error(errors.map((e) => e.message).join('. '));
      } else {
        toast.error(msg);
      }
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${id}/pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoiceNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // --- Render helpers ---

  const methodMap = PAYMENT_METHODS.reduce((m, p) => { m[p.value] = p.label; return m; }, {});

  // --- Loading / Error ---

  if (isLoading) return <DetailSkeleton />;
  if (!invoice) return <div className="text-zinc-500 py-8 text-center">Invoice not found</div>;

  const canRecordPayment = ['sent', 'overdue', 'partially_paid'].includes(invoice.status);
  const isPaidOrCancelled = ['paid', 'cancelled'].includes(invoice.status);
  const paymentPct = invoice.total > 0 ? Math.round((Number(invoice.paidAmount || 0) / invoice.total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:mx-0 print:space-y-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>

        <div className="flex items-center gap-2">
          {/* Draft actions */}
          {invoice.status === 'draft' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
                <Edit2 className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button variant="primary" size="sm" onClick={handleSend} loading={loadingAction === 'sent'}>
                <Send className="w-4 h-4 mr-1" /> Send Invoice
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDelete} loading={isDeleting}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </>
          )}

          {/* Active invoice actions */}
          {canRecordPayment && (
            <>
              <Button variant="primary" size="sm" onClick={confirmFullPayment} loading={loadingAction === 'paid'}>
                <CheckCircle className="w-4 h-4 mr-1" />
                {invoice.status === 'partially_paid' ? `Collect Remaining (${fmt(invoice.balanceDue)})` : 'Mark as Paid'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowPaymentForm(true)}>
                <CreditCard className="w-4 h-4 mr-1" /> Record Payment
              </Button>
              <Button variant="secondary" size="sm" onClick={confirmResend} loading={isResending}>
                <Send className="w-4 h-4 mr-1" /> Resend
              </Button>
              <Button variant="danger" size="sm" onClick={handleCancel} loading={loadingAction === 'cancelled'}>
                <XCircle className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </>
          )}

          {/* Universal actions */}
          {!isPaidOrCancelled && invoice.status !== 'draft' && !canRecordPayment && (
            <Button variant="secondary" size="sm" onClick={confirmResend} loading={isResending}>
              <Send className="w-4 h-4 mr-1" /> Resend
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleDownloadPdf} loading={isDownloading}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* ── Invoice Preview ── */}
      <div className="bg-white rounded-lg border border-zinc-200 print:border-none print:rounded-none print:overflow-visible overflow-hidden">
        <div className="flex justify-end p-4 pb-0 print:hidden">
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        {invoiceHtml ? (
          <div className="p-8 print:p-0" dangerouslySetInnerHTML={{ __html: invoiceHtml }} />
        ) : (
          <div className="p-8 text-zinc-400 text-center text-sm">Loading preview...</div>
        )}
      </div>

      {/* ── Payment Summary ── */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 print:hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-700">Payments</h3>
          {canRecordPayment && (
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={confirmFullPayment} loading={loadingAction === 'paid'}>
                {invoice.status === 'partially_paid' ? `Collect Remaining (${fmt(invoice.balanceDue)})` : 'Mark as Paid'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowPaymentForm(true)}>
                Record Payment
              </Button>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-zinc-50 rounded-lg">
          <div>
            <p className="text-xs text-zinc-500">Total</p>
            <p className="text-lg font-bold text-zinc-900">{fmt(invoice.total)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Paid</p>
            <p className="text-lg font-bold text-green-600">{fmt(invoice.paidAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Balance Due</p>
            <p className={`text-lg font-bold ${invoice.balanceDue === 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {fmt(invoice.balanceDue)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {invoice.total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
              <span>Payment Progress</span>
              <span>{paymentPct}%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${invoice.balanceDue === 0 ? 'bg-green-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(paymentPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Payments list */}
        {invoicePayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 px-2 text-xs text-zinc-500 font-medium">Date</th>
                  <th className="text-left py-2 px-2 text-xs text-zinc-500 font-medium">Amount</th>
                  <th className="text-left py-2 px-2 text-xs text-zinc-500 font-medium">Method</th>
                  <th className="text-left py-2 px-2 text-xs text-zinc-500 font-medium">Ref</th>
                  <th className="text-left py-2 px-2 text-xs text-zinc-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoicePayments.map((p) => (
                  <tr
                    key={p._id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
                    onClick={() => navigate(`/payments/${p._id}`)}
                  >
                    <td className="py-2 px-2">{fmtDate(p.paymentDate)}</td>
                    <td className="py-2 px-2 font-medium text-green-600">{fmt(p.amount)}</td>
                    <td className="py-2 px-2 text-zinc-500">{methodMap[p.paymentMethod] || p.paymentMethod}</td>
                    <td className="py-2 px-2 text-zinc-500">{p.referenceNo || '-'}</td>
                    <td className="py-2 px-2"><PaymentStatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 text-center py-4">No payments recorded yet</p>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 print:hidden">
        <h3 className="text-sm font-medium text-zinc-700 mb-3">Timeline</h3>
        <div className="space-y-2 text-sm text-zinc-500">
          <p>Created: {new Date(invoice.createdAt).toLocaleString('en-IN')} by {invoice.createdBy?.name || 'N/A'}</p>
          {invoice.sentAt && <p>Sent: {new Date(invoice.sentAt).toLocaleString('en-IN')}</p>}
          {invoice.paidAt && <p>Paid: {new Date(invoice.paidAt).toLocaleString('en-IN')}</p>}
          {invoice.cancelledAt && <p>Cancelled: {new Date(invoice.cancelledAt).toLocaleString('en-IN')}</p>}
          {invoice.balanceDue > 0 && invoice.paidAmount > 0 && (
            <p className="text-indigo-600">Partially Paid — {fmt(invoice.paidAmount)} collected</p>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showPaymentForm && (
        <PaymentForm
          invoiceId={id}
          invoiceNumber={invoice.invoiceNumber}
          onSubmit={handleRecordPayment}
          onClose={() => setShowPaymentForm(false)}
        />
      )}

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Invoice" size="xl">
        <InvoiceForm
          clients={clients}
          initialData={invoice}
          submitLabel="Update Invoice"
          onSubmit={handleEdit}
          isSubmitting={isUpdating}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
