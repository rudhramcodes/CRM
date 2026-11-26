// One-off: apply the end-of-day short-day rule (attendance.cron.js → autoShortDayMarking) to days
// that closed before that cron existed (added 2026-11-25), so they show as half day / absent.
//
//   node scripts/backfillShortDays.mjs                          dry run, 1st of this month → yesterday
//   node scripts/backfillShortDays.mjs --from=2026-11-01 --to=2026-11-24
//   node scripts/backfillShortDays.mjs --half-only              never mark anyone absent
//   node scripts/backfillShortDays.mjs --apply                  write the changes
//
// Same filter as the cron: present/WFH, no leave behind it, has punches, no open session.
// No push notifications are sent; each change gets a status_change event marked backfill.
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import logger from '../src/utils/logger.js';
import '../src/modules/auth/auth.model.js'; // registers User for populate
import { Attendance } from '../src/modules/attendance/attendance.model.js';
import { shortDayStatus } from '../src/modules/attendance/leavePolicy.js';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const apply = process.argv.includes('--apply');
const halfOnly = process.argv.includes('--half-only');
const tag = `[short-days]${apply ? '' : ' [dry-run]'}`;

// "YYYY-MM-DD" as a local calendar day, the way the server stores attendance dates.
const day = (s, endOfDay) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`Bad date "${s}", use YYYY-MM-DD`);
  const [y, m, d] = s.split('-').map(Number);
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const run = async () => {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const from = day(arg('from') || ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
  const to = day(arg('to') || ymd(yesterday), true);
  // Today is the cron's job, and an unfinished day must never be judged.
  if (to >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) throw new Error('--to must be before today');

  await mongoose.connect(config.mongodbUri);
  logger.info(`${tag} Connected. Range ${ymd(from)} → ${ymd(to)}${halfOnly ? ', half days only' : ''}`);

  const records = await Attendance.find({
    date: { $gte: from, $lte: to },
    status: { $in: ['present', 'wfh'] },
    leave: null,
  }).populate('employee', 'name email').sort({ date: 1 });

  const counts = { half_day: 0, absent: 0, skipped: 0 };
  for (const record of records) {
    if (!record.sessions?.length || record.sessions.some((s) => s.clockIn?.time && !s.clockOut?.time)) {
      counts.skipped += 1;
      continue;
    }
    let next = shortDayStatus(record.workHours);
    if (next === 'absent' && halfOnly) next = 'half_day';
    if (!next) continue;

    const prev = record.status;
    counts[next] += 1;
    logger.info(`${tag} ${ymd(record.date)} ${record.employee?.name || record.employee} — ${(record.workHours || 0).toFixed(2)} h: ${prev} → ${next}`);
    if (!apply) continue;

    record.status = next;
    record.events.push({ type: 'status_change', timestamp: new Date(), metadata: { workHours: record.workHours, from: prev, to: next, auto: true, backfill: true } });
    await record.save();
  }

  logger.info(`${tag} Checked ${records.length}. Half day: ${counts.half_day}; Absent: ${counts.absent}; Skipped (no punches or open session): ${counts.skipped}`);
  if (!apply && counts.half_day + counts.absent) logger.info(`${tag} Nothing was written. Re-run with --apply to save.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  logger.error(`[short-days] Failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
