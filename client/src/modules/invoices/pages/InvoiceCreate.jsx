import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceForm from '../components/InvoiceForm';
import { useCreateInvoiceMutation, useGetInvoicesQuery } from '../../../services/invoiceApi';
import { useGetClientsQuery } from '../../../services/clientApi';
import { useGetQuotationByIdQuery } from '../../../services/quotationApi';
import { quotationToInvoiceDraft } from '../quotationToInvoice';
import { selectInvoiceSource } from '../invoiceSource';
import { useGetInvoiceSourceRevisionQuery } from '../invoiceSourceApi';

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quotationId = searchParams.get('quotationId');
  const revisionQuery = searchParams.get('revision');
  const [createInvoice, { isLoading }] = useCreateInvoiceMutation();
  const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery({ limit: 100 });
  const { currentData: quotationData, isFetching: quotationLoading, isError: quotationError } = useGetQuotationByIdQuery(
    quotationId,
    { skip: !quotationId },
  );
  const { currentData: existingData, isFetching: existingLoading, refetch: refetchExisting } = useGetInvoicesQuery(
    { sourceQuotation: quotationId, limit: 1 },
    { skip: !quotationId },
  );
  const clients = clientsData?.data || [];
  const quotation = quotationData?.data?.quotation;
  const selection = selectInvoiceSource(quotation, revisionQuery);
  const { currentData: revision, isFetching: revisionLoading, isError: revisionError } = useGetInvoiceSourceRevisionQuery(
    { quotationId, version: selection.version },
    { skip: !quotationId || !selection.version || Boolean(selection.error) },
  );
  const existingInvoice = existingData?.data?.[0];
  const initialData = useMemo(() => quotation && quotationToInvoiceDraft(quotation, new Date(), revision), [quotation, revision]);
  const cancelPath = quotationId ? `/quotations/${quotationId}${selection.version ? `?version=${selection.version}` : ''}` : '/invoices';

  const handleSubmit = async (data) => {
    try {
      const result = await createInvoice({
        ...data, sourceQuotation: quotationId || undefined, sourceRevision: revision?._id,
      }).unwrap();
      toast.success('Invoice draft created. Review it before sending.');
      navigate(`/invoices/${result.data.invoice._id}`);
    } catch (err) {
      if (err?.status === 409 && quotationId) {
        const latest = await refetchExisting();
        const invoice = latest.data?.data?.[0];
        if (invoice) {
          toast('This quotation already has an invoice. Opening it now.');
          navigate(`/invoices/${invoice._id}`);
          return;
        }
      }
      const msg = err?.data?.message || 'Failed to create invoice';
      const errors = err?.data?.errors;
      if (errors && Array.isArray(errors)) {
        toast.error(errors.map((e) => e.message).join('. '));
      } else {
        toast.error(msg);
      }
    }
  };

  if (quotationId && (quotationLoading || existingLoading || revisionLoading)) {
    return <div className="rounded-lg border border-zinc-200 bg-white p-8 text-sm text-zinc-600">Loading quotation and invoice history...</div>;
  }

  if (quotationId && (quotationError || !quotation)) {
    return (
      <div className="max-w-3xl mx-auto rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
        <h1 className="text-xl font-semibold text-zinc-900">Quotation unavailable</h1>
        <p className="text-sm text-zinc-600">This quotation could not be loaded. Open it again from the quotations list.</p>
        <button type="button" onClick={() => navigate('/quotations')} className="text-sm font-medium text-amber-800 hover:underline">Back to quotations</button>
      </div>
    );
  }

  if (existingInvoice) {
    return (
      <div className="max-w-3xl mx-auto rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900">Invoice already created</h1>
        <p className="text-sm text-zinc-600">Quotation {quotation.quotationNumber} is linked to invoice {existingInvoice.invoiceNumber}. Open the existing invoice to review or edit its draft.</p>
        <button type="button" onClick={() => navigate(`/invoices/${existingInvoice._id}`)} className="min-h-11 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800">Open invoice</button>
      </div>
    );
  }

  if (quotationId && (selection.error || revisionError || (selection.version && !revision))) {
    return (
      <div className="max-w-3xl mx-auto rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
        <h1 className="text-xl font-semibold text-zinc-900">Quotation cannot be invoiced</h1>
        <p role="alert" className="text-sm text-zinc-600">{selection.error || 'The saved quotation revision could not be loaded.'}</p>
        <button type="button" onClick={() => navigate(cancelPath)} className="min-h-11 text-sm font-medium text-amber-800 hover:underline focus-visible:outline">Back to quotation</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(cancelPath)}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {quotationId ? 'Back to quotation' : 'Back to invoices'}
      </button>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{quotation ? 'Review invoice from quotation' : 'Create invoice'}</h1>
        {quotation && (
          <p className="mt-1 text-sm text-zinc-600">From {quotation.quotationNumber}{revision ? ` V${revision.version}` : ''} for {(revision?.content || quotation).client?.companyName}. Check every field below, then confirm to create an editable draft. No email will be sent.</p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-4 sm:p-6">
        <InvoiceForm
          clients={clients}
          clientsLoading={clientsLoading}
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          onCancel={() => navigate(cancelPath)}
          initialData={initialData}
          submitLabel={quotation ? 'Confirm & Create Draft Invoice' : 'Create Invoice'}
        />
      </div>
    </div>
  );
}
