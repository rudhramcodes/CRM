const dateInput = (date) => date.toISOString().slice(0, 10);

export const INVOICE_PRINTED_FIELDS = [
  'recipientName', 'recipientEmail', 'recipientPhone', 'recipientGst',
  'clientReference', 'projectReference', 'issuerName', 'issuerAddress',
  'issuerEmail', 'issuerPhone', 'issuerGst', 'bankName', 'bankAccountName',
  'bankAccountNumber', 'bankIfsc', 'bankGst', 'bankUpi', 'signatoryName',
];

export function quotationToInvoiceDraft(root, now = new Date(), revision = null) {
  const quotation = revision ? revision.content : root;
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 30);
  const clientAddress = quotation.client?.address || {};
  const billingAddress = quotation.recipientAddress
    ? { street: quotation.recipientAddress, city: '', state: '', pincode: '', country: 'India' }
    : {
        street: clientAddress.street || '',
        city: clientAddress.city || '',
        state: clientAddress.state || '',
        pincode: clientAddress.pincode || '',
        country: clientAddress.country || 'India',
      };

  return {
    ...Object.fromEntries(INVOICE_PRINTED_FIELDS.map((field) => [field, quotation[field] ?? ''])),
    recipientName: quotation.recipientName ?? quotation.client?.companyName ?? '',
    recipientEmail: quotation.recipientEmail ?? quotation.client?.email ?? '',
    recipientPhone: quotation.recipientPhone ?? quotation.client?.phone ?? '',
    recipientGst: quotation.recipientGst ?? quotation.client?.gstNumber ?? '',
    clientReference: quotation.clientReference ?? quotation.client?.clientId ?? '',
    projectReference: quotation.projectReference ?? quotation.project?.projectCode ?? '',
    sourceQuotation: root._id,
    ...(revision ? { sourceRevision: revision._id } : {}),
    client: quotation.client?._id || quotation.client,
    project: quotation.project?._id || quotation.project || '',
    issueDate: dateInput(now),
    dueDate: dateInput(dueDate),
    items: [{
      description: quotation.scopeTitle || quotation.subject || 'Services',
      quantity: 1,
      unitPrice: Number(quotation.price || 0),
    }],
    taxRate: Number(quotation.taxRate ?? 0),
    discountPercent: 0,
    billingAddress,
    notes: quotation.note || '',
    termsConditions: quotation.paymentTerms || quotation.note || '',
  };
}
