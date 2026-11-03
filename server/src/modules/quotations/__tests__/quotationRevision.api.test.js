import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import Quotation from '../quotation.model.js';
import Client from '../../clients/client.model.js';
import Project from '../../projects/project.model.js';
import User from '../../auth/auth.model.js';
import { setupRevisionApi } from './quotationRevision.fixture.js';
import { getInvoiceSource } from '../quotationRevision.service.js';

let api;
beforeAll(async () => { api = await setupRevisionApi(); }, 10000);
afterAll(async () => { await api?.close(); });

describe('quotation revision API', () => {
  it('requires authentication and the existing administrator role', async () => {
    const unauthenticated = await api.request('GET', '/', undefined, false);
    expect(unauthenticated.status).toBe(401);
    await User.collection.updateOne({ _id: api.actor._id }, { $set: { role: 'employee' } });
    try {
      expect((await api.request('GET', '/')).status).toBe(403);
    } finally {
      await User.collection.updateOne({ _id: api.actor._id }, { $set: { role: 'admin' } });
    }
  });

  it('creates one unsaved family with a full independent working copy', async () => {
    const quote = await api.create();
    expect(quote).toMatchObject({ schemaVersion: 2, latestVersion: 0, hasWorkingCopy: true, revisions: [],
      workingCopy: { sourceVersion: 0, baseVersion: 0, editVersion: 0, content: { client: { companyName: 'Original Company' }, total: 1180 } } });
  });

  it('atomically saves only one concurrent revision and cleans losing artifacts', async () => {
    const quote = await api.create();
    const files = mongoose.connection.db.collection('quotationArtifacts.files');
    const before = await files.countDocuments();
    const results = await Promise.all([api.save(quote._id), api.save(quote._id)]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    const saved = results.find((result) => result.status === 201).json.data;
    expect(saved.quotation).toMatchObject({ latestVersion: 1, workingCopy: null, status: 'draft' });
    expect(saved.revision.content.client.companyName).toBe('Original Company');
    expect(saved.quotation.revisions[0].content).toBeUndefined();
    expect(saved.quotation.revisions[0].artifacts).toBeUndefined();
    expect(await files.countDocuments()).toBe(before + 2);
  }, 30000);

  it('serves identical stored bytes after client and template-related working edits', async () => {
    const quote = await api.create();
    await api.save(quote._id);
    const original = await api.request('GET', `/${quote._id}/revisions/1/html`);
    const originalPdf = await api.request('GET', `/${quote._id}/revisions/1/pdf`);
    await Client.updateOne({ _id: api.client._id }, { $set: { companyName: 'Changed Company' } });
    await api.request('POST', `/${quote._id}/working-copy`, { sourceVersion: 1, baseVersion: 1 });
    await api.request('PATCH', `/${quote._id}/working-copy`, { baseVersion: 1, editVersion: 0, changes: { templateId: 'panigrahna', price: 4000 } });
    const historical = await api.request('GET', `/${quote._id}/html`);
    const historicalPdf = await api.request('GET', `/${quote._id}/pdf`);
    expect(historical.bytes.equals(original.bytes)).toBe(true);
    expect(historicalPdf.bytes.equals(originalPdf.bytes)).toBe(true);
    expect(original.bytes.toString()).not.toMatch(/<script|contenteditable/i);
    expect(original.bytes.toString()).toContain(`${quote.quotationNumber} V1`);
    const root = await api.request('GET', `/${quote._id}`);
    expect(root.json.data.quotation.price).toBe(1000);
    expect(root.json.data.quotation.workingCopy.content.price).toBe(4000);
    await Client.updateOne({ _id: api.client._id }, { $set: { companyName: 'Original Company' } });
  }, 20000);

  it('rejects stale edit and discard tokens without overwriting the winning edit', async () => {
    const quote = await api.create();
    const edits = await Promise.all(['Winner A', 'Winner B'].map((note) => api.request('PATCH', `/${quote._id}/working-copy`, {
      baseVersion: 0, editVersion: 0, changes: { note },
    })));
    expect(edits.map((result) => result.status).sort()).toEqual([200, 409]);
    expect((await api.request('POST', `/${quote._id}/working-copy/discard`, { baseVersion: 0, editVersion: 0 })).status).toBe(409);
    expect((await api.save(quote._id)).status).toBe(409);
  });

  it('saves V2 in the same family and retains V1 content and exact artifacts', async () => {
    const quote = await api.create();
    const first = await api.save(quote._id);
    const v1 = await api.request('GET', `/${quote._id}/revisions/1/pdf`);
    await api.request('POST', `/${quote._id}/working-copy`, { sourceVersion: 1, baseVersion: 1 });
    await api.request('PATCH', `/${quote._id}/working-copy`, { baseVersion: 1, editVersion: 0, changes: { price: 2000, recipientName: 'New Recipient' } });
    const second = await api.save(quote._id, { baseVersion: 1, editVersion: 1, revisionNote: 'Price changed' });
    expect(second.status).toBe(201);
    expect(second.json.data.quotation).toMatchObject({ _id: quote._id, latestVersion: 2, price: 2000, total: 2360, workingCopy: null });
    expect(second.json.data.revision).toMatchObject({ version: 2, status: 'draft', revisionNote: 'Price changed' });
    expect(second.json.data.revision.changedFields).toEqual(expect.arrayContaining(['price', 'recipientName', 'taxAmount', 'total']));
    const original = await api.request('GET', `/${quote._id}/revisions/1`);
    expect(original.json.data.revision.content).toEqual(first.json.data.revision.content);
    expect((await api.request('GET', `/${quote._id}/revisions/1/pdf`)).bytes.equals(v1.bytes)).toBe(true);
    expect(await Quotation.countDocuments({ _id: quote._id })).toBe(1);
  }, 20000);

  it('validates dates after merging a partial edit', async () => {
    const quote = await api.create();
    const result = await api.request('PATCH', `/${quote._id}/working-copy`, {
      baseVersion: 0, editVersion: 0, changes: { issueDate: '2026-03-01' },
    });
    expect(result.status).toBe(400);
    expect((await Quotation.findById(quote._id)).workingCopy.editVersion).toBe(0);
  });

  it('resolves ID-only legacy snapshots for new and existing working-copy logos without changing saved PDFs', async () => {
    const quote = await api.create();
    await api.save(quote._id);
    const original = await api.request('GET', `/${quote._id}/revisions/1/pdf`);
    await Quotation.collection.updateOne({ _id: new mongoose.Types.ObjectId(quote._id) }, {
      $set: { 'revisions.0.content.client': api.client._id },
    });
    const copy = await api.request('POST', `/${quote._id}/working-copy`, { sourceVersion: 1, baseVersion: 1 });
    expect(copy.json.data.quotation.workingCopy.content.client.brand).toBe('aghori');
    await Quotation.collection.updateOne({ _id: new mongoose.Types.ObjectId(quote._id) }, {
      $set: { 'workingCopy.content.client': api.client._id },
    });
    const preview = await api.request('GET', `/${quote._id}/working-copy/html`);
    expect(preview.status).toBe(200);
    expect(preview.bytes.toString()).toContain('alt="AGHHORI"');
    const saved = await api.save(quote._id, { baseVersion: 1, editVersion: 0 });
    expect(saved.json.data.revision.content.client.brand).toBe('aghori');
    expect((await api.request('GET', `/${quote._id}/revisions/1/pdf`)).bytes.equals(original.bytes)).toBe(true);
  }, 30000);

  it('validates initial dates against the resolved issue date when it is omitted', async () => {
    const result = await api.request('POST', '/', { client: String(api.client._id), validUntil: '2000-01-01' });
    expect(result.status).toBe(400);
  });

  it('rejects a project owned by another client before mutating a working copy', async () => {
    const quote = await api.create();
    const projectId = new mongoose.Types.ObjectId();
    await Project.collection.insertOne({ _id: projectId, client: new mongoose.Types.ObjectId(), title: 'Foreign project' });
    const result = await api.request('PATCH', `/${quote._id}/working-copy`, {
      baseVersion: 0, editVersion: 0, changes: { project: String(projectId) },
    });
    expect(result.status).toBe(400);
  });

  it('locks family ownership and rejects invalid source versions and foreign invoice revisions', async () => {
    const quote = await api.create();
    const saved = await api.save(quote._id);
    expect((await api.request('POST', `/${quote._id}/working-copy`, { sourceVersion: 9, baseVersion: 1 })).status).toBe(400);
    await api.request('POST', `/${quote._id}/working-copy`, { sourceVersion: 1, baseVersion: 1 });
    expect((await api.request('PATCH', `/${quote._id}/working-copy`, {
      baseVersion: 1, editVersion: 0, changes: { client: String(new mongoose.Types.ObjectId()) },
    })).status).toBe(400);
    await expect(getInvoiceSource(quote._id, new mongoose.Types.ObjectId())).rejects.toMatchObject({ statusCode: 400 });
    const source = await getInvoiceSource(quote._id, saved.json.data.revision._id);
    expect(source).toMatchObject({ version: 1, status: 'draft', clientId: api.client._id, content: { price: 1000 } });
  }, 15000);

  it('archives without hiding history and excludes the family from lists and stats', async () => {
    const quote = await api.create();
    const before = await api.request('GET', '/stats');
    expect((await api.request('PATCH', `/${quote._id}/archive`, { baseVersion: 9, archived: true })).status).toBe(409);
    expect((await api.request('PATCH', `/${quote._id}/archive`, { baseVersion: 0, archived: true })).status).toBe(200);
    expect((await api.request('GET', `/${quote._id}`)).status).toBe(200);
    const list = await api.request('GET', '/?limit=100');
    expect(list.json.data.some((row) => row._id === quote._id)).toBe(false);
    const archived = await api.request('GET', '/?archived=true');
    expect(archived.json.data.map((row) => row._id)).toContain(quote._id);
    const after = await api.request('GET', '/stats');
    expect(after.json.data.total).toBe(before.json.data.total - 1);
    expect((await api.save(quote._id)).status).toBe(409);
    await expect(getInvoiceSource(quote._id, new mongoose.Types.ObjectId())).rejects.toMatchObject({ statusCode: 409 });
    expect((await api.request('PATCH', `/${quote._id}/archive`, { baseVersion: 0, archived: false })).status).toBe(200);
  });

  it.each(['PATCH', 'DELETE'])('rejects root %s for a versioned quotation', async (method) => {
    const quote = await api.create();
    expect((await api.request(method, `/${quote._id}`, method === 'PATCH' ? { price: 2 } : undefined)).status).toBe(409);
  });

  it('creates a truthful idempotent legacy baseline only on explicit request', async () => {
    const projectId = new mongoose.Types.ObjectId();
    await Project.collection.insertOne({ _id: projectId, client: api.client._id, title: 'Legacy Project', projectCode: 'LEGACY-PRJ', budget: 1000 });
    const legacy = await Quotation.create({ client: api.client._id, project: projectId, quotationNumber: 'LEGACY-BASELINE', createdBy: api.actor._id, status: 'draft', issueDate: '2026-01-01' });
    await api.request('GET', `/${legacy._id}`);
    expect((await Quotation.findById(legacy._id)).schemaVersion).toBeUndefined();
    const baseline = await api.request('POST', `/${legacy._id}/revisions/baseline`, {});
    expect(baseline.status).toBe(200);
    expect(baseline.json.data.quotation).toMatchObject({ latestVersion: 1, workingCopy: { baseVersion: 1, sourceVersion: 1 },
      revisions: [{ provenance: 'legacy_reconstructed', originalArtifactAvailable: false, status: 'draft' }] });
    const detail = await api.request('GET', `/${legacy._id}/revisions/1`);
    expect(detail.json.data.revision.content.client).toMatchObject({ _id: String(api.client._id), brand: 'aghori', companyName: 'Original Company' });
    expect(detail.json.data.revision.content.project).toMatchObject({ _id: String(projectId), title: 'Legacy Project', projectCode: 'LEGACY-PRJ' });
    const again = await api.request('POST', `/${legacy._id}/revisions/baseline`, {});
    expect(again.json.data.quotation.revisions).toHaveLength(1);
  }, 15000);
});
