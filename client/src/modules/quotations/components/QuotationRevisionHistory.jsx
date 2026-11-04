import { Download, History } from 'lucide-react';
import QuotationStatusBadge from './QuotationStatusBadge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';

const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN') : '-';
const fieldLabel = (field) => field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());

export default function QuotationRevisionHistory({ quotation, versions }) {
  const revisions = [...(quotation.revisions || [])].sort((a, b) => b.version - a.version);
  const lastSent = revisions.find((revision) => revision.sentAt);
  return (
    <section aria-labelledby="revision-history-title" className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="revision-history-title" className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <History className="h-4 w-4" /> Version history
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {quotation.latestVersion ? `Latest saved: V${quotation.latestVersion}` : 'No saved revision yet'}
            {lastSent ? ` · Last sent: V${lastSent.version}` : ' · Not sent'}
            {quotation.workingCopy ? ' · Working draft available' : ''}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="quotation-version" className="mb-1 block text-xs font-medium text-zinc-600">Viewing</label>
          <Select value={versions.selection} onValueChange={versions.select}>
            <SelectTrigger id="quotation-version" aria-label="Quotation version"><SelectValue placeholder="Select a version" /></SelectTrigger>
            <SelectContent>
              {quotation.workingCopy && <SelectItem value="working">Working draft (not a saved version)</SelectItem>}
              {revisions.map((revision) => (
                <SelectItem key={revision.version} value={String(revision.version)}>
                  V{revision.version}{revision.version === quotation.latestVersion ? ' · Latest saved' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {versions.working ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Working draft{quotation.workingCopy?.sourceVersion ? ` based on V${quotation.workingCopy.sourceVersion}` : ''}. Save Revision freezes its content and PDF; saving the working draft alone does not create a version.
        </p>
      ) : Number(versions.selection) < quotation.latestVersion ? (
        <p className="mt-4 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700">
          Viewing older version V{versions.selection}. Preview, PDF, print and send actions apply to this version.
        </p>
      ) : null}

      {revisions.length > 0 && (
        <details className="mt-4" open>
          <summary className="cursor-pointer text-sm font-medium text-zinc-700">Saved revisions ({revisions.length})</summary>
          <div className="mt-3 divide-y divide-zinc-100">
            {revisions.map((revision) => (
              <div key={revision.version} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => versions.select(revision.version)} className="min-h-8 font-semibold text-primary-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary-900">
                      Version V{revision.version}
                    </button>
                    <QuotationStatusBadge status={revision.status} />
                    {revision.version === quotation.latestVersion && <span className="text-xs text-zinc-500">Latest</span>}
                  </div>
                  <p className="mt-1 break-words text-sm text-zinc-700">{revision.revisionNote || (revision.version === 1 ? 'Original quotation' : 'Saved revision')}</p>
                  <p className="mt-1 text-xs text-zinc-500">{revision.createdByName || 'Administrator'} · {dateTime(revision.createdAt)}</p>
                  {revision.version > 1 && revision.changedFields?.length > 0 && <p className="mt-1 break-words text-xs text-zinc-500">Changed: {revision.changedFields.map(fieldLabel).join(', ')}</p>}
                  {revision.provenance === 'legacy_reconstructed' && (
                    <p className="mt-1 text-xs text-amber-800">Reconstructed legacy snapshot. The originally sent PDF was not retained.</p>
                  )}
                </div>
                <button type="button" onClick={() => versions.download(String(revision.version))} disabled={versions.downloading} aria-label={`Download version V${revision.version}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-primary-900 disabled:opacity-50">
                  <Download className="h-4 w-4" /> PDF
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
