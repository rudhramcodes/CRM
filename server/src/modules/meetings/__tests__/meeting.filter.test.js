import { describe, expect, it } from 'vitest';
import { buildMeetingFilter } from '../meeting.repository.js';

describe('buildMeetingFilter', () => {
  it('keeps search when a venture is picked too', () => {
    const f = buildMeetingFilter({ search: 'review', brand: 'aghori' }, { clientIds: ['c1'], leadIds: ['l1'] });
    expect(f.$or).toBeUndefined();
    expect(f.$and).toHaveLength(2);
    expect(f.$and[0].$or.map((x) => Object.keys(x)[0])).toEqual(['title', 'notes', 'location']);
    expect(f.$and[1].$or).toEqual([{ brand: 'aghori' }, { client: { $in: ['c1'] } }, { lead: { $in: ['l1'] } }]);
  });

  it('adds plain filters and a date range', () => {
    const f = buildMeetingFilter({ status: 'scheduled', client: 'c9', dateFrom: '2026-11-01', dateTo: '2026-11-30T23:59:59' });
    expect(f).toMatchObject({ status: 'scheduled', client: 'c9' });
    expect(f.$and).toBeUndefined();
    expect(f.date.$gte).toEqual(new Date('2026-11-01'));
  });
});
