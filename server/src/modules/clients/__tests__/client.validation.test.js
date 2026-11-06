import { describe, expect, it } from 'vitest';
import { createClientSchema, updateClientSchema } from '../client.validation.js';

describe('createClientSchema & updateClientSchema phone validation', () => {
  it('accepts 9 digit South Africa phone numbers with country code (+27 747464738)', () => {
    const data = {
      brand: 'panigrahna',
      companyName: 'Acme SA',
      contactPerson: 'Jane Doe',
      email: 'jane@acme.co.za',
      phone: '+27 747464738',
    };
    const result = createClientSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid number lengths for the country code (+27 7474647380 is 10 digits, invalid in SA)', () => {
    const data = {
      brand: 'panigrahna',
      companyName: 'Acme SA',
      contactPerson: 'Jane Doe',
      email: 'jane@acme.co.za',
      phone: '+27 7474647380',
    };
    const result = createClientSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts 10 digit Indian phone numbers with country code (+91 9876543210)', () => {
    const data = {
      brand: 'panigrahna',
      companyName: 'Acme IN',
      contactPerson: 'John Doe',
      email: 'john@acme.in',
      phone: '+91 9876543210',
    };
    const result = createClientSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects numbers with fewer than 6 digits', () => {
    const data = {
      brand: 'panigrahna',
      companyName: 'Acme SA',
      contactPerson: 'Jane Doe',
      email: 'jane@acme.co.za',
      phone: '+27 1234',
    };
    const result = createClientSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts empty or omitted phone number', () => {
    const data = {
      brand: 'panigrahna',
      companyName: 'Acme SA',
      contactPerson: 'Jane Doe',
      email: 'jane@acme.co.za',
      phone: '',
    };
    const result = createClientSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('validates updateClientSchema with South Africa phone number', () => {
    const result = updateClientSchema.safeParse({ phone: '+27 747464738' });
    expect(result.success).toBe(true);
  });
});
