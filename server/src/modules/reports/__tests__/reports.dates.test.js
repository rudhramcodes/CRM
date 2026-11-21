import { describe, expect, it } from 'vitest';
import { AGING_BUCKETS, agingDueFilter, buildDateFilter, monthKey } from '../reports.dates.js';

describe('report date range', () => {
  it('reads plain dates as whole days in India time, whatever the server zone', () => {
    const f = buildDateFilter('2026-11-01', '2026-11-30');
    expect(f.$gte.toISOString()).toBe('2026-10-31T18:30:00.000Z'); // 1 Nov 00:00 IST
    expect(f.$lte.toISOString()).toBe('2026-11-30T18:29:59.999Z'); // 30 Nov 23:59:59.999 IST
  });

  it('uses full timestamps exactly as sent', () => {
    const f = buildDateFilter('2026-10-31T18:30:00.000Z', '2026-11-21T10:00:00.000Z');
    expect(f.$gte.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(f.$lte.toISOString()).toBe('2026-11-21T10:00:00.000Z');
  });

  it('returns no filter for "All" and rejects bad dates', () => {
    expect(buildDateFilter()).toBeUndefined();
    expect(() => buildDateFilter('not-a-date')).toThrow(/Invalid report date/);
  });

  it('groups months in India time', () => {
    expect(monthKey('$issueDate').$dateToString.timezone).toBe('Asia/Kolkata');
  });
});

describe('aging buckets', () => {
  const now = new Date('2026-11-21T12:00:00.000Z');
  const day = 24 * 60 * 60 * 1000;
  const bucketOf = (daysPastDue) => {
    const due = new Date(now.getTime() - daysPastDue * day);
    return AGING_BUCKETS.find((b) => {
      const f = agingDueFilter(b, now);
      return due <= f.$lte && (!f.$gt || due > f.$gt);
    })?.label;
  };

  it('puts every past-due age in exactly one bucket', () => {
    expect(bucketOf(0)).toBe('0-30 days');
    expect(bucketOf(30)).toBe('0-30 days');
    expect(bucketOf(30.5)).toBe('0-30 days'); // the old ranges left this gap uncounted
    expect(bucketOf(31)).toBe('31-60 days');
    expect(bucketOf(60.9)).toBe('31-60 days');
    expect(bucketOf(90)).toBe('61-90 days');
    expect(bucketOf(91)).toBe('90+ days');
    expect(bucketOf(400)).toBe('90+ days');
  });

  it('leaves invoices not yet due out of every bucket', () => {
    expect(bucketOf(-1)).toBeUndefined();
  });
});
