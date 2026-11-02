import { describe, it, expect } from 'vitest';
import { buildQuotationDefaults } from '../quotation.defaults.js';

describe('quotation defaults', () => {
  it('provides text and pricing defaults without a client or project', () => {
    const defaults = buildQuotationDefaults();

    expect(defaults.salutation).toBe('');
    expect(defaults.letterSignoff).toBe('Warm Regards,\nRudhram Enterprises');
    expect(defaults.deliverables.split('\n').length - 1).toBeGreaterThanOrEqual(3);
    expect(defaults.note).toContain('Payment Terms');
    expect(defaults.price).toBe(0);
    expect(new Date(defaults.validUntil).getTime() - new Date(defaults.issueDate).getTime())
      .toBe(30 * 86400000);
  });

  it('prefills client and project details when provided', () => {
    const defaults = buildQuotationDefaults({
      client: { companyName: 'Yashvi Organics' },
      project: { title: 'Brand Kit', budget: 250000 },
    });

    expect(defaults.salutation).toBe('Dear Yashvi Organics,');
    expect(defaults.subject).toContain('Brand Kit');
    expect(defaults.budget).toBe(250000);
    expect(defaults.price).toBe(250000);
    expect(defaults.scopeTitle).toBe('Brand Kit');
  });
});
