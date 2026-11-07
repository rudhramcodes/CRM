import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { once } from 'node:events';
import User from '../../modules/auth/auth.model.js';
import * as authRepository from '../../modules/auth/auth.repository.js';
import leadRoutes from '../../modules/leads/lead.routes.js';
import clientRoutes from '../../modules/clients/client.routes.js';
import authRoutes from '../../modules/auth/auth.routes.js';

// Keep authentication, authorization, validation and router wiring real; never touch a database.
vi.mock('../../modules/leads/lead.controller.js', () => Object.fromEntries(
  ['stats', 'bulkDelete', 'bulkUpdate', 'importLeads', 'list', 'getById', 'create', 'addNote', 'update', 'remove']
    .map((name) => [name, vi.fn((_req, res) => res.sendStatus(204))]),
));
vi.mock('../../modules/clients/client.controller.js', () => Object.fromEntries(
  ['stats', 'getMyProfile', 'list', 'getById', 'convertFromLead', 'invite', 'create', 'update', 'remove']
    .map((name) => [name, vi.fn((_req, res) => res.sendStatus(204))]),
));

let server;
let base;
let actor;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/leads', leadRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/auth', authRoutes);
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});
afterAll(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
beforeEach(() => {
  actor = new User({ name: 'Test User', email: 'reader@example.test', role: 'admin', readOnlyModules: [] });
  vi.spyOn(User, 'findById').mockImplementation(() => ({ select: async () => actor }));
});
afterEach(() => vi.restoreAllMocks());

const request = (method, path, options = {}) => fetch(base + path, {
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(options.auth === false ? {} : { Authorization: `Bearer ${actor.generateAccessToken()}` }),
  },
  signal: AbortSignal.timeout(5000),
  ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
});

const writes = [
  ['leads', 'POST', '/', { name: 'New Lead', email: 'new@example.test', phone: '+14155552671' }],
  ['leads', 'PATCH', '/record', { name: 'Edited Lead' }],
  ['leads', 'DELETE', '/record'],
  ['leads', 'POST', '/record/notes', { text: 'New note' }],
  ['leads', 'PATCH', '/bulk', { ids: ['record'], data: { status: 'contacted' } }],
  ['leads', 'DELETE', '/bulk', { ids: ['record'] }],
  ['leads', 'POST', '/import'],
  ['clients', 'POST', '/', { brand: 'aghori', companyName: 'New Company', contactPerson: 'New Contact', email: 'new@example.test' }],
  ['clients', 'PATCH', '/record', { companyName: 'Edited Company' }],
  ['clients', 'DELETE', '/record'],
  ['clients', 'POST', '/convert/lead'],
  ['clients', 'POST', '/record/invite'],
];

