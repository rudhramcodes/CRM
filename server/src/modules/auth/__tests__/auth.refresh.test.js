import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { once } from 'node:events';
import User from '../auth.model.js';
import * as authRepository from '../auth.repository.js';
import authRoutes from '../auth.routes.js';

// Real routes, controller and service; the repository's token writes run on an in-memory list
// with the same rules as the Mongo update (rotate only a stored token, keep the newest 5).
let server;
let base;
let actor;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api/auth`;
});
afterAll(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
beforeEach(() => {
  actor = new User({ name: 'Device User', email: 'devices@example.test', role: 'employee', isActive: true });
  actor.refreshTokens = [];
  vi.spyOn(User, 'findById').mockImplementation(() => Object.assign(Promise.resolve(actor), { select: async () => actor }));
  vi.spyOn(authRepository, 'findByEmail').mockResolvedValue(actor);
  vi.spyOn(actor, 'comparePassword').mockResolvedValue(true);
  vi.spyOn(authRepository, 'rotateRefreshToken').mockImplementation(async (_id, newToken, oldToken) => {
    if (oldToken && !actor.refreshTokens.includes(oldToken)) return null;
    actor.refreshTokens = [...actor.refreshTokens.filter((t) => t !== oldToken), newToken].slice(-5);
    return actor;
  });
  vi.spyOn(authRepository, 'removeRefreshToken').mockImplementation(async (_id, token) => {
    actor.refreshTokens = actor.refreshTokens.filter((t) => t !== token);
  });
});
afterEach(() => vi.restoreAllMocks());

const post = (path, { body, headers = {} } = {}) => fetch(base + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body ?? {}),
  signal: AbortSignal.timeout(5000),
});
const mobile = { 'X-Client': 'mobile' };
const login = async (headers = mobile) => (await (await post('/login', {
  body: { email: actor.email, password: 'TestPassword1' }, headers,
})).json()).data;
const refresh = (refreshToken) => post('/refresh-token', { body: { refreshToken }, headers: mobile });

describe('per-device refresh tokens', () => {
  it('keeps web and mobile signed in at the same time', async () => {
    const web = await post('/login', { body: { email: actor.email, password: 'TestPassword1' } });
    const webCookie = web.headers.getSetCookie().find((c) => c.startsWith('refreshToken=') && c.includes('Path=/api/auth;'));
    const phone = await login();

    expect((await refresh(phone.refreshToken)).status).toBe(200);
    const webRefresh = await post('/refresh-token', { headers: { Cookie: webCookie.split(';')[0] } });
    expect(webRefresh.status).toBe(200);
  });

  it('only gives the refresh token in the body to the mobile app', async () => {
    expect((await login({})).refreshToken).toBeUndefined();
    expect((await login()).refreshToken).toEqual(expect.any(String));
  });

  it('rotates on refresh and rejects the used token', async () => {
    const { refreshToken } = await login();
    const first = await refresh(refreshToken);
    const next = (await first.json()).data.refreshToken;

    expect(next).not.toBe(refreshToken);
    expect((await refresh(refreshToken)).status).toBe(401);
    expect((await refresh(next)).status).toBe(200);
  });

  it('logout ends only that device', async () => {
    const a = await login();
    const b = await login();

    const out = await post('/logout', {
      body: { refreshToken: a.refreshToken },
      headers: { ...mobile, Authorization: `Bearer ${a.accessToken}` },
    });

    expect(out.status).toBe(200);
    expect((await refresh(a.refreshToken)).status).toBe(401);
    expect((await refresh(b.refreshToken)).status).toBe(200);
  });

  it('rejects a refresh token for a deactivated account', async () => {
    const { refreshToken } = await login();
    actor.isActive = false;
    expect((await refresh(refreshToken)).status).toBe(401);
  });
});
