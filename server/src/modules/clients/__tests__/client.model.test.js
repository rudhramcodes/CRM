import { describe, expect, it } from 'vitest';
import Client from '../client.model.js';

describe('client portal-user field', () => {
  it('leaves user absent until a portal account is attached', () => {
    const client = new Client({
      clientId: 'CLI-TEST-001',
      brand: 'panigrahna',
      companyName: 'Test Company',
      contactPerson: 'Test Contact',
      email: 'test-client@example.com',
      createdBy: '507f1f77bcf86cd799439011',
    });

    expect(client.user).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(client.toObject(), 'user')).toBe(false);
  });
});
