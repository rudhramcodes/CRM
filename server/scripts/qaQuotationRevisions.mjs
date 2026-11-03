import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer';
import { chromium, expect } from '@playwright/test';
import config from '../src/config/index.js';
import User from '../src/modules/auth/auth.model.js';
import Client from '../src/modules/clients/client.model.js';
import Quotation from '../src/modules/quotations/quotation.model.js';
import quotationRoutes from '../src/modules/quotations/quotation.routes.js';
import clientRoutes from '../src/modules/clients/client.routes.js';
import projectRoutes from '../src/modules/projects/project.routes.js';
import invoiceRoutes from '../src/modules/invoices/invoice.routes.js';
import notificationRoutes from '../src/modules/notifications/notification.routes.js';
import errorHandler from '../src/middleware/errorHandler.js';

// Runs against the local app. It creates and removes only its own QA fixtures;
// send/resend dialogs are inspected and cancelled, never submitted.
const frontend = process.env.QUOTATION_QA_URL || 'http://localhost:5173';
const evidence = process.env.QUOTATION_QA_OUTPUT || path.join(tmpdir(), 'opencode');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const dbName = `quotation_revision_ui_${randomUUID().replaceAll('-', '')}`;
await mongoose.connect('mongodb://127.0.0.1:27017', { dbName, serverSelectionTimeoutMS: 5000 });
const app = express();
app.use(cors({ origin: frontend, credentials: true }));
app.use(express.json(), cookieParser());
app.use('/api/quotations', quotationRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use(errorHandler);
const server = createServer(app);
const listening = once(server, 'listening');
server.listen(0, '127.0.0.1');
await listening;
const apiBase = `http://127.0.0.1:${server.address().port}/api`;
let browser;
let clientId;
let quotationId;

try {
  await Quotation.init();
  const actor = { _id: new mongoose.Types.ObjectId(), name: 'Revision QA Admin', email: 'revision-admin@example.invalid', role: 'admin', isActive: true, isEmailVerified: true, onboardingCompleted: true, mustChangePassword: false };
  await User.collection.insertOne(actor);
  const user = await User.findById(actor._id).select('_id name email role permissions isEmailVerified onboardingCompleted mustChangePassword');
  const fixture = await Client.create({
    companyName: `Quotation Revision QA ${randomUUID()}`, contactPerson: 'Revision QA',
    email: `revision-qa-${randomUUID()}@example.invalid`, brand: 'aghori',
    address: { street: 'QA fixture street', city: 'Mumbai' }, createdBy: user._id,
  });
  clientId = fixture._id;
  browser = await chromium.launch({ headless: true, executablePath: await puppeteer.executablePath() });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const token = jwt.sign({ userId: String(user._id) }, config.jwt.secret, { expiresIn: '30m' });
  await context.route('**/api/**', (route) => {
    const original = new URL(route.request().url());
    const rewritten = `${apiBase}${original.pathname.slice('/api'.length)}${original.search}`;
    return route.continue({ url: rewritten, headers: { ...route.request().headers(), authorization: `Bearer ${token}` } });
  });
  await context.addInitScript((localUser) => localStorage.setItem('user', JSON.stringify(localUser)), user.toObject());
  const request = async (method, route, data) => {
    const response = await context.request.fetch(`${apiBase}${route}`, { method, data, headers: { authorization: `Bearer ${token}` }, timeout: 45000 });
    assert.ok(response.ok(), `${method} ${route}: ${response.status()} ${await response.text()}`);
    return response;
  };
  const family = async () => (await (await request('GET', `/quotations/${quotationId}`)).json()).data.quotation;
  const created = await (await request('POST', '/quotations', {
    client: String(clientId), templateId: 'standard', price: 10000, taxRate: 18,
    issueDate: '2026-11-03', validUntil: '2026-12-03',
    scopeTitle: 'Original scope', letterBody: 'Original quotation body for revision QA.',
  })).json();
  quotationId = created.data.quotation._id;
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${frontend}/quotations/${quotationId}`);
  await expect(page.getByRole('button', { name: 'Save Revision', exact: true })).toBeVisible({ timeout: 20000 });

  const saveVersion = async (note) => {
    await page.getByRole('button', { name: 'Save Revision', exact: true }).click();
    const form = page.getByRole('form', { name: 'Save quotation revision' });
    await form.getByRole('textbox', { name: 'Revision note' }).fill(note);
    const saved = page.waitForResponse((response) => response.url().endsWith(`/quotations/${quotationId}/revisions`) && response.request().method() === 'POST', { timeout: 45000 });
    await form.getByRole('button', { name: 'Save Revision', exact: true }).click();
    const response = await saved;
    assert.ok(response.ok(), await response.text());
    return (await response.json()).data.revision;
  };
  const original = await saveVersion('Original quotation');
  assert.equal(original.version, 1);
  const originalPdf = await (await request('GET', `/quotations/${quotationId}/revisions/1/pdf`)).body();
  const originalHash = hash(originalPdf);
  await expect(page.getByRole('button', { name: 'Send V1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Send V1', exact: true }).click();
  await expect(page.getByText(`Submit the saved V1 PDF to ${fixture.email}?`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  const acceptance = page.waitForResponse((response) => response.url().endsWith('/revisions/1/status') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Mark accepted', exact: true }).click();
  assert.ok((await acceptance).ok());
  await page.getByRole('button', { name: 'Create revision from V1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit working draft', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit working draft', exact: true }).click();
  const editForm = page.getByRole('form', { name: 'Save Working Draft' });
  await editForm.locator('[name="price"]').fill('25000');
  await editForm.locator('[name="letterBody"]').fill('Revised quotation body for revision QA.');
  const draftSaved = page.waitForResponse((response) => response.url().endsWith('/working-copy') && response.request().method() === 'PATCH');
  await editForm.getByRole('button', { name: 'Save Working Draft', exact: true }).click();
  assert.ok((await draftSaved).ok());
  const revised = await saveVersion('Updated price and scope');
  assert.equal(revised.version, 2);
  const oldVersion = (await (await request('GET', `/quotations/${quotationId}/revisions/1`)).json()).data.revision;
  const newVersion = (await (await request('GET', `/quotations/${quotationId}/revisions/2`)).json()).data.revision;
  assert.equal(oldVersion.content.price, 10000);
  assert.equal(oldVersion.status, 'accepted');
  assert.equal(newVersion.content.price, 25000);
  assert.equal(newVersion.status, 'draft');
  assert.equal(hash(await (await request('GET', `/quotations/${quotationId}/revisions/1/pdf`)).body()), originalHash);

  await page.getByRole('button', { name: 'Version V1', exact: true }).click();
  await expect(page.getByText('Viewing older version V1.', { exact: false })).toBeVisible();
  await expect(page.frameLocator('iframe').locator('body')).toContainText('Original quotation body for revision QA.', { timeout: 20000 });
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download version V1', exact: true }).click();
  assert.ok((await downloadEvent).suggestedFilename().endsWith('-V1.pdf'));
  await page.screenshot({ path: path.join(evidence, 'quotation-revisions-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.screenshot({ path: path.join(evidence, 'quotation-revisions-mobile.png'), animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 1440, height: 1100 });

  await request('POST', `/quotations/${quotationId}/working-copy`, { sourceVersion: 1, baseVersion: 2 });
  const copy = (await family()).workingCopy;
  await request('PATCH', `/quotations/${quotationId}/working-copy`, { baseVersion: 2, editVersion: copy.editVersion, changes: { note: 'Concurrent change' } });
  const conflict = await context.request.patch(`${apiBase}/quotations/${quotationId}/working-copy`, { headers: { authorization: `Bearer ${token}` }, data: { baseVersion: 2, editVersion: copy.editVersion, changes: { price: 999 } } });
  assert.equal(conflict.status(), 409);
  const latestCopy = (await family()).workingCopy;
  await request('POST', `/quotations/${quotationId}/working-copy/discard`, { baseVersion: 2, editVersion: latestCopy.editVersion });
  await page.reload();
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  const archived = page.waitForResponse((response) => response.url().endsWith('/archive') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Archive', exact: true }).last().click();
  assert.ok((await archived).ok());
  assert.ok((await family()).archivedAt);
  await page.getByRole('button', { name: 'Restore quotation', exact: true }).click();
  const restored = page.waitForResponse((response) => response.url().endsWith('/archive') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  assert.ok((await restored).ok());
  assert.equal((await family()).archivedAt, null);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ revisionHistory: true, historicalPdfUnchanged: true, olderPreview: true, olderDownload: true, concurrentEditRejected: true, archiveRestore: true, noEmailsSubmitted: true, screenshots: evidence }));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
