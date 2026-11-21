import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { once } from 'node:events';

const upload = vi.fn(async () => ({ secure_url: 'https://img/x.jpg', public_id: 'x', width: 1, height: 1 }));
vi.mock('cloudinary', () => ({ default: { v2: { config: vi.fn(), uploader: { upload } } } }));
vi.mock('../../../utils/logger.js', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const { default: staffUploadRoutes, publicPhotoUpload } = await import('../freelancer.upload.routes.js');

const photo = () => {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'p.png');
  return form;
};

describe('freelancer photo upload', () => {
  let server;
  let base;
  beforeAll(async () => {
    const app = express();
    app.use('/freelancers/upload', staffUploadRoutes);
    app.post('/freelancers/public/upload', ...publicPhotoUpload);
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}/freelancers`;
  });
  afterAll(() => server.close());

  it('refuses the staff upload without a login and never reaches Cloudinary', async () => {
    const res = await fetch(`${base}/upload/upload`, { method: 'POST', body: photo() });
    expect(res.status).toBe(401);
    expect(upload).not.toHaveBeenCalled();
  });

  it('accepts a photo on the public apply-form route', async () => {
    const res = await fetch(`${base}/public/upload`, { method: 'POST', body: photo() });
    expect(res.status).toBe(200);
    expect((await res.json()).data.url).toBe('https://img/x.jpg');
  });

  it('rate limits the public route per visitor', async () => {
    const statuses = [];
    for (let i = 0; i < 11; i += 1) {
      statuses.push((await fetch(`${base}/public/upload`, { method: 'POST', body: photo() })).status);
    }
    expect(statuses.at(-1)).toBe(429); // 10 an hour; the first test above used one
  });
});
