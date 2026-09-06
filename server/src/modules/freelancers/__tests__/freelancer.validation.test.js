import { describe, expect, it } from 'vitest';
import { createFreelancerSchema, freelancersQuerySchema } from '../freelancer.validation.js';

describe('freelancer validation', () => {
  it('requires identity, phone, and at least one venture profile', () => {
    const result = createFreelancerSchema.safeParse({ fullName: 'A', phone: '' });
    expect(result.success).toBe(false);
  });

  it('accepts a Panigrahna profile with default values', () => {
    const result = createFreelancerSchema.safeParse({
      fullName: 'Rohan Mehta',
      phone: '9999999999',
      ventureProfiles: [{ venture: 'panigrahna', serviceCategories: ['Wedding Photographer'] }],
    });
    expect(result.success).toBe(true);
    expect(result.data.preferredContactChannel).toBe('phone');
    expect(result.data.ventureProfiles[0].skillLevel).toBe('mid');
  });

  it('parses list filters with safe pagination defaults', () => {
    const result = freelancersQuerySchema.parse({ search: 'Rohan', venture: 'aghori' });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.includeArchived).toBe('false');
  });

  it('treats empty optional filters as omitted', () => {
    const result = freelancersQuerySchema.safeParse({ page: '1', limit: '10', search: '', venture: '', status: '' });
    expect(result.success).toBe(true);
    expect(result.data.venture).toBeUndefined();
    expect(result.data.status).toBeUndefined();
  });

  it('accepts multiple historical rate cards', () => {
    const result = createFreelancerSchema.safeParse({
      fullName: 'Rohan Mehta',
      phone: '9999999999',
      ventureProfiles: [{
        venture: 'panigrahna',
        serviceCategories: ['Wedding Photographer'],
        rateCards: [
          { rateBasis: 'per_function', amount: 12000, effectiveFrom: '2025-01-01', effectiveUntil: '2025-12-31' },
          { rateBasis: 'per_function', amount: 15000, effectiveFrom: '2026-01-01' },
        ],
      }],
    });
    expect(result.success).toBe(true);
    expect(result.data.ventureProfiles[0].rateCards).toHaveLength(2);
  });

  it('rejects a rate card whose end date precedes its start date', () => {
    const result = createFreelancerSchema.safeParse({
      fullName: 'Rohan Mehta',
      phone: '9999999999',
      ventureProfiles: [{ venture: 'aghori', rateCards: [{ rateBasis: 'per_day', amount: 5000, effectiveFrom: '2026-05-01', effectiveUntil: '2026-04-30' }] }],
    });
    expect(result.success).toBe(false);
  });
});

import { VENTURE_SERVICE_CATALOG, RATE_BASES, RATE_CURRENCIES } from '../freelancer.catalog.js';
import { getCurrentRate } from '../../../../../client/src/modules/freelancers/rateCardUtils.js';

describe('freelancer Task 2 QA coverage', () => {
  it('keeps the Panigrahna and Aghori service catalogues available', () => {
    expect(VENTURE_SERVICE_CATALOG.panigrahna).toContain('Wedding Photographer');
    expect(VENTURE_SERVICE_CATALOG.panigrahna).toContain('Reels Editor');
    expect(VENTURE_SERVICE_CATALOG.aghori).toContain('Event Coordinator');
    expect(VENTURE_SERVICE_CATALOG.aghori).toContain('LED or AV Operator');
  });

  it('supports every documented rate basis and currency', () => {
    expect(RATE_BASES).toEqual(expect.arrayContaining([
      'per_hour', 'per_shift', 'per_day', 'per_function', 'per_event',
      'per_deliverable', 'monthly', 'custom',
    ]));
    expect(RATE_CURRENCIES).toEqual(expect.arrayContaining(['INR', 'USD']));
  });

  it('selects the active rate and falls back to the latest rate when none is active', () => {
    const rates = [
      { amount: 12000, effectiveFrom: '2025-01-01', effectiveUntil: '2025-12-31' },
      { amount: 15000, effectiveFrom: '2026-01-01' },
      { amount: 50000, effectiveFrom: '2027-01-01' },
    ];
    expect(getCurrentRate(rates, '2026-06-01').amount).toBe(15000);
    expect(getCurrentRate(rates, '2024-06-01').amount).toBe(50000);
    expect(getCurrentRate(rates, '2028-06-01').amount).toBe(50000);
  });
});
