const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const date = (value) => value ? new Date(value).toLocaleString('en-IN') : '-';

export default function QuotationSummary({ content, revision }) {
  const lifecycle = revision || content;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 print:hidden">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
        <h2 className="mb-4 text-sm font-medium text-zinc-700">Quotation summary{revision ? ` · V${revision.version}` : ''}</h2>
        <dl className="grid grid-cols-2 gap-4 rounded-lg bg-zinc-50 p-3 sm:grid-cols-4">
          {[
            ['Client budget', money(content.budget)], ['Subtotal', money(content.price)],
            [`GST (${content.taxRate ?? 0}%)`, money(content.taxAmount)], ['Total', money(content.total)],
          ].map(([label, value]) => (
            <div key={label}><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 text-lg font-bold text-zinc-900">{value}</dd></div>
          ))}
        </dl>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {[
            ['Client reference', content.clientReference ?? content.client?.clientId],
            ['Project reference', content.projectReference ?? content.project?.projectCode],
            ['Quotation', content.quotationNumber], ['Issue date', date(content.issueDate)],
            ['Valid until', date(content.validUntil)], ['Recipient', content.recipientName ?? content.client?.companyName],
          ].map(([label, value]) => <div key={label}><dt className="inline text-zinc-500">{label}: </dt><dd className="inline break-words font-medium text-zinc-700">{value || '-'}</dd></div>)}
        </dl>
      </section>
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">Version timeline</h2>
        <div className="space-y-2 text-sm text-zinc-500">
          <p>Saved: {date(lifecycle.createdAt)}</p>
          {lifecycle.sentAt && <p>Sent: {date(lifecycle.sentAt)}</p>}
          {lifecycle.acceptedAt && <p>Accepted: {date(lifecycle.acceptedAt)}</p>}
          {lifecycle.rejectedAt && <p>Rejected: {date(lifecycle.rejectedAt)}</p>}
          {lifecycle.expiredAt && <p>Expired: {date(lifecycle.expiredAt)}</p>}
          {revision?.sendAttempts?.map((attempt) => (
            <div key={attempt._id} className="rounded-md bg-zinc-50 p-2 text-xs">
              <p className="font-medium text-zinc-700">{attempt.kind === 'resend' ? 'Resend' : 'Send'} · {attempt.status === 'accepted' ? 'Provider accepted' : attempt.status === 'pending' ? 'Awaiting confirmation' : 'Failed'}</p>
              <p className="mt-1 break-all">{attempt.recipient}</p><p>{date(attempt.createdAt)}</p>
              {attempt.error && <p className="mt-1 text-red-700">{attempt.error}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
