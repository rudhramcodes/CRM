import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, ExternalLink, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import PaymentForm from '../components/PaymentForm';
import {
  useGetPaymentByIdQuery,
  useUpdatePaymentMutation,
  useDeletePaymentMutation,
  useLazyGetPaymentReceiptQuery,
  useGetInvoicePaymentsQuery,
} from '../../../services/paymentApi';
import { PAYMENT_METHODS, PAYMENT_TYPES } from '../../../constants';
import { useSelector } from 'react-redux';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { DetailSkeleton } from '../../../components/ui/Skeleton';

const typeMap = PAYMENT_TYPES.reduce((map, type) => { map[type.value] = type.label; return map; }, {});

const methodMap = PAYMENT_METHODS.reduce((map, m) => {
  map[m.value] = m.label;
  return map;
}, {});

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtAmt = (amt, status) => status === 'refunded' ? `-${fmt(amt)}` : fmt(amt);

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
  const [getReceipt, { isFetching: isDownloading }] = useLazyGetPaymentReceiptQuery();

  const payment = data?.data?.payment;
  const inv = payment?.invoice;
  const invoiceId = inv?._id;
  const { data: allPaymentsData } = useGetInvoicePaymentsQuery(invoiceId, { skip: !invoiceId });
  const allPayments = allPaymentsData?.data?.payments || [];
  const otherPayments = allPayments.filter((p) => p._id !== payment?._id);

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const handleUpdate = async (formData) => {
    await updatePayment({ id, ...formData }).unwrap();
    toast.success('Payment updated successfully');
    setShowEditModal(false);
  };

  const handleDownloadReceipt = async () => {
    try {
      const blob = await getReceipt(id).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${id.slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download receipt');
    }
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
          <Button variant="primary" size="sm" className="bg-[#B3712D] hover:bg-[#8e5924] text-white shadow-sm" onClick={handleDownloadReceipt} loading={isDownloading}>
            <Download className="w-4 h-4 mr-1" /> Receipt
          </Button>
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
      <div className="bg-white rounded-xl border border-[#DCC19D] border-t-4 border-t-[#B3712D] shadow-sm">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading text-xl font-bold text-[#3A2415]">Payment Details</h1>
            <PaymentStatusBadge status={payment.status} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Receipt No.</label>
              <p className="text-sm font-semibold text-zinc-900 mt-1">{payment.receiptNumber || `RCT-${payment._id?.slice(-8).toUpperCase()}`}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Payment Purpose</label>
              <p className="mt-1 inline-flex rounded-full border border-[#DCC19D] bg-[#F6F0DF] px-2.5 py-1 text-xs font-semibold text-[#3A2415]">{typeMap[payment.paymentType] || 'Payment'}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">{payment.status === 'refunded' ? 'Refund Amount' : 'Amount Paid'}</label>
              <p className={`text-2xl font-bold mt-1 ${payment.status === 'refunded' ? 'text-red-600' : 'text-green-600'}`}>{fmtAmt(payment.amount, payment.status)}</p>
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
          <h2 className="font-heading text-sm font-semibold text-[#3A2415] mb-3">Invoice Summary</h2>
          {inv ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <span className="text-sm text-zinc-500">Invoice</span>
                <Link
                  to={`/invoices/${inv._id}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {inv.invoiceNumber} <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="bg-zinc-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    This Payment
                    <span className="text-zinc-400 ml-1 font-normal">
                      · {fmtDate(payment.paymentDate)}
                    </span>
                  </span>
                  <span className={`font-semibold ${payment.status === 'refunded' ? 'text-red-600' : 'text-green-600'}`}>{fmtAmt(payment.amount, payment.status)}</span>
                </div>
                {otherPayments.map((p) => (
                  <div key={p._id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">
                      Other Payment
                      <span className="text-zinc-400 ml-1 font-normal">
                        · {fmtDate(p.paymentDate)}
                      </span>
                    </span>
                    <span className={`font-medium ${p.status === 'refunded' ? 'text-red-600' : 'text-zinc-700'}`}>{fmtAmt(p.amount, p.status)}</span>
                  </div>
                ))}
                <div className="border-t border-zinc-200 pt-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700">Total Paid</span>
                  <span className="text-base font-bold text-green-700">{fmt(inv.paidAmount)}</span>
                </div>
              </div>

              <div className={`flex items-center justify-between px-1 ${inv.balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                <span className="text-xs font-medium uppercase tracking-wide">{inv.balanceDue > 0 ? 'Balance Due' : 'Status'}</span>
                <span className={`text-sm font-bold ${inv.balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {inv.balanceDue > 0 ? fmt(inv.balanceDue) : 'Settled'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Invoice deleted</p>
          )}
        </div>

        {/* Client info */}
        <div className="p-6 border-b border-zinc-100">
          <h2 className="font-heading text-sm font-semibold text-[#3A2415] mb-3">Client</h2>
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
