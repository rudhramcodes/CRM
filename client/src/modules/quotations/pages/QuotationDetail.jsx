import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import QuotationForm from '../components/QuotationForm';
import QuotationPreview from '../components/QuotationPreview';
import QuotationRevisionHistory from '../components/QuotationRevisionHistory';
import QuotationVersionActions from '../components/QuotationVersionActions';
import QuotationSummary from '../components/QuotationSummary';
import QuotationStatusBadge from '../components/QuotationStatusBadge';
import useQuotationVersions from '../hooks/useQuotationVersions';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Button from '../../../components/ui/Button';
import { DetailSkeleton } from '../../../components/ui/Skeleton';
import { useGetQuotationByIdQuery, useGetQuotationHtmlQuery } from '../../../services/quotationApi';
import { useGetClientsQuery } from '../../../services/clientApi';
import { useGetInvoicesQuery } from '../../../services/invoiceApi';

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useGetQuotationByIdQuery(id);
  const quotation = query.data?.data?.quotation;
  const versions = useQuotationVersions({ id, quotation, refetch: query.refetch });
  const legacyPreview = useGetQuotationHtmlQuery(id, { skip: !quotation || versions.versioned });
  const { data: clientsData } = useGetClientsQuery({ limit: 100 });
  const { data: invoicesData } = useGetInvoicesQuery({ sourceQuotation: id, limit: 1 }, { skip: !id });
  const [editor, setEditor] = useState(null);
  const [saveContext, setSaveContext] = useState(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const iframeRef = useRef(null);
  const linkedInvoice = invoicesData?.data?.[0];
  const content = versions.versioned ? versions.document : quotation;
  const html = versions.versioned ? versions.preview : legacyPreview.currentData;

  const edit = () => setEditor({
    content: versions.workingCopy.content,
    baseVersion: quotation.latestVersion,
    editVersion: versions.workingCopy.editVersion,
  });
  const saveDraft = async (changes) => {
    const saved = await versions.edit(changes, { baseVersion: editor.baseVersion, editVersion: editor.editVersion });
    if (saved) setEditor(null);
  };
  const print = () => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;
    frame.focus();
    frame.print();
  };
  const confirmSave = async (event) => {
    event.preventDefault();
    if (await versions.save(revisionNote, saveContext)) {
      setSaveContext(null);
      setRevisionNote('');
    }
  };

  if (query.isLoading) return <DetailSkeleton />;
  if (query.error) return <p role="alert" className="py-8 text-center text-red-700">Unable to load this quotation. <button type="button" onClick={query.refetch} className="underline">Try again</button></p>;
  if (!quotation) return <p className="py-8 text-center text-zinc-500">Quotation not found.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-5 print:m-0 print:max-w-none print:space-y-0">
      <header className="space-y-4 print:hidden">
        <button type="button" onClick={() => navigate('/quotations')} className="inline-flex min-h-9 items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-primary-900">
          <ArrowLeft className="h-4 w-4" /> Back to quotations
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-zinc-900">{quotation.quotationNumber}</h1>
          <div className="flex items-center gap-2">
            {quotation.archivedAt && <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Archived</span>}
            {versions.working ? <span className="text-sm text-amber-800">Working draft</span> : versions.versioned && !versions.revision ? <span className="text-sm text-zinc-500">Loading version...</span> : <QuotationStatusBadge status={versions.revision?.status || quotation.status} />}
          </div>
        </div>
        <QuotationVersionActions
          quotation={quotation} versions={versions} onEdit={edit} onPrint={print}
          onSave={() => setSaveContext({ baseVersion: quotation.latestVersion, editVersion: versions.workingCopy.editVersion })}
          onConfirm={setConfirmation} linkedInvoice={linkedInvoice}
          onInvoice={() => navigate(linkedInvoice ? `/invoices/${linkedInvoice._id}` : `/invoices/new?quotationId=${id}&revision=${versions.selection}`)}
        />
      </header>

      {!versions.versioned ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 print:hidden">This quotation predates version history. Enable history to preserve its current state as V1 and create revisions. The original sent artifact cannot be recovered.</p>
      ) : <QuotationRevisionHistory quotation={quotation} versions={versions} />}

      {versions.detailError && !versions.working && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Unable to load the selected revision. Choose another version or refresh the page.</p>}
      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white print:overflow-visible print:rounded-none print:border-none" aria-label="Quotation preview">
        <QuotationPreview
          html={html} iframeRef={iframeRef}
          title={`Quotation ${quotation.quotationNumber}${versions.versioned ? ` · ${versions.working ? 'Working draft' : `V${versions.selection}`}` : ''}`}
          isFetching={versions.versioned ? versions.previewLoading : legacyPreview.isFetching}
          error={versions.versioned ? versions.previewError : legacyPreview.error}
        />
      </section>
      {content && <QuotationSummary content={content} revision={versions.revision} />}

      {editor && (
        <Modal open onClose={() => setEditor(null)} title="Edit revision working draft" size="xl">
          <p className="mb-4 text-sm text-zinc-500">Save the working draft, then use Save Revision to preserve a new immutable version.</p>
          <QuotationForm clients={clientsData?.data || []} initialData={editor.content} onSubmit={saveDraft} isSubmitting={versions.busy === 'edit'} onCancel={() => setEditor(null)} submitLabel="Save Working Draft" lockIdentity={quotation.latestVersion > 0} />
        </Modal>
      )}
      {saveContext && (
        <Modal open onClose={() => setSaveContext(null)} title={`Save revision V${saveContext.baseVersion + 1}`} size="md">
          <form aria-label="Save quotation revision" onSubmit={confirmSave} className="space-y-4">
            <p className="text-sm text-zinc-600">The current working draft, preview and PDF will be frozen. Further edits will require a new revision. Saving does not send an email.</p>
            <label className="block text-sm font-medium text-zinc-700">Revision note
              <textarea value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} maxLength={1000} rows={3} placeholder="For example: Revised scope and pricing" className="mt-2 w-full rounded-lg border border-zinc-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-900" />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSaveContext(null)} disabled={Boolean(versions.busy)}>Cancel</Button>
              <Button type="submit" loading={versions.busy === 'save'} disabled={Boolean(versions.busy)}>Save Revision</Button>
            </div>
          </form>
        </Modal>
      )}
      <ConfirmDialog
        open={Boolean(confirmation)} onClose={() => setConfirmation(null)}
        title={confirmation?.title} message={confirmation?.message}
        confirmLabel={confirmation?.confirmLabel} variant={confirmation?.variant}
        onConfirm={() => { const task = confirmation.task; setConfirmation(null); Promise.resolve(task()).catch(() => toast.error('Unable to complete this action')); }}
      />
    </div>
  );
}
