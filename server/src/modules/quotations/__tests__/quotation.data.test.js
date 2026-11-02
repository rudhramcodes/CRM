import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Client from '../../clients/client.model.js';
import Project from '../../projects/project.model.js';
import Quotation from '../quotation.model.js';
import * as repository from '../quotation.repository.js';
import { createQuotation, getQuotationDefaults, updateQuotation } from '../quotation.service.js';
import { createQuotationSchema, updateQuotationSchema } from '../quotation.validation.js';

vi.mock('../../../services/emailService.js', () => ({ sendEmail: vi.fn(), renderQuotationEmail: vi.fn() }));

const clientId = new mongoose.Types.ObjectId().toString();
const user = { _id: new mongoose.Types.ObjectId() };
const client = {
  _id: clientId, brand: 'panigrahna', companyName: 'Test Wedding Client',
  clientId: 'RE-PG-TEST', email: 'wedding@example.com', phone: '1234567890',
  gstNumber: 'CLIENT-GST', address: { street: 'Real Client Street', city: 'Pune' },
};
const printedFields = {
  recipientName: 'Edited Recipient', recipientAddress: 'Edited Address',
  recipientEmail: 'edited@example.com', recipientPhone: '0987654321', recipientGst: 'EDITED-GST',
  clientReference: 'CUSTOM-CLIENT', projectReference: 'CUSTOM-PROJECT',
  issuerName: 'Edited Issuer', issuerAddress: 'Edited Office', issuerEmail: 'office@example.com',
  issuerPhone: '1111111111', issuerWebsite: 'https://example.com', issuerGst: 'ISSUER-GST',
  bankName: 'Edited Bank', bankAccountName: 'Edited Account Holder', bankAccountNumber: '00123456',
  bankIfsc: 'EDITED-IFSC', bankGst: 'BANK-GST', bankUpi: 'edited@bank',
  signatoryName: 'Edited Signatory', closingNote: 'Edited Closing', paymentTerms: 'Edited Terms',
  conditions: 'Detailed condition.\n'.repeat(200).trim(),
};

beforeEach(() => {
  vi.spyOn(Client, 'findById').mockImplementation(() => ({
    select: async (fields) => Object.fromEntries(
      fields.split(' ').map((field) => [field, client[field]]),
    ),
  }));
  vi.spyOn(repository, 'getQuotationCountByPrefix').mockResolvedValue(0);
  vi.spyOn(repository, 'create').mockImplementation(async (payload) => {
    const document = new Quotation(payload);
    await document.validate();
    return document.toObject();
  });
});

afterEach(() => vi.restoreAllMocks());

describe('quotation data contract', () => {
  it.each([
    ['panigrahna', undefined, 'panigrahna'],
    ['aghori', undefined, 'standard'],
    ['panigrahna', 'standard', 'standard'],
    ['aghori', 'panigrahna', 'panigrahna'],
  ])('persists %s client template %s as %s when creating', async (brand, templateId, expected) => {
    vi.mocked(Client.findById).mockReturnValue({ select: async () => ({ ...client, brand }) });
    const input = createQuotationSchema.parse({ client: clientId, templateId });

    const saved = await createQuotation(input, user);

    expect(saved.templateId).toBe(expected);
  });

  it('preserves every printed field when validated and created', async () => {
    const input = createQuotationSchema.parse({ client: clientId, ...printedFields });

    const saved = await createQuotation(input, user);

    expect(saved).toMatchObject(printedFields);
  });

  it('preserves explicit blank content and empty scope when creating', async () => {
    const blanks = Object.fromEntries(Object.keys(printedFields).map((field) => [field, '']));
    const input = createQuotationSchema.parse({
      client: clientId, ...blanks, salutation: '', subject: '', letterBody: '',
      letterSignoff: '', scopeTitle: '', scopeIntro: '', scopeOfWork: [], deliverables: '', note: '',
      budget: 0, price: 0, taxRate: 0,
    });

    const saved = await createQuotation(input, user);

    expect(saved).toMatchObject({ ...input, client: new mongoose.Types.ObjectId(clientId) });
  });

  it('returns selected client and project snapshot fields when fetching defaults', async () => {
    const projectId = new mongoose.Types.ObjectId().toString();
    vi.spyOn(Project, 'findById').mockReturnValue({
      select: async () => ({ client: clientId, title: 'Wedding Coverage', budget: 32100, projectCode: 'PRJ-TEST' }),
    });

    const defaults = await getQuotationDefaults({ clientId, projectId });

    expect(defaults).toMatchObject({
      templateId: 'panigrahna', recipientName: client.companyName, recipientEmail: client.email,
      recipientPhone: client.phone, recipientAddress: 'Real Client Street, Pune',
      recipientGst: client.gstNumber, clientReference: client.clientId,
      projectReference: 'PRJ-TEST', scopeTitle: 'Wedding Coverage', budget: 32100, price: 32100,
    });
    expect(Object.keys(printedFields).every((field) => typeof defaults[field] === 'string')).toBe(true);
  });

  it('persists a manual template and document edits when updating a draft', async () => {
    const saved = new Quotation({
      client: clientId, createdBy: user._id, quotationNumber: 'QTN-PG-TEST', templateId: 'panigrahna',
    });
    vi.spyOn(repository, 'findById').mockResolvedValue(saved);
    vi.spyOn(repository, 'updateById').mockImplementation(async (_id, changes) => {
      saved.set(changes);
      await saved.validate();
      return saved.toObject();
    });
    const input = updateQuotationSchema.parse({ ...printedFields, templateId: 'standard', closingNote: '' });

    const updated = await updateQuotation(saved._id, input);

    expect(updated).toMatchObject({ ...printedFields, templateId: 'standard', closingNote: '' });
  });

  it('leaves a saved manual choice unchanged when updating unrelated content', async () => {
    const saved = new Quotation({
      client: clientId, createdBy: user._id, quotationNumber: 'QTN-PG-TEST', templateId: 'standard',
    });
    vi.spyOn(repository, 'findById').mockResolvedValue(saved);
    vi.spyOn(repository, 'updateById').mockImplementation(async (_id, changes) => {
      saved.set(changes);
      return saved.toObject();
    });

    const updated = await updateQuotation(saved._id, updateQuotationSchema.parse({ note: 'Edited note' }));

    expect(updated.templateId).toBe('standard');
  });

  it('leaves template and printed fields absent when hydrating historical records', () => {
    const historical = { _id: new mongoose.Types.ObjectId(), quotationNumber: 'OLD-QUOTE', client: clientId };

    const document = Quotation.hydrate(historical).toObject();

    expect(document.templateId).toBeUndefined();
    expect(document.recipientName).toBeUndefined();
    expect(document.bankAccountNumber).toBeUndefined();
  });

  it.each([createQuotationSchema, updateQuotationSchema])('rejects unsupported templates and excessive conditions', (schema) => {
    const input = { client: clientId };

    const invalidTemplate = schema.safeParse({ ...input, templateId: 'unsupported' });
    const excessiveConditions = schema.safeParse({ ...input, conditions: 'x'.repeat(20001) });

    expect(invalidTemplate.success).toBe(false);
    expect(excessiveConditions.success).toBe(false);
  });
});
