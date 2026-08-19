import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAttachClientProfile } from '../src/middleware/clientPortal.js';

const makeReq = (user) => ({ user });

/** Stub Client model whose findOne returns a fixed result. */
const makeClientModel = (result) => ({
  findOne: async () => result,
});

test('attachClientProfile: staff role passes through without loading a profile', async () => {
  let nextCalled = false;
  const req = makeReq({ role: 'admin', _id: 'u1' });
  const model = makeClientModel({ _id: 'c1' });

  await createAttachClientProfile(model)(req, {}, (err) => {
    nextCalled = true;
    assert.equal(err, undefined);
  });

  assert.equal(nextCalled, true);
  assert.equal(req.clientProfile, undefined);
});

test('attachClientProfile: client role with active profile attaches req.clientProfile', async () => {
  const profile = { _id: 'c1', companyName: 'Acme' };
  const req = makeReq({ role: 'client', _id: 'u1' });

  await createAttachClientProfile(makeClientModel(profile))(req, {}, (err) => {
    assert.equal(err, undefined);
  });

  assert.deepEqual(req.clientProfile, profile);
});

test('attachClientProfile: client role without a profile receives a 403 ApiError', async () => {
  const req = makeReq({ role: 'client', _id: 'u1' });

  await createAttachClientProfile(makeClientModel(null))(req, {}, (err) => {
    assert.ok(err instanceof Error);
    assert.equal(err.statusCode, 403);
  });
});

test('attachClientProfile: client role with inactive profile receives a 403 ApiError', async () => {
  const req = makeReq({ role: 'client', _id: 'u1' });

  await createAttachClientProfile(makeClientModel(null))(req, {}, (err) => {
    assert.ok(err instanceof Error);
    assert.equal(err.statusCode, 403);
  });
});