import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import express from 'express';
import { once } from 'node:events';
import Client from '../../clients/client.model.js';
import Quotation from '../../quotations/quotation.model.js';
import Invoice from '../invoice.model.js';
import { createInvoiceSchema, invoicesQuerySchema, updateInvoiceSchema } from '../invoice.validation.js';
import { createInvoice, getInvoices, updateInvoice } from '../invoice.service.js';
import { findBySourceQuotation } from '../invoice.repository.js';
import * as invoiceController from '../invoice.controller.js';
import validate, { validateQuery } from '../../../middleware/validate.js';

vi.mock('../../../services/emailService.js', () => ({ sendEmail: vi.fn(), renderInvoiceEmail: vi.fn() }));
vi.mock('../../../services/pdfService.js', () => ({ generateInvoicePdf: vi.fn(), generateInvoiceHtml: vi.fn() }));
vi.mock('../../../utils/logger.js', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('../../notifications/notification.service.js', () => ({}));

const client = '507f1f77bcf86cd799439011';
const sourceQuotation = '507f1f77bcf86cd799439012';
const project = '507f1f77bcf86cd799439013';
const other = '507f1f77bcf86cd799439014';
const user = { _id: '507f1f77bcf86cd799439015' };
const reviewed = {
  client, project, sourceQuotation,
  issueDate: '2026-11-02', dueDate: '2026-12-02',
  items: [{ description: 'Reviewed scope', quantity: 2, unitPrice: 1450 }],
  taxRate: 5, discountPercent: 10,
  billingAddress: { street: 'Reviewed address', country: 'India' },
  notes: 'Reviewed notes', termsConditions: 'Reviewed terms',
};

describe('invoice provenance boundary', () => {
  it.each(['', 'invalid', '507f1f77bcf86cd79943901', null, { $ne: null }])(
    'rejects create and discovery when sourceQuotation is %j', (value) => {
      const input = { ...reviewed, sourceQuotation: value };

      const create = createInvoiceSchema.safeParse(input);
      const query = invoicesQuerySchema.safeParse({ sourceQuotation: value });

      expect(create.success).toBe(false);
      expect(query.success).toBe(false);
    },
  );

  it('preserves provenance when create and discovery IDs are valid', () => {
    const input = { ...reviewed };

    const create = createInvoiceSchema.parse(input);
    const query = invoicesQuerySchema.parse({ sourceQuotation });

    expect(create.sourceQuotation).toBe(sourceQuotation);
    expect(query.sourceQuotation).toBe(sourceQuotation);
  });

  it('does not permit provenance replacement through draft input', () => {
    const input = { sourceQuotation: other, notes: 'Updated notes' };

    const update = updateInvoiceSchema.parse(input);

    expect(update).toEqual({ notes: 'Updated notes' });
  });

  it('keeps ordinary invoices outside the quotation index when provenance is absent', () => {
    const { sourceQuotation: omitted, ...input } = reviewed;

    const invoice = new Invoice({ ...input, invoiceNumber: 'INV-PG-0001', createdBy: user._id });

    expect(invoice.validateSync()).toBeUndefined();
    expect(invoice.toObject()).not.toHaveProperty('sourceQuotation');
  });

  it('declares uniqueness only for ObjectId provenance, excluding null and missing values', () => {
    const indexes = Invoice.schema.indexes();

    const index = indexes.find(([keys]) => keys.sourceQuotation === 1);

    expect(index?.[1]).toMatchObject({
      unique: true, partialFilterExpression: { sourceQuotation: { $type: 'objectId' } },
    });
    expect(Invoice.schema.path('sourceQuotation').options).toMatchObject({ ref: 'Quotation', immutable: true });
  });
});

describe('reviewed invoice creation', () => {
  let stored;
  let insert;

  beforeEach(() => {
    stored = [];
    vi.spyOn(Client, 'findById').mockReturnValue({ select: vi.fn().mockResolvedValue({ brand: 'panigrahna' }) });
    vi.spyOn(Quotation, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(new Quotation({ client, project, price: 99999, taxRate: 18 })),
    });
    vi.spyOn(Invoice, 'findOne').mockImplementation(async (filter) =>
      stored.find((invoice) => String(invoice.sourceQuotation) === filter.sourceQuotation) || null);
    vi.spyOn(Invoice, 'countDocuments').mockResolvedValue(0);
    insert = vi.spyOn(Invoice, 'create').mockImplementation(async (payload) => {
      const invoice = new Invoice(payload);
      await invoice.validate();
      stored.push(invoice);
      return invoice;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('retains editable reviewed values when linked client and project match', async () => {
    const input = createInvoiceSchema.parse(reviewed);

    const invoice = await createInvoice(input, user);

    expect(String(invoice.sourceQuotation)).toBe(sourceQuotation);
    expect(String(invoice.client)).toBe(client);
    expect(String(invoice.project)).toBe(project);
    expect(invoice.toObject()).toMatchObject({
      status: 'draft', items: [{ ...reviewed.items[0], amount: 0 }],
      taxRate: 5, discountPercent: 10, billingAddress: reviewed.billingAddress,
      notes: reviewed.notes, termsConditions: reviewed.termsConditions,
      issueDate: new Date(reviewed.issueDate), dueDate: new Date(reviewed.dueDate),
    });
  });

  it('rejects a second create when the quotation already has an invoice', async () => {
    await createInvoice(reviewed, user);

    const result = createInvoice(reviewed, user);

    await expect(result).rejects.toMatchObject({ statusCode: 409 });
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing client', 'client', null, 404],
    ['missing quotation', 'quotation', null, 404],
    ['different client', 'quotation', { client: other, project }, 400],
    ['different project', 'quotation', { client, project: other }, 400],
  ])('rejects creation when there is a %s', async (_label, lookup, document, statusCode) => {
    const model = lookup === 'client' ? Client : Quotation;
    model.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(document) });

    const result = createInvoice(reviewed, user);

    await expect(result).rejects.toMatchObject({ statusCode });
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([undefined, null, ''])('rejects creation when a linked quotation project is omitted as %j', async (value) => {
    const input = { ...reviewed, project: value };

    const result = createInvoice(input, user);

    await expect(result).rejects.toMatchObject({ statusCode: 400 });
    expect(insert).not.toHaveBeenCalled();
  });

  it('allows reviewed project selection when the quotation has no project', async () => {
    Quotation.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(new Quotation({ client })) });

    const invoice = await createInvoice(reviewed, user);

    expect(String(invoice.project)).toBe(project);
  });

  it('preserves ordinary create behavior when provenance is absent', async () => {
    const { sourceQuotation: omitted, ...input } = reviewed;

    const invoice = await createInvoice(input, user);

    expect(invoice.sourceQuotation).toBeUndefined();
    expect(Quotation.findById).not.toHaveBeenCalled();
    expect(Invoice.findOne).not.toHaveBeenCalled();
    expect(invoice.invoiceNumber).toBe('INV-PG-0001');
  });

  it('returns conflict when the unique provenance index wins a concurrent create', async () => {
    insert.mockRejectedValueOnce(new mongoose.mongo.MongoServerError({ code: 11000, keyPattern: { sourceQuotation: 1 } }));

    const result = createInvoice(reviewed, user);

    await expect(result).rejects.toMatchObject({ statusCode: 409 });
  });

  it('returns conflict when a concurrent invoice first collides on its invoice number', async () => {
    insert.mockImplementationOnce(async (payload) => {
      stored.push(new Invoice(payload));
      throw new mongoose.mongo.MongoServerError({ code: 11000, keyPattern: { invoiceNumber: 1 } });
    });

    const result = createInvoice(reviewed, user);

    await expect(result).rejects.toMatchObject({ statusCode: 409 });
  });

  it('propagates unrelated duplicate errors when no invoice has that provenance', async () => {
    const error = new mongoose.mongo.MongoServerError({ code: 11000, keyPattern: { invoiceNumber: 1 } });
    insert.mockRejectedValueOnce(error);

    const result = createInvoice(reviewed, user);

    await expect(result).rejects.toBe(error);
  });

  it('propagates storage failures when creation fails for another reason', async () => {
    const error = new mongoose.mongo.MongoServerError({ code: 121 });
    insert.mockRejectedValueOnce(error);

    const result = createInvoice(reviewed, user);

    await expect(result).rejects.toBe(error);
  });

  it('finds the created invoice when looking up its quotation', async () => {
    const created = await createInvoice(reviewed, user);

    const invoice = await findBySourceQuotation(sourceQuotation);

    expect(invoice).toBe(created);
  });

  it('keeps edits draft-only when an invoice originated from a quotation', async () => {
    const invoice = new Invoice({ ...reviewed, status: 'sent' });
    vi.spyOn(Invoice, 'findById').mockReturnValue({ populate: () => ({ populate: () => ({ populate: async () => invoice }) }) });

    const result = updateInvoice(other, { notes: 'Changed' });

    await expect(result).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns HTTP conflict and discovers the original when the reviewed form is submitted twice', async () => {
    const find = Invoice.find.bind(Invoice);
    vi.spyOn(Invoice, 'find').mockImplementation((filter) => {
      const query = find(filter);
      vi.spyOn(query, 'exec').mockImplementation(async () => stored.filter((invoice) =>
        String(invoice.sourceQuotation) === filter.sourceQuotation));
      return query;
    });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.user = user; next(); });
    app.post('/invoices', validate(createInvoiceSchema), invoiceController.create);
    app.get('/invoices', validateQuery(invoicesQuerySchema), invoiceController.list);
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/invoices`;

    try {
      const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reviewed) };
      const created = await fetch(base, options);
      const original = await created.json();
      const duplicate = await fetch(base, options);
      const discovery = await fetch(`${base}?sourceQuotation=${sourceQuotation}`);
      const found = await discovery.json();
      const invalid = await fetch(`${base}?sourceQuotation=invalid`);

      expect(created.status).toBe(201);
      expect(duplicate.status).toBe(409);
      expect(discovery.status).toBe(200);
      expect(found.data.map((invoice) => invoice._id)).toEqual([original.data.invoice._id]);
      expect(invalid.status).toBe(400);
      expect(insert).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});

describe('invoice discovery', () => {
  afterEach(() => vi.restoreAllMocks());

  it('applies provenance to both results and pagination when listing for a client', async () => {
    const query = Invoice.find();
    const invoice = new Invoice(reviewed);
    vi.spyOn(query, 'exec').mockResolvedValue([invoice]);
    vi.spyOn(Invoice, 'find').mockImplementation((filter) => query.find(filter));
    const count = vi.spyOn(Invoice, 'countDocuments').mockResolvedValue(1);

    const result = await getInvoices(invoicesQuerySchema.parse({ sourceQuotation }), user, { _id: client });

    expect(query.getFilter()).toEqual({ sourceQuotation, client, status: { $nin: ['cancelled'] } });
    expect(count).toHaveBeenCalledWith(query.getFilter());
    expect(result.invoices).toEqual([invoice]);
    expect(result.pagination.total).toBe(1);
  });
});
