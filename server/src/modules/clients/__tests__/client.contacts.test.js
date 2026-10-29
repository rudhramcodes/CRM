import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Client from '../client.model.js';
import User from '../../auth/auth.model.js';
import { create, update } from '../client.service.js';

const mongoUri = process.env.CLIENT_CONTACTS_TEST_URI;
describe.skipIf(!mongoUri)('companies sharing contact details', () => {
  const user = { _id: new mongoose.Types.ObjectId() };
  const contact = {
    brand: 'aghori', contactPerson: 'Yashvi Contact',
    email: 'shared@example.com', phone: '9876543210',
  };

  beforeAll(async () => {
    await mongoose.connect(mongoUri, { dbName: `crm_contacts_test_${randomUUID().replaceAll('-', '')}`, serverSelectionTimeoutMS: 3000 });
    await Client.init();
    // Existing login must not be attached to a second company or recreated.
    await User.collection.insertOne({ _id: user._id, email: contact.email, role: 'client' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('creates separate companies with the same email and phone, and allows editing to a shared email', async () => {
    const first = await create({ ...contact, companyName: 'Yashigroup' }, user);
    first.user = user._id;
    await first.save();
    const second = await create({ ...contact, companyName: 'Yashvi Organics' }, user);
    expect(String(second._id)).not.toBe(String(first._id));
    expect(second.clientId).not.toBe(first.clientId);
    expect(second.user).toBeUndefined();
    expect(await Client.countDocuments({ email: contact.email, phone: contact.phone })).toBe(2);
    await update(second._id, { email: 'other@example.com' });
    await update(second._id, { email: contact.email });
    expect((await Client.findById(first._id)).companyName).toBe('Yashigroup');
    expect((await Client.findById(second._id)).email).toBe(contact.email);
    expect(await User.countDocuments({ email: contact.email })).toBe(1);
  });
});
