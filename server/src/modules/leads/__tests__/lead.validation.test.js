import { describe, expect, it } from 'vitest';
import { createLeadSchema, updateLeadSchema } from '../lead.validation.js';

describe('createLeadSchema & updateLeadSchema phone validation', () => {
  it('accepts 9 digit South Africa phone number with country code', () => {
    const data = {
      name: 'John Smith',
      email: 'john@example.co.za',
      phone: '+27 747464738',
      brand: 'panigrahna',
    };
    const result = createLeadSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid number length for South Africa (+27 7474647380)', () => {
    const data = {
      name: 'John Smith',
      email: 'john@example.co.za',
      phone: '+27 7474647380',
      brand: 'panigrahna',
    };
    const result = createLeadSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('validates updateLeadSchema with South Africa phone number', () => {
    const result = updateLeadSchema.safeParse({ phone: '+27 747464738' });
    expect(result.success).toBe(true);
  });
});
