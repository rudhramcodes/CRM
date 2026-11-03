import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import config from '../../../config/index.js';
import User from '../../auth/auth.model.js';
import Client from '../../clients/client.model.js';
import Quotation from '../quotation.model.js';
import routes from '../quotation.routes.js';

export const setupRevisionApi = async () => {
  const dbName = `quotation_revision_test_${randomUUID().replaceAll('-', '')}`;
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName, serverSelectionTimeoutMS: 3000 });
  await Quotation.init();
  const actor = { _id: new mongoose.Types.ObjectId(), name: 'Revision Admin', email: 'revision@example.test', role: 'admin' };
  await User.collection.insertOne(actor);
  const client = await Client.create({
    companyName: 'Original Company', contactPerson: 'Original Contact', email: 'client@example.test',
    brand: 'aghori', createdBy: actor._id, clientId: `TEST-${randomUUID()}`,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/quotations', routes);
  app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message, errors: error.errors }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/quotations`;
  const token = jwt.sign({ userId: actor._id }, config.jwt.secret, { expiresIn: '10m' });
  const request = async (method, path, body, auth = true) => {
    const response = await fetch(base + path, {
      method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(30000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    const json = response.headers.get('content-type')?.includes('application/json') ? JSON.parse(bytes.toString()) : null;
    return { status: response.status, json, bytes, headers: response.headers };
  };
  const create = async (fields = {}) => {
    const result = await request('POST', '/', {
      client: String(client._id), price: 1000, issueDate: '2026-01-01', validUntil: '2026-02-01', ...fields,
    });
    if (result.status !== 201) throw new Error(JSON.stringify(result.json));
    return result.json.data.quotation;
  };
  const save = (id, tokens = { baseVersion: 0, editVersion: 0 }) => request('POST', `/${id}/revisions`, tokens);
  return {
    actor, client, request, create, save,
    close: async () => {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      for (const collection of Object.values(mongoose.connection.collections)) await collection.deleteMany({});
      await mongoose.connection.db.collection('quotationArtifacts.files').deleteMany({});
      await mongoose.connection.db.collection('quotationArtifacts.chunks').deleteMany({});
      await mongoose.disconnect();
    },
  };
};
