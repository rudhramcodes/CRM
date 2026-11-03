import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import config from '../../../config/index.js';
import { setupRevisionApi } from './quotationRevision.fixture.js';

const transport = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => transport } }));
let api;
let originalPassword;
beforeAll(async () => {
  originalPassword = config.smtp.pass;
  config.smtp.pass = 'isolated-test-provider';
  api = await setupRevisionApi();
}, 10000);
beforeEach(() => {
  transport.sendMail.mockReset();
  transport.sendMail.mockImplementation(async (message) => ({ accepted: [message.to], messageId: 'test-provider-id' }));
});
afterAll(async () => { config.smtp.pass = originalPassword; await api?.close(); });

describe('saved quotation revision delivery', () => {
  it('records provider failure and leaves the revision draft without leaking credentials', async () => {
    const quote = await api.create();
    await api.save(quote._id);
    transport.sendMail.mockRejectedValue(new Error('password=secret token=private'));
    const result = await api.request('POST', `/${quote._id}/revisions/1/send`, {});
    expect(result.status).toBe(502);
    const detail = await api.request('GET', `/${quote._id}/revisions/1`);
    expect(detail.json.data.revision).toMatchObject({ status: 'draft', sentAt: null,
      sendAttempts: [{ status: 'failed', actor: String(api.actor._id), error: 'Email delivery failed; provider acceptance was not confirmed' }] });
    expect(JSON.stringify(detail.json)).not.toContain('secret');
    expect(transport.close).toHaveBeenCalled();
  }, 15000);

  it('sends and resends precisely the saved PDF and preserves terminal status', async () => {
    const quote = await api.create({ recipientEmail: 'printed@example.test' });
    await api.save(quote._id);
    const savedPdf = await api.request('GET', `/${quote._id}/revisions/1/pdf`);
    expect((await api.request('POST', `/${quote._id}/revisions/1/resend`, {})).status).toBe(409);
    expect((await api.request('POST', `/${quote._id}/revisions/1/send`, {})).status).toBe(200);
    const accepted = await api.request('PATCH', `/${quote._id}/revisions/1/status`, { status: 'accepted', expectedStatus: 'sent' });
    expect(accepted.status).toBe(200);
    expect(transport.sendMail).toHaveBeenCalledTimes(1);
    const result = await api.request('POST', `/${quote._id}/revisions/1/resend`, {});
    expect(result.status).toBe(200);
    expect(result.json.data.quotation.status).toBe('accepted');
    expect(result.json.data.quotation.revisions[0].sendAttempts.map((attempt) => attempt.status)).toEqual(['accepted', 'accepted']);
    for (const [message] of transport.sendMail.mock.calls) {
      expect(message.to).toBe('printed@example.test');
      expect(message.subject).toContain('V1');
      expect(message.attachments[0].filename).toBe(`${quote.quotationNumber}-V1.pdf`);
      expect(message.attachments[0].content.equals(savedPdf.bytes)).toBe(true);
    }
  }, 15000);

  it('prevents duplicate in-flight sends until the exact provider acceptance event', async () => {
    const quote = await api.create();
    await api.save(quote._id);
    let entered;
    let accept;
    const providerEntered = new Promise((resolve) => { entered = resolve; });
    const providerAcceptance = new Promise((resolve) => { accept = resolve; });
    transport.sendMail.mockImplementation((message) => {
      entered();
      return providerAcceptance.then(() => ({ accepted: [message.to], messageId: 'controlled-acceptance' }));
    });
    const first = api.request('POST', `/${quote._id}/revisions/1/send`, {});
    try {
      await providerEntered;
      const duplicate = await api.request('POST', `/${quote._id}/revisions/1/send`, {});
      expect(duplicate.status).toBe(409);
      const manual = await api.request('PATCH', `/${quote._id}/revisions/1/status`, { status: 'accepted', expectedStatus: 'draft' });
      expect(manual.status).toBe(409);
    } finally {
      accept();
    }
    expect((await first).status).toBe(200);
    expect(transport.sendMail).toHaveBeenCalledTimes(1);
  }, 15000);

  it('does not mistake missing provider configuration for accepted delivery', async () => {
    const quote = await api.create();
    await api.save(quote._id);
    const key = config.resend.apiKey;
    config.smtp.pass = '';
    config.resend.apiKey = '';
    try {
      const result = await api.request('POST', `/${quote._id}/revisions/1/send`, {});
      expect(result.status).toBe(502);
      expect(transport.sendMail).not.toHaveBeenCalled();
    } finally {
      config.smtp.pass = 'isolated-test-provider';
      config.resend.apiKey = key;
    }
  }, 15000);
});
