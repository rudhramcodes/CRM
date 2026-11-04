import { Archive, ArchiveRestore, Edit2, FilePlus2, Send, Download, Printer, CheckCircle, XCircle, Clock, RefreshCw, Receipt, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function QuotationVersionActions({ quotation, versions, onEdit, onSave, onConfirm, onPrint, linkedInvoice, onInvoice }) {
  const archived = Boolean(quotation.archivedAt);
  const revision = versions.revision;
  const confirm = (title, message, label, task, variant = 'primary') => onConfirm({ title, message, confirmLabel: label, task, variant });
  const send = (resend) => confirm(
    `${resend ? 'Resend' : 'Send'} version V${versions.selection}`,
    `Submit the saved V${versions.selection} PDF to ${revision?.content?.recipientEmail ?? revision?.content?.client?.email ?? 'the saved recipient'}?`,
    resend ? 'Resend this version' : 'Send this version',
    () => versions.send(resend),
  );
  const status = (value) => confirm(
    `Mark V${versions.selection} ${value}`,
    `This changes the status of version V${versions.selection} only. Its saved content and PDF remain unchanged.`,
    `Mark ${value}`, () => versions.status(value), value === 'rejected' ? 'danger' : 'primary',
  );
  const disabled = Boolean(versions.busy);
  const canDecide = revision && ['draft', 'sent'].includes(revision.status);
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {!versions.versioned && (
        <Button size="sm" onClick={() => confirm('Enable version history', 'Preserve the current quotation as a reconstructed baseline V1? Its original sent PDF is not available.', 'Create baseline V1', versions.baseline)} loading={versions.busy === 'baseline'} disabled={disabled}>
          <FilePlus2 className="mr-1 h-4 w-4" /> Enable version history
        </Button>
      )}
      {!archived && versions.versioned && versions.working && (
        <>
          <Button size="sm" onClick={onSave} disabled={disabled || !quotation.workingCopy}><FilePlus2 className="mr-1 h-4 w-4" /> Save Revision</Button>
          <Button variant="secondary" size="sm" onClick={onEdit} disabled={disabled || !quotation.workingCopy}><Edit2 className="mr-1 h-4 w-4" /> Edit working draft</Button>
          {quotation.latestVersion > 0 && <Button variant="danger" size="sm" onClick={() => confirm('Discard working draft', 'Discard this working copy? All saved versions will remain available.', 'Discard draft', versions.discard, 'danger')} disabled={disabled}><Trash2 className="mr-1 h-4 w-4" /> Discard draft</Button>}
        </>
      )}
      {!archived && versions.versioned && !versions.working && revision && (
        <>
          {revision.status === 'draft' && <Button size="sm" onClick={() => send(false)} disabled={disabled} loading={versions.busy === 'sent'}><Send className="mr-1 h-4 w-4" /> Send V{versions.selection}</Button>}
          {quotation.workingCopy ? (
            <Button variant="secondary" size="sm" onClick={() => versions.select('working')}>Open working draft</Button>
          ) : (
            <Button variant={revision.status === 'draft' ? 'secondary' : 'primary'} size="sm" onClick={versions.create} disabled={disabled} loading={versions.busy === 'create'}><Edit2 className="mr-1 h-4 w-4" /> Create revision from V{versions.selection}</Button>
          )}
          {revision.sentAt && <Button variant="secondary" size="sm" onClick={() => send(true)} disabled={disabled} loading={versions.busy === 'resend'}><RefreshCw className="mr-1 h-4 w-4" /> Resend V{versions.selection}</Button>}
          {canDecide && <Button variant="secondary" size="sm" onClick={() => status('accepted')} disabled={disabled}><CheckCircle className="mr-1 h-4 w-4" /> Accept</Button>}
          {canDecide && <Button variant="secondary" size="sm" onClick={() => status('rejected')} disabled={disabled}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>}
          {revision.status === 'sent' && <Button variant="secondary" size="sm" onClick={() => status('expired')} disabled={disabled}><Clock className="mr-1 h-4 w-4" /> Expire</Button>}
          <Button variant="secondary" size="sm" onClick={onInvoice} disabled={disabled}><Receipt className="mr-1 h-4 w-4" /> {linkedInvoice ? 'Open invoice' : `Create invoice from V${versions.selection}`}</Button>
        </>
      )}
      <Button variant="secondary" size="sm" onClick={() => versions.download()} loading={versions.downloading} disabled={versions.versioned && (!versions.document || Boolean(versions.detailError))}><Download className="mr-1 h-4 w-4" /> PDF</Button>
      <Button variant="secondary" size="sm" onClick={onPrint} disabled={versions.versioned && (versions.previewLoading || !versions.preview || Boolean(versions.previewError))}><Printer className="mr-1 h-4 w-4" /> Print</Button>
      {versions.versioned && (
        <Button variant="secondary" size="sm" onClick={() => confirm(archived ? 'Restore quotation' : 'Archive quotation', archived ? 'Allow revisions and sending again?' : 'Archive this quotation? Its full version history and downloads remain available.', archived ? 'Restore' : 'Archive', versions.archive)} disabled={disabled} loading={versions.busy === 'archive'}>
          {archived ? <ArchiveRestore className="mr-1 h-4 w-4" /> : <Archive className="mr-1 h-4 w-4" />}{archived ? 'Restore quotation' : 'Archive'}
        </Button>
      )}
    </div>
  );
}
