import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Printer, Edit2, Download, CheckCircle, XCircle, Clock, Trash2, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import QuotationStatusBadge from '../components/QuotationStatusBadge';
import QuotationForm from '../components/QuotationForm';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Button from '../../../components/ui/Button';
import { DetailSkeleton } from '../../../components/ui/Skeleton';
import {
  useGetQuotationByIdQuery,
  useGetQuotationHtmlQuery,
  useUpdateQuotationMutation,
  useUpdateQuotationStatusMutation,
  useDeleteQuotationMutation,
  useResendQuotationEmailMutation,
} from '../../../services/quotationApi';
import { useGetClientsQuery } from '../../../services/clientApi';
import { API_BASE_URL, BRANDS } from '../../../constants';

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

const BRAND_LABELS = BRANDS.reduce((acc, b) => {
  acc[b.value] = b.label;
  return acc;
}, {});

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useGetQuotationByIdQuery(id);
  const { data: quotationHtml } = useGetQuotationHtmlQuery(id, { skip: !id });
  const { data: clientsData } = useGetClientsQuery({ limit: 100 });
  const [updateQuotation, { isLoading: isUpdating }] = useUpdateQuotationMutation();
  const [updateStatus] = useUpdateQuotationStatusMutation();
  const [deleteQuotation, { isLoading: isDeleting }] = useDeleteQuotationMutation();
  const [resendEmail, { isLoading: isResending }] = useResendQuotationEmailMutation();

  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const iframeRef = useRef(null);

  const quotation = data?.data?.quotation;
  const clients = clientsData?.data || [];

  const confirmAndExecute = (title, message, label, variant, action) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      confirmLabel: label,
      variant,
      onConfirm: () => {
        setConfirmDialog({ open: false });
        action();
      },
    });
  };

  const performStatusChange = async (status) => {
    setLoadingAction(status);
    try {
      await updateStatus({ id, status }).unwrap();
      toast.success(
        status === 'sent'
          ? 'Quotation sent successfully'
          : `Quotation marked ${status}`,
      );
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || `Failed to mark quotation ${status}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSend = () => confirmAndExecute(
    'Send Quotation',
    'Send this quotation to the client? An email with the PDF will be sent.',
    'Send',
    'primary',
    () => performStatusChange('sent'),
  );

  const handleAccept = () => confirmAndExecute(
    'Accept Quotation',
    'Mark this quotation as accepted?',
    'Accept',
    'primary',
    () => performStatusChange('accepted'),
  );

  const handleReject = () => confirmAndExecute(
    'Reject Quotation',
    'Mark this quotation as rejected?',
    'Reject',
    'danger',
    () => performStatusChange('rejected'),
  );

  const handleExpire = () => confirmAndExecute(
    'Expire Quotation',
    'Mark this quotation as expired?',
    'Expire',
    'danger',
    () => performStatusChange('expired'),
  );

  const handleResend = async () => {
    try {
      await resendEmail(id).unwrap();
      toast.success('Quotation email resent');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to resend email');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteQuotation(id).unwrap();
      toast.success('Quotation deleted');
      navigate('/quotations');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete quotation');
    }
  };

  const handleEdit = async (formData) => {
    try {
      await updateQuotation({ id, ...formData }).unwrap();
      toast.success('Quotation updated');
      setShowEditModal(false);
    } catch (err) {
      const errors = err?.data?.errors;
      if (errors && Array.isArray(errors)) {
        toast.error(errors.map((e) => e.message).join('. '));
      } else {
        toast.error(err?.data?.message || 'Failed to update quotation');
      }
    }
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/quotations/${id}/pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotation-${quotation?.quotationNumber || id}.pdf`;
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

  if (isLoading) return <DetailSkeleton />;
  if (!quotation) return <div className="text-zinc-500 py-8 text-center">Quotation not found</div>;

  const canEdit = quotation.status === 'draft';
  const canSend = quotation.status === 'draft';
  const canDecide = ['draft', 'sent'].includes(quotation.status);
  const canExpire = quotation.status === 'sent';

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:max-w-none print:mx-0 print:space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={() => navigate('/quotations')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quotations
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
          {canSend && (
            <Button variant="primary" size="sm" onClick={handleSend} loading={loadingAction === 'sent'}>
              <Send className="w-4 h-4 mr-1" /> Send Quotation
            </Button>
          )}
          {canDecide && (
            <Button variant="primary" size="sm" onClick={handleAccept} loading={loadingAction === 'accepted'}>
              <CheckCircle className="w-4 h-4 mr-1" /> Accept
            </Button>
          )}
          {canDecide && (
            <Button variant="danger" size="sm" onClick={handleReject} loading={loadingAction === 'rejected'}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
          )}
          {canExpire && (
            <Button variant="secondary" size="sm" onClick={handleExpire} loading={loadingAction === 'expired'}>
              <Clock className="w-4 h-4 mr-1" /> Expire
            </Button>
          )}
          {quotation.status === 'sent' && (
            <Button variant="secondary" size="sm" onClick={handleResend} loading={isResending}>
              <RefreshCw className="w-4 h-4 mr-1" /> Resend
            </Button>
          )}
          {canEdit && (
            <Button variant="danger" size="sm" onClick={() => confirmAndExecute(
              'Delete Quotation',
              'Are you sure? This cannot be undone.',
              'Delete',
              'danger',
              handleDelete,
            )} loading={isDeleting}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
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

      <div className="bg-white rounded-lg border border-zinc-200 print:border-none print:rounded-none print:overflow-visible overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-0 print:hidden">
          <div className="flex items-center gap-3">
            <QuotationStatusBadge status={quotation.status} />
            {quotation.client?.brand && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-xs font-medium text-zinc-700">
                {BRAND_LABELS[quotation.client.brand] || quotation.client.brand}
              </span>
            )}
            {quotation.status === 'accepted' && (
              <span className="text-xs font-medium text-green-700">Accepted on {fmtDate(quotation.acceptedAt)}</span>
            )}
          </div>
          <span className="text-xs text-zinc-400">3-page template · cover letter, scope, summary</span>
        </div>

        {quotationHtml ? (
          <div className="p-4 sm:p-6 flex justify-center bg-zinc-100/50 print:p-0">
            <iframe
              ref={iframeRef}
              srcDoc={quotationHtml}
              title={`Quotation ${quotation.quotationNumber}`}
              className="w-full max-w-[850px] border-0 rounded-lg shadow-sm bg-transparent"
              style={{ minHeight: '1150px' }}
              onLoad={(e) => {
                try {
                  const iframe = e.target;
                  const doc = iframe?.contentWindow?.document;
                  const height = Math.max(
                    doc?.body?.scrollHeight || 0,
                    doc?.documentElement?.scrollHeight || 0,
                    1130,
                  );
                  iframe.style.height = `${height + 25}px`;
                } catch {
                  // Keep the default height.
                }
              }}
            />
          </div>
        ) : (
          <div className="p-8 text-zinc-400 text-center text-sm">Loading preview...</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">
        <div className="lg:col-span-2 bg-white rounded-lg border border-zinc-200 p-4">
          <h3 className="text-sm font-medium text-zinc-700 mb-4">Quotation Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-zinc-50 rounded-lg">
            <div>
              <p className="text-xs text-zinc-500">Client Budget</p>
              <p className="text-lg font-bold text-zinc-700">{fmt(quotation.budget)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Subtotal</p>
              <p className="text-lg font-bold text-zinc-900">{fmt(quotation.price)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">GST ({quotation.taxRate}%)</p>
              <p className="text-lg font-bold text-zinc-900">{fmt(quotation.taxAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-lg font-bold text-indigo-700">{fmt(quotation.total)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1.5">
              <p><span className="text-zinc-500">Client Id:</span> <span className="font-medium">{quotation.client?.clientId || '-'}</span></p>
              <p><span className="text-zinc-500">Project Id:</span> <span className="font-medium">{quotation.project?.projectCode || '-'}</span></p>
              <p><span className="text-zinc-500">Quotation No:</span> <span className="font-medium">{quotation.quotationNumber}</span></p>
            </div>
            <div className="space-y-1.5">
              <p><span className="text-zinc-500">Issue Date:</span> <span className="font-medium">{fmtDate(quotation.issueDate)}</span></p>
              <p><span className="text-zinc-500">Valid Until:</span> <span className="font-medium">{fmtDate(quotation.validUntil)}</span></p>
              <p><span className="text-zinc-500">Prepared By:</span> <span className="font-medium">{quotation.createdBy?.name || 'N/A'}</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <h3 className="text-sm font-medium text-zinc-700 mb-3">Timeline</h3>
          <div className="space-y-2 text-sm text-zinc-500">
            <p>Created: {new Date(quotation.createdAt).toLocaleString('en-IN')}</p>
            {quotation.sentAt && <p>Sent: {new Date(quotation.sentAt).toLocaleString('en-IN')}</p>}
            {quotation.acceptedAt && <p className="text-green-600">Accepted: {new Date(quotation.acceptedAt).toLocaleString('en-IN')}</p>}
            {quotation.rejectedAt && <p className="text-red-600">Rejected: {new Date(quotation.rejectedAt).toLocaleString('en-IN')}</p>}
            {quotation.expiredAt && <p className="text-amber-600">Expired: {new Date(quotation.expiredAt).toLocaleString('en-IN')}</p>}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 text-xs text-zinc-500 space-y-1">
            <p><span className="font-medium text-zinc-700">Scope:</span> {quotation.scopeTitle || '-'}</p>
            <p><span className="font-medium text-zinc-700">Deliverables:</span> {quotation.deliverables || '-'}</p>
          </div>
        </div>
      </div>

      {showEditModal && (
        <Modal open onClose={() => setShowEditModal(false)} title="Edit Quotation" size="xl">
          <QuotationForm
            clients={clients}
            onSubmit={handleEdit}
            isSubmitting={isUpdating}
            onCancel={() => setShowEditModal(false)}
            initialData={quotation}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

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
