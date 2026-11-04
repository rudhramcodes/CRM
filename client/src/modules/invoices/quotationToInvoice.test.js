import test from 'node:test';
import assert from 'node:assert/strict';
import { quotationToInvoiceDraft } from './quotationToInvoice.js';
import { selectInvoiceSource } from './invoiceSource.js';

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

test('prefills from the full selected revision instead of mutable root or working copy', () => {
  const root = {
    _id: 'quote-1', price: 9999, client: { _id: 'live-client', companyName: 'Live name' },
    workingCopy: { content: { price: 8888 } },
  };
  const revision = {
    _id: 'revision-1', version: 1,
    content: {
      client: { _id: 'frozen-client', companyName: 'Saved name', address: { street: 'Saved address' } },
      project: { _id: 'frozen-project', projectCode: 'SAVED' },
      price: 1500, taxRate: 5, scopeTitle: 'Saved scope', bankName: 'Saved bank',
    },
  };

  const draft = quotationToInvoiceDraft(root, new Date('2026-11-02T10:00:00Z'), revision);

  assert.equal(draft.sourceQuotation, 'quote-1');
  assert.equal(draft.sourceRevision, 'revision-1');
  assert.equal(draft.client, 'frozen-client');
  assert.equal(draft.project, 'frozen-project');
  assert.equal(draft.recipientName, 'Saved name');
  assert.equal(draft.bankName, 'Saved bank');
  assert.equal(draft.billingAddress.street, 'Saved address');
  assert.deepEqual(draft.items, [{ description: 'Saved scope', quantity: 1, unitPrice: 1500 }]);
  assert.equal(draft.taxRate, 5);
  assert.equal(draft.projectReference, 'SAVED');
  assert.equal(Object.hasOwn(draft, 'sourceRevisionVersion'), false);
});

test('selects the explicit revision or latest saved version without treating working copy as saved', () => {
  assert.deepEqual(selectInvoiceSource({ schemaVersion: 2, latestVersion: 3 }, '2'), { version: 2, error: null });
  assert.deepEqual(selectInvoiceSource({ schemaVersion: 2, latestVersion: 3 }, null), { version: 3, error: null });
  assert.equal(selectInvoiceSource({ schemaVersion: 2, latestVersion: 0, workingCopy: {} }, null).version, null);
  assert.ok(selectInvoiceSource({ schemaVersion: 2, latestVersion: 0 }, null).error);
  assert.deepEqual(selectInvoiceSource({ price: 100 }, null), { version: null, error: null });
});

test('blocks archived sources and malformed revision query values', () => {
  assert.ok(selectInvoiceSource({ archivedAt: '2026-11-01' }, '1').error);
  for (const query of ['', '0', '-1', '2.5', 'abc', '9007199254740992']) {
    assert.ok(selectInvoiceSource({ schemaVersion: 2, latestVersion: 3 }, query).error);
  }
});
