import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Client from '../../clients/client.model.js';
import Quotation from '../../quotations/quotation.model.js';
import Invoice from '../invoice.model.js';
import { createInvoice, updateInvoice } from '../invoice.service.js';
import { createInvoiceSchema, updateInvoiceSchema } from '../invoice.validation.js';

vi.mock('../../../services/emailService.js', () => ({ sendEmail: vi.fn(), renderInvoiceEmail: vi.fn() }));
vi.mock('../../../services/pdfService.js', () => ({ generateInvoicePdf: vi.fn(), generateInvoiceHtml: vi.fn() }));
vi.mock('../../notifications/notification.service.js', () => ({}));

const id = () => new mongoose.Types.ObjectId();
const client = id();
const project = id();
const user = { _id: id() };
const revisionId = id();
const sourceQuotation = id();
const other = id();
const input = {
  client: String(client), project: String(project),
  sourceQuotation: String(sourceQuotation), sourceRevision: String(revisionId),
  dueDate: '2026-12-02', items: [{ description: 'Reviewed scope', quantity: 2, unitPrice: 450 }],
};
const dbName = `invoice_revision_test_${randomUUID().replaceAll('-', '')}`;

describe('saved quotation revision invoice provenance', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017', { dbName, serverSelectionTimeoutMS: 3000 });
    await Invoice.init();
    await Client.init();
    await Client.collection.insertOne({ _id: client, clientId: 'CLIENT-TEST', brand: 'panigrahna' });
    await Client.collection.insertOne({ _id: other, clientId: 'CLIENT-OTHER', brand: 'panigrahna' });
  });

  afterAll(async () => {
    if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Invoice.deleteMany({});
    await Quotation.deleteMany({});
    await Quotation.collection.insertOne({
      _id: sourceQuotation, quotationNumber: 'QUO-TEST', schemaVersion: 2,
      client: other, project: other, latestVersion: 2,
      revisions: [{
        _id: revisionId, version: 1, status: 'draft',
        content: { client: { _id: client }, project: { _id: project }, price: 100 },
      }, { _id: id(), version: 2, status: 'sent', content: { client: { _id: other }, project: null } }],
    });
    await Quotation.collection.insertOne({
      _id: id(), quotationNumber: 'QUO-FOREIGN', schemaVersion: 2, client, project,
      latestVersion: 1, revisions: [{ _id: other, version: 1, status: 'draft',
        content: { client: { _id: client }, project: { _id: project } } }],
    });
  });

  it.each(['draft', 'sent', 'accepted', 'rejected', 'expired'])(
    'stores the selected saved revision at %s status with a server-derived version', async (status) => {
      await Quotation.collection.updateOne({ _id: sourceQuotation }, { $set: { 'revisions.0.status': status } });

      const invoice = await createInvoice({ ...input, sourceRevisionVersion: 999 }, user);

      const stored = await Invoice.findById(invoice._id).lean();
      expect(String(stored.sourceQuotation)).toBe(String(sourceQuotation));
      expect(String(stored.sourceRevision)).toBe(String(revisionId));
      expect(stored.sourceRevisionVersion).toBe(1);
      expect(stored.total).toBe(900);
    },
  );

  it.each([
    ['missing revision', { sourceRevision: undefined }],
    ['foreign revision', { sourceRevision: String(other) }],
    ['different frozen client', { client: String(other) }],
    ['different frozen project', { project: String(other) }],
    ['omitted frozen project', { project: '' }],
    ['revision without family', { sourceQuotation: undefined }],
  ])('rejects %s before persisting an invoice', async (_label, override) => {
    await expect(createInvoice({ ...input, ...override }, user)).rejects.toMatchObject({ statusCode: 400 });
    expect(await Invoice.countDocuments()).toBe(0);
  });

  it('rejects an archived source even with a saved revision', async () => {
    await Quotation.collection.updateOne({ _id: sourceQuotation }, { $set: { archivedAt: new Date() } });

    await expect(createInvoice(input, user)).rejects.toMatchObject({ statusCode: 400 });
    expect(await Invoice.countDocuments()).toBe(0);
  });

  it('rejects a project added to a revision whose frozen project is null', async () => {
    await Quotation.collection.updateOne({ _id: sourceQuotation }, { $set: { 'revisions.0.content.project': null } });

    await expect(createInvoice(input, user)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('allows only one invoice for a quotation family across concurrent revisions', async () => {
    await Quotation.collection.updateOne({ _id: sourceQuotation }, { $set: { 'revisions.1.content': {
      client: { _id: client }, project: { _id: project },
    } } });
    const root = await Quotation.findById(sourceQuotation).lean();

    const results = await Promise.allSettled([
      createInvoice(input, user),
      createInvoice({ ...input, sourceRevision: String(root.revisions[1]._id) }, user),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected').reason).toMatchObject({ statusCode: 409 });
    expect(await Invoice.countDocuments({ sourceQuotation })).toBe(1);
  });

  it.each(['sourceQuotation', 'sourceRevision', 'sourceRevisionVersion'])(
    'rejects reassignment of %s through the draft service', async (field) => {
      const invoice = await createInvoice(input, user);

      await expect(updateInvoice(invoice._id, { [field]: field === 'sourceRevisionVersion' ? 9 : other }))
        .rejects.toMatchObject({ statusCode: 400 });
    },
  );

  it('keeps provenance immutable through model updates and document saves', async () => {
    const invoice = await createInvoice(input, user);

    await Invoice.updateOne({ _id: invoice._id }, { $set: {
      sourceQuotation: other, sourceRevision: other, sourceRevisionVersion: 9, notes: 'Allowed edit',
    } });
    invoice.sourceQuotation = other;
    invoice.sourceRevision = other;
    invoice.sourceRevisionVersion = 8;
    await invoice.save();

    const stored = await Invoice.findById(invoice._id).lean();
    expect(String(stored.sourceQuotation)).toBe(String(sourceQuotation));
    expect(String(stored.sourceRevision)).toBe(String(revisionId));
    expect(stored.sourceRevisionVersion).toBe(1);
    expect(stored.notes).toBe('Allowed edit');
  });
});

describe('revision provenance input boundary', () => {
  it('requires a family for a revision and ignores caller-supplied version numbers', () => {
    expect(createInvoiceSchema.safeParse({ ...input, sourceQuotation: undefined }).success).toBe(false);
    const parsed = createInvoiceSchema.parse({ ...input, sourceRevisionVersion: 999 });
    expect(parsed.sourceRevision).toBe(String(revisionId));
    expect(parsed).not.toHaveProperty('sourceRevisionVersion');
  });

  it.each(['', 'invalid', null, { $ne: null }])('rejects invalid revision %j', (sourceRevision) => {
    expect(createInvoiceSchema.safeParse({ ...input, sourceRevision }).success).toBe(false);
  });

  it('strips provenance from HTTP draft edits', () => {
    expect(updateInvoiceSchema.parse({ ...input, sourceRevisionVersion: 9 }))
      .not.toHaveProperty('sourceRevision');
  });
});
