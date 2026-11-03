# Invoice quotation provenance

New versioned-source invoices persist three immutable fields:

- `sourceQuotation`: the stable quotation family ObjectId. Its existing partial
  unique index remains the concurrency guard: one invoice per family, across all
  revisions. Duplicate creation returns HTTP 409.
- `sourceRevision`: the selected saved embedded revision ObjectId.
- `sourceRevisionVersion`: the saved revision's integer version, derived on the
  server. A caller-supplied value is ignored.

`sourceRevision` requires `sourceQuotation`. Schema 2 families require a saved
revision. The quotation revision service verifies membership and archival state;
invoice creation compares client/project IDs with the saved content's frozen
references, including a null project. All existing saved statuses are invoiceable.
Reviewed invoice amounts and printed fields remain editable invoice values.
Updates cannot reassign provenance, including while the invoice is a draft.

Client URL: `/invoices/new?quotationId=<family-id>&revision=2` fetches
`GET /api/quotations/<family-id>/revisions/2`, reads `data.revision.content`, and
submits that revision's `_id` as `sourceRevision`. Without the revision query, a
schema 2 family resolves `latestVersion` and fetches that saved revision. A family
with no saved versions cannot be invoiced from its working copy. Archived sources
are blocked. Legacy families retain root-based prefill and creation.

Invoice detail shows the source quotation number and `Vn` and links to
`/quotations/<family-id>?version=n` when revision provenance is available.

## Historical limitation

No migration is required to read historical invoices. Existing invoices without
revision provenance remain unchanged, including monetary values. They do not gain
an exact historical version reference: a later reconstructed baseline cannot prove
which content was used at invoice creation. No baseline is inferred or backfilled
by this implementation, and no migration is run. Any separately approved future
backfill must only attach matching reconstructed V1 baselines and explicitly label
them `legacy_reconstructed`, rather than claim original revision provenance.
