import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, ExternalLink, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import PaymentForm from '../components/PaymentForm';
import InvoiceStatusBadge from '../../invoices/components/InvoiceStatusBadge';
import {
  useGetPaymentByIdQuery,
  useUpdatePaymentMutation,
  useDeletePaymentMutation,
} from '../../../services/paymentApi';
import { PAYMENT_METHODS } from '../../../constants';
import { useSelector } from 'react-redux';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { DetailSkeleton } from '../../../components/ui/Skeleton';

const methodMap = PAYMENT_METHODS.reduce((map, m) => {
  map[m.value] = m.label;
  return map;
}, {});

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function PaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const canDelete = user?.role === 'super_admin';

  const { data, isLoading } = useGetPaymentByIdQuery(id);
  const [updatePayment] = useUpdatePaymentMutation();
  const [deletePayment] = useDeletePaymentMutation();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const payment = data?.data?.payment;
  const inv = payment?.invoice;

  const handleUpdate = async (formData) => {
    await updatePayment({ id, ...formData }).unwrap();
    toast.success('Payment updated successfully');
    setShowEditModal(false);
  };

  const handleDelete = async () => {
    try {
      await deletePayment(id).unwrap();
      toast.success('Payment deleted successfully');
      navigate('/payments');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete payment');
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (!payment) return <p className="text-zinc-500 p-6">Payment not found.</p>;

  const paidPercent = inv ? Math.round((payment.amount / inv.total) * 100) : 0;
  const remainingAfter = inv ? inv.total - payment.amount : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/payments')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payments
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit2 className="w-4 h-4 mr-1" /> Edit
          </Button>
          {canDelete && (
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Payment amount card */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-zinc-900">Payment Details</h1>
            <PaymentStatusBadge status={payment.status} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Amount Paid</label>
              <p className="text-2xl font-bold text-green-600 mt-1">{fmt(payment.amount)}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Payment Method</label>
              <p className="text-sm font-medium text-zinc-900 mt-1">{methodMap[payment.paymentMethod] || payment.paymentMethod}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Payment Date</label>
              <p className="text-sm font-medium text-zinc-900 mt-1">
                {new Date(payment.paymentDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Reference No.</label>
              <p className="text-sm font-medium text-zinc-900 mt-1">{payment.referenceNo || '-'}</p>
            </div>
          </div>
        </div>

        {/* Invoice summary */}
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Invoice Summary</h2>
          {inv ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Invoice</span>
                <Link
                  to={`/invoices/${inv._id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {inv.invoiceNumber} <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Invoice Total</span>
                <span className="text-sm font-semibold text-zinc-900">{fmt(inv.total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Invoice Status</span>
                <InvoiceStatusBadge status={inv.status} />
              </div>

              {/* Progress bar */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Payment Progress</span>
                  <span>{paidPercent}% of invoice</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(paidPercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Paid</p>
                  <p className="text-lg font-bold text-green-700">{fmt(payment.amount)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-orange-700 font-medium">Remaining</p>
                  <p className="text-lg font-bold text-orange-700">{remainingAfter > 0 ? fmt(remainingAfter) : 'Fully Paid'}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Invoice deleted</p>
          )}
        </div>

        {/* Client info */}
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Client</h2>
          {payment.client ? (
            <div>
              <p className="text-sm font-medium text-zinc-900">{payment.client.companyName}</p>
              <p className="text-xs text-zinc-500">{payment.client.contactPerson} • {payment.client.email}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Client deleted</p>
          )}
        </div>

        {/* Notes */}
        <div className="p-6">
          <h2 className="text-sm font-semibold text-zinc-700 mb-2">Notes</h2>
          <p className="text-sm text-zinc-600">{payment.notes || 'No notes'}</p>
          {payment.createdBy && (
            <p className="text-xs text-zinc-400 mt-4">
              Recorded by {payment.createdBy.name}
            </p>
          )}
        </div>
      </div>

      {showEditModal && (
        <PaymentForm
          initial={payment}
          onSubmit={handleUpdate}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? The invoice balance will be recalculated."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
