import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, XCircle, Trash2, Printer, Download, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceForm from '../components/InvoiceForm';
import Modal from '../../../components/ui/Modal';
import {
  useGetInvoiceByIdQuery,
  useUpdateInvoiceMutation,
  useUpdateInvoiceStatusMutation,
  useDeleteInvoiceMutation,
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

  const [actionLoading, setActionLoading] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const invoice = data?.data?.invoice;
  const client = invoice?.client;
  const clients = clientsData?.data || [];

  const handleStatusChange = async (status) => {
    const confirmMessages = {
      sent: 'Mark this invoice as sent? The client will be notified.',
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

  const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;
  const formatDate = (date) => (date ? new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '-');
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
            <Button variant="danger" size="sm" onClick={() => handleStatusChange('cancelled')} loading={actionLoading === 'cancelled'}>
              <XCircle className="w-4 h-4 mr-1" /> Cancel Invoice
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-8 print:border-none print:p-0">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">INVOICE</h1>
            <p className="text-lg text-zinc-500 mt-1">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right print:hidden">
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-medium text-zinc-500 mb-1">Bill To</h3>
            <p className="font-semibold text-zinc-900">{client?.companyName}</p>
            <p className="text-sm text-zinc-600">{client?.contactPerson}</p>
            <p className="text-sm text-zinc-600">{client?.email}</p>
            {client?.gstNumber && <p className="text-sm text-zinc-600">GST: {client.gstNumber}</p>}
            {invoice.billingAddress?.street && (
              <p className="text-sm text-zinc-600 mt-1">
                {invoice.billingAddress.street}
                {invoice.billingAddress.city ? `, ${invoice.billingAddress.city}` : ''}
                {invoice.billingAddress.state ? `, ${invoice.billingAddress.state}` : ''}
                {invoice.billingAddress.pincode ? ` - ${invoice.billingAddress.pincode}` : ''}
              </p>
            )}
            <p className="text-xs text-zinc-400 mt-1">Client ID: {client?.clientId}</p>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <p className="text-sm"><span className="text-zinc-500">Issue Date:</span> <span className="font-medium">{formatDate(invoice.issueDate)}</span></p>
              <p className="text-sm"><span className="text-zinc-500">Due Date:</span> <span className="font-medium">{formatDate(invoice.dueDate)}</span></p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="text-left py-3 text-sm font-medium text-zinc-500">#</th>
              <th className="text-left py-3 text-sm font-medium text-zinc-500">Description</th>
              <th className="text-right py-3 text-sm font-medium text-zinc-500">Qty</th>
              <th className="text-right py-3 text-sm font-medium text-zinc-500">Rate</th>
              <th className="text-right py-3 text-sm font-medium text-zinc-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, index) => (
              <tr key={index} className="border-b border-zinc-100">
                <td className="py-3 text-sm text-zinc-500">{index + 1}</td>
                <td className="py-3 text-sm text-zinc-900">{item.description}</td>
                <td className="py-3 text-sm text-right text-zinc-900">{item.quantity}</td>
                <td className="py-3 text-sm text-right text-zinc-900">{formatCurrency(item.unitPrice)}</td>
                <td className="py-3 text-sm text-right font-medium text-zinc-900">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">GST ({invoice.taxRate}%)</span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            {invoice.discountPercent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Discount ({invoice.discountPercent}%)</span>
                <span className="text-red-600">-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <hr className="border-zinc-200" />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid</span>
                  <span>-{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-orange-600">
                  <span>Balance Due</span>
                  <span>{formatCurrency(invoice.balanceDue)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-zinc-500 mb-1">Notes</h4>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
        {invoice.termsConditions && (
          <div>
            <h4 className="text-sm font-medium text-zinc-500 mb-1">Terms & Conditions</h4>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{invoice.termsConditions}</p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-zinc-200 text-center text-xs text-zinc-400">
          <p>Rudhram CRM · Generated on {formatDate(invoice.createdAt)}</p>
        </div>
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
