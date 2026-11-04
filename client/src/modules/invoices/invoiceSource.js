export function selectInvoiceSource(quotation, revisionQuery) {
  if (!quotation) return { version: null, error: null };
  if (quotation.archivedAt) return { version: null, error: 'Archived quotations cannot be invoiced.' };
  if (revisionQuery !== null) {
    const version = Number(revisionQuery);
    if (!/^[1-9]\d*$/.test(revisionQuery) || !Number.isSafeInteger(version)) {
      return { version: null, error: 'Select a valid saved quotation revision.' };
    }
    return { version, error: null };
  }
  if (quotation.schemaVersion !== 2) return { version: null, error: null };
  if (!quotation.latestVersion) {
    return { version: null, error: 'Cannot invoice a working copy. Save a quotation revision first.' };
  }
  return { version: quotation.latestVersion, error: null };
}
