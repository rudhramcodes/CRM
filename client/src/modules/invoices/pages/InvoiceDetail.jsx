import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, XCircle, Trash2, Printer, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceForm from '../components/InvoiceForm';
import Modal from '../../../components/ui/Modal';
import {
  useGetInvoiceByIdQuery,
  useGetInvoiceHtmlQuery,
  useUpdateInvoiceMutation,
  useUpdateInvoiceStatusMutation,
  useDeleteInvoiceMutation,
  useResendInvoiceEmailMutation,
} from '../../../services/invoiceApi';
import { useGetClientsQuery } from '../../../services/clientApi';
import Button from '../../../components/ui/Button';
import Loader from '../../../components/ui/Loader';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useGetInvoiceByIdQuery(id);
  const [updateInvoice, { isLoading: isUpdating }] = useUpdateInvoiceMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateInvoiceStatusMutation();
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();
  const { data: clientsData } = useGetClientsQuery({ limit: 100 });

  const [resendEmail, { isLoading: isResending }] = useResendInvoiceEmailMutation();

  const [actionLoading, setActionLoading] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const invoice = data?.data?.invoice;
  const { data: invoiceHtml } = useGetInvoiceHtmlQuery(id, { skip: !id });
  const clients = clientsData?.data || [];

  const handleResend = async () => {
    try {
      await resendEmail(id).unwrap();
      toast.success('Invoice email sent to client');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send invoice email');
    }
  };

  const handleStatusChange = async (status) => {
    const confirmMessages = {
      sent: 'Send this invoice to the client? An email with invoice details will be sent.',
      paid: 'Mark this invoice as paid?',
      cancelled: 'Cancel this invoice?',
    };

    if (confirmMessages[status] && !window.confirm(confirmMessages[status])) return;

    setActionLoading(status);
    try {
      await updateStatus({ id, status }).unwrap();
      toast.success(`Invoice ${status} successfully`);
    } catch (err) {
      toast.error(err?.data?.message || `Failed to ${status} invoice`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteInvoice(id).unwrap();
      toast.success('Invoice deleted successfully');
      navigate('/invoices');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleEdit = async (formData) => {
    try {
      await updateInvoice({ id, ...formData }).unwrap();
      toast.success('Invoice updated successfully');
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

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <Loader />;
  if (!invoice) return <div className="text-zinc-500 py-8 text-center">Invoice not found</div>;

  const formatDateTime = (date) => (date ? new Date(date).toLocaleString('en-IN') : '-');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>

        <div className="flex items-center gap-2 print:hidden">
          {invoice.status === 'draft' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
                <Edit2 className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleStatusChange('sent')} loading={actionLoading === 'sent'}>
                <Send className="w-4 h-4 mr-1" /> Send Invoice
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} loading={isDeleting}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </>
          )}
          {invoice.status === 'sent' && (
            <Button variant="primary" size="sm" onClick={() => handleStatusChange('paid')} loading={actionLoading === 'paid'}>
              <CheckCircle className="w-4 h-4 mr-1" /> Mark as Paid
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button variant="secondary" size="sm" onClick={handleResend} loading={isResending}>
              <Send className="w-4 h-4 mr-1" /> Resend
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button variant="danger" size="sm" onClick={() => handleStatusChange('cancelled')} loading={actionLoading === 'cancelled'}>
              <XCircle className="w-4 h-4 mr-1" /> Cancel Invoice
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 print:border-none overflow-hidden">
        <div className="flex justify-end p-4 pb-0 print:hidden">
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        {invoiceHtml ? (
          <div className="p-8 print:p-0" dangerouslySetInnerHTML={{ __html: invoiceHtml }} />
        ) : (
          <div className="p-8 text-zinc-400 text-center text-sm">Loading preview...</div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-4 print:hidden">
        <h3 className="text-sm font-medium text-zinc-700 mb-3">Timeline</h3>
        <div className="space-y-2 text-sm text-zinc-500">
          <p>Created: {formatDateTime(invoice.createdAt)} by {invoice.createdBy?.name || 'N/A'}</p>
          {invoice.sentAt && <p>Sent: {formatDateTime(invoice.sentAt)}</p>}
          {invoice.paidAt && <p>Paid: {formatDateTime(invoice.paidAt)}</p>}
          {invoice.cancelledAt && <p>Cancelled: {formatDateTime(invoice.cancelledAt)}</p>}
        </div>
      </div>
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
    </div>
  );
}
