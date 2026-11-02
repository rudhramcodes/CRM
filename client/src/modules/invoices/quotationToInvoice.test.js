import test from 'node:test';
import assert from 'node:assert/strict';
import { quotationToInvoiceDraft } from './quotationToInvoice.js';

test('prefills an editable invoice when converting a quotation', () => {
  const quotation = {
    _id: 'quote-1', client: { _id: 'client-1', address: { street: 'Old address' } },
    project: { _id: 'project-1' }, scopeTitle: 'Wedding coverage',
    price: 600000, taxRate: 18, recipientAddress: 'Edited billing address',
    note: 'Review the event scope', paymentTerms: '50% advance',
  };

  const draft = quotationToInvoiceDraft(quotation, new Date('2026-11-02T10:00:00Z'));

  assert.equal(draft.sourceQuotation, 'quote-1');
  assert.equal(draft.client, 'client-1');
  assert.equal(draft.project, 'project-1');
  assert.deepEqual(draft.items, [{ description: 'Wedding coverage', quantity: 1, unitPrice: 600000 }]);
  assert.equal(draft.taxRate, 18);
  assert.equal(draft.billingAddress.street, 'Edited billing address');
  assert.equal(draft.issueDate, '2026-11-02');
  assert.equal(draft.dueDate, '2026-12-02');
  assert.equal(draft.termsConditions, '50% advance');
});

test('uses the client address when the quotation has no printed override', () => {
  const draft = quotationToInvoiceDraft({
    _id: 'quote-2', client: { _id: 'client-2', address: { street: 'Client street', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' } },
    price: 1200, taxRate: 0,
  }, new Date('2026-11-02T10:00:00Z'));

  assert.equal(draft.billingAddress.street, 'Client street');
  assert.equal(draft.billingAddress.city, 'Mumbai');
  assert.equal(draft.items[0].unitPrice, 1200);
});
