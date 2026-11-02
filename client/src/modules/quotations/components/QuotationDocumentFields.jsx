import FormInput from '../../../components/forms/FormInput';
import FormTextarea from '../../../components/forms/FormTextarea';

function PageSection({ id, page, title, description, onRestore, canRestore, children }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-zinc-200 pt-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
            {page}
          </span>
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
            <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
          </div>
        </div>
        {onRestore && (
          <button
            type="button"
            onClick={onRestore}
            disabled={!canRestore}
            className="min-h-9 rounded-md px-2 text-sm font-medium text-amber-800 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:text-zinc-400"
          >
            Restore suggested text
          </button>
        )}
      </div>
      <div className="space-y-4 pl-0 sm:pl-12">{children}</div>
    </section>
  );
}

export default function QuotationDocumentFields({ templateId, register, errors, applyDefaults, canRestore }) {
  const panigrahna = templateId === 'panigrahna';
  const restore = (fields) => () => applyDefaults(fields, { force: true });

  return (
    <>
      <PageSection
        id="quote-letter"
        page="01"
        title={panigrahna ? 'Letter and event coverage' : 'Cover letter'}
        description={panigrahna ? 'Page 1: recipient greeting, introduction and event-day scope.' : 'Page 1: recipient greeting and your proposal letter.'}
        onRestore={restore(['salutation', 'letterBody', 'letterSignoff', 'scopeIntro', 'scopeOfWork'])}
        canRestore={canRestore}
      >
        <FormInput label="Greeting" placeholder="Dear Client," error={errors.salutation?.message} {...register('salutation')} />
        <FormTextarea
          label="Letter text"
          placeholder="Introduce the proposal. Separate paragraphs with a blank line."
          rows={7}
          error={errors.letterBody?.message}
          {...register('letterBody')}
        />
        {panigrahna && (
          <>
            <FormTextarea
              label="Scope introduction"
              placeholder="Our team will cover the celebrations..."
              rows={3}
              error={errors.scopeIntro?.message}
              {...register('scopeIntro')}
            />
            <FormTextarea
              label="Event dates and crew / scope"
              placeholder={'30th November - 2 story catchers, 2 cinematographers\n1st December - 3 story catchers, 3 cinematographers, 1 drone'}
              rows={6}
              error={errors.scopeOfWork?.message}
              {...register('scopeOfWork')}
            />
            <p className="text-xs text-zinc-500">One line per date or service. These lines also appear on the pricing page.</p>
          </>
        )}
        {!panigrahna && (
          <FormTextarea label="Sign-off" rows={2} error={errors.letterSignoff?.message} {...register('letterSignoff')} />
        )}
      </PageSection>

      {panigrahna ? (
        <>
          <PageSection
            id="quote-deliverables"
            page="02"
            title="Deliverables and closing"
            description="Page 2: what the client receives, followed by your closing and signature."
            onRestore={restore(['deliverables', 'closingNote', 'letterSignoff'])}
            canRestore={canRestore}
          >
            <FormTextarea label="Deliverables" placeholder="One deliverable per line" rows={6} error={errors.deliverables?.message} {...register('deliverables')} />
            <FormTextarea label="Closing paragraph" rows={3} error={errors.closingNote?.message} {...register('closingNote')} />
            <FormTextarea label="Sign-off" rows={2} error={errors.letterSignoff?.message} {...register('letterSignoff')} />
          </PageSection>
          <PageSection
            id="quote-terms"
            page="03"
            title="Terms and conditions"
            description="Page 3: payment schedule and individual conditions. Review these before sending."
            onRestore={restore(['paymentTerms', 'conditions'])}
            canRestore={canRestore}
          >
            <FormTextarea label="Payment terms" placeholder="One payment milestone per line" rows={4} error={errors.paymentTerms?.message} {...register('paymentTerms')} />
            <FormTextarea label="Conditions" placeholder="One condition per line" rows={8} error={errors.conditions?.message} {...register('conditions')} />
          </PageSection>
          <PageSection
            id="quote-summary"
            page="04"
            title="Quotation and pricing"
            description="Page 4: billed-to details, scope, deliverables, bank details and totals."
          >
            <FormInput label="Service name for invoice" placeholder="Wedding Photography & Cinematography" error={errors.scopeTitle?.message} {...register('scopeTitle')} />
            <p className="text-xs text-zinc-500">Used to describe the item when you create an invoice from this quotation.</p>
            <FormTextarea label="Invoice note (not printed on this template)" rows={3} error={errors.note?.message} {...register('note')} />
          </PageSection>
        </>
      ) : (
        <>
          <PageSection
            id="quote-scope"
            page="02"
            title="Scope of work"
            description="Page 2: subject, scope and deliverables, using the selected project when available."
            onRestore={restore(['subject', 'scopeTitle', 'scopeIntro', 'scopeOfWork', 'deliverables'])}
            canRestore={canRestore}
          >
            <FormInput label="Subject" error={errors.subject?.message} {...register('subject')} />
            <FormTextarea label="Scope heading" rows={2} error={errors.scopeTitle?.message} {...register('scopeTitle')} />
            <FormTextarea label="Scope introduction" rows={3} error={errors.scopeIntro?.message} {...register('scopeIntro')} />
            <FormTextarea label="Scope items" placeholder="One item per line" rows={7} error={errors.scopeOfWork?.message} {...register('scopeOfWork')} />
            <FormTextarea label="Deliverables" placeholder="One deliverable per line" rows={5} error={errors.deliverables?.message} {...register('deliverables')} />
          </PageSection>
          <PageSection id="quote-summary" page="03" title="Summary note" description="Page 3: payment note beside the quotation totals." onRestore={restore(['note'])} canRestore={canRestore}>
            <FormTextarea label="Note" rows={4} error={errors.note?.message} {...register('note')} />
          </PageSection>
        </>
      )}

      <details className="rounded-lg border border-zinc-200 bg-zinc-50/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
          Edit printed recipient, company and bank details
        </summary>
        <div className="space-y-6 border-t border-zinc-200 p-4">
          <p className="text-sm text-zinc-600">Prefilled from the client and company record. Changes here affect this quotation only. The generated quotation number and brand logos are system-managed.</p>
          <div className="space-y-3">
            <h4 className="font-semibold text-zinc-800">Billed to / recipient</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="Recipient name" {...register('recipientName')} />
              <FormInput label="Printed client ID" {...register('clientReference')} />
              <FormInput label="Recipient email" type="email" {...register('recipientEmail')} />
              <FormInput label="Recipient phone" {...register('recipientPhone')} />
              <FormInput label="Recipient GST" {...register('recipientGst')} />
              <FormInput label="Printed project reference" {...register('projectReference')} />
            </div>
            <FormTextarea label="Recipient address" rows={3} {...register('recipientAddress')} />
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-zinc-800">Issuer and footer</h4>
            <FormInput label="Issuer name" {...register('issuerName')} />
            <FormTextarea label="Issuer address" rows={3} {...register('issuerAddress')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="Issuer email" type="email" {...register('issuerEmail')} />
              <FormInput label="Issuer phone" {...register('issuerPhone')} />
              <FormInput label="Issuer website" {...register('issuerWebsite')} />
              <FormInput label="Issuer GST" {...register('issuerGst')} />
              <FormInput label="Signature name" {...register('signatoryName')} />
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-zinc-800">Bank details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="Bank name" {...register('bankName')} />
              <FormInput label="Account name" {...register('bankAccountName')} />
              <FormInput label="Account number" {...register('bankAccountNumber')} />
              <FormInput label="IFSC code" {...register('bankIfsc')} />
              <FormInput label="Bank GST" {...register('bankGst')} />
              <FormInput label="UPI ID" {...register('bankUpi')} />
            </div>
          </div>
        </div>
      </details>
    </>
  );
}
