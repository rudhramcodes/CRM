import ApiError from '../../utils/ApiError.js';

// Reports count days and months in the business's time zone (India), whatever zone the server runs in.
export const REPORT_TIME_ZONE = 'Asia/Kolkata';
const OFFSET = '+05:30'; // Asia/Kolkata has no daylight saving
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const parse = (value, endOfDay) => {
  const date = DATE_ONLY.test(value)
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}${OFFSET}`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest(`Invalid report date: ${value}`);
  return date;
};

// Mongo range for a report period. A plain date ("2026-11-01") means that whole day in India time:
// `from` is its first instant, `to` its last. A full timestamp is used exactly as given.
export const buildDateFilter = (from, to) => {
  const filter = {};
  if (from) filter.$gte = parse(from, false);
  if (to) filter.$lte = parse(to, true);
  return Object.keys(filter).length ? filter : undefined;
};

// Month key (YYYY-MM) for grouping, in India time so a late-evening invoice on the 31st stays in its month.
export const monthKey = (field) => ({ $dateToString: { format: '%Y-%m', date: field, timezone: REPORT_TIME_ZONE } });

// Aging buckets by days past the due date, as of `now`, with no gaps or overlaps between them.
export const AGING_BUCKETS = [
  { label: '0-30 days', min: 0, max: 30 },
  { label: '31-60 days', min: 31, max: 60 },
  { label: '61-90 days', min: 61, max: 90 },
  { label: '90+ days', min: 91, max: Infinity },
];

// dueDate range for a bucket: past due by at least `min` days and less than `max + 1` days.
export const agingDueFilter = (bucket, now = new Date()) => {
  const filter = { $lte: new Date(now.getTime() - bucket.min * DAY_MS) };
  if (bucket.max !== Infinity) filter.$gt = new Date(now.getTime() - (bucket.max + 1) * DAY_MS);
  return filter;
};