describe('per-account read-only restrictions at the HTTP router boundary', () => {
  describe.each(['employee', 'manager', 'admin', 'super_admin'])('restricted %s', (role) => {
    it.each(writes)('denies %s %s %s before mutations or validation', async (module, method, path, body) => {
      actor.role = role;
      actor.readOnlyModules = ['leads', 'clients'];

      const response = await request(method, `/${module}${path}`, { body });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ message: `You have read-only access to ${module}` });
    });
  });

  it.each(writes)('preserves unrestricted admin access to %s %s %s', async (module, method, path, body) => {
    const response = await request(method, `/${module}${path}`, { body });

    expect(response.status).toBe(204);
  });

  describe.each(['leads', 'clients'])('%s module', (module) => {
    it.each(['GET', 'HEAD', 'OPTIONS'])('allows %s for a restricted user', async (method) => {
      actor.readOnlyModules = [module];

      const response = await request(method, `/${module}/`);

      expect(response.status).toBe(method === 'OPTIONS' ? 200 : 204);
    });

    it.each(['/stats', '/record'])('allows restricted manager reads at %s', async (path) => {
      actor.role = 'manager';
      actor.readOnlyModules = [module];

      expect((await request('GET', `/${module}${path}`)).status).toBe(204);
    });

    it.each(['GET', 'HEAD'])('allows employee stats reads for %s', async (method) => {
      actor.role = 'employee';
      actor.readOnlyModules = [module];

      expect((await request(method, `/${module}/stats`)).status).toBe(204);
    });

    it('preserves client role denial for reads', async () => {
      actor.role = 'client';
      actor.readOnlyModules = [module];

      expect((await request('GET', `/${module}/`)).status).toBe(403);
    });

    it('preserves manager delete denial without a restriction', async () => {
      actor.role = 'manager';

      expect((await request('DELETE', `/${module}/record`)).status).toBe(403);
    });

    it('does not restrict writes to the other module', async () => {
      actor.readOnlyModules = [module === 'leads' ? 'clients' : 'leads'];

      expect((await request('PATCH', `/${module}/record`, { body: { name: 'Edited', companyName: 'Edited' } })).status).toBe(204);
    });

    it('preserves legacy users without the field', async () => {
      actor.readOnlyModules = undefined;

      expect((await request('DELETE', `/${module}/record`)).status).toBe(204);
    });

    it('authenticates before checking restrictions', async () => {
      actor.readOnlyModules = [module];

      expect((await request('DELETE', `/${module}/record`, { auth: false })).status).toBe(401);
    });

    it.each(['PUT', 'PROPFIND'])('denies unregistered unsafe method %s', async (method) => {
      actor.readOnlyModules = [module];

      expect((await request(method, `/${module}/record`)).status).toBe(403);
    });
  });

  it.each(['employee', 'manager'])('preserves unrestricted %s lead creation', async (role) => {
    actor.role = role;

    expect((await request('POST', '/leads/', { body: writes[0][3] })).status).toBe(204);
  });

  it('preserves unrestricted employee client creation denial', async () => {
    actor.role = 'employee';

    expect((await request('POST', '/clients/', { body: writes[7][3] })).status).toBe(403);
  });
});

describe('read-only user storage and auth exposure', () => {
  it('defaults users to no restricted modules', () => {
    expect(new User().readOnlyModules).toEqual([]);
  });

  it('rejects unsupported module names without saving', () => {
    actor.readOnlyModules = ['invoices'];

    expect(actor.validateSync()?.errors['readOnlyModules.0']?.kind).toBe('enum');
  });

  it('includes restrictions in the current-user response', async () => {
    actor.readOnlyModules = ['leads', 'clients'];

    const response = await request('GET', '/auth/me');

    expect(response.status).toBe(200);
    expect((await response.json()).data.user.readOnlyModules).toEqual(['leads', 'clients']);
  });

  it('includes restrictions in the login response', async () => {
    actor.readOnlyModules = ['leads'];
    vi.spyOn(authRepository, 'findByEmail').mockResolvedValue(actor);
    vi.spyOn(actor, 'comparePassword').mockResolvedValue(true);
    vi.spyOn(authRepository, 'updateRefreshToken').mockResolvedValue(actor);

    const response = await request('POST', '/auth/login', { auth: false, body: { email: actor.email, password: 'TestPassword1' } });

    expect(response.status).toBe(200);
    expect((await response.json()).data.user.readOnlyModules).toEqual(['leads']);
  });

  it.each([[], ['clients']])('cannot replace restrictions through self-profile with %j', async (readOnlyModules) => {
    actor.readOnlyModules = ['leads'];
    vi.spyOn(authRepository, 'updateUser').mockImplementation(async (_id, updates) => {
      actor.set(updates);
      return actor;
    });

    const response = await request('PATCH', '/auth/profile', { body: { name: 'Updated Name', readOnlyModules } });

    expect(response.status).toBe(200);
    expect((await response.json()).data.user).toMatchObject({ name: 'Updated Name', readOnlyModules: ['leads'] });
  });
});
