import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAttendanceCalendarMeta } from '../attendanceCalendarMeta.js';

test('only present attendance receives the green treatment', () => {
  const expected = { present: 'emerald', absent: 'red', weekend: 'zinc', leave: 'amber', half_day: 'orange', wfh: 'indigo', holiday: 'sky', late: 'yellow' };
  for (const [status, color] of Object.entries(expected)) {
    const meta = getAttendanceCalendarMeta({ status });
    assert.match(meta.dot, new RegExp(`^bg-${color}-`));
    assert.match(meta.badge, new RegExp(`^bg-${color}-`));
    assert.match(meta.text, new RegExp(`^text-${color}-`));
  }
});

test('late arrivals retain their attendance label with warning colours', () => {
  for (const status of ['present', 'wfh', 'half_day']) {
    const meta = getAttendanceCalendarMeta({ status, isLate: true });
    assert.equal(meta.dot, 'bg-yellow-500');
    assert.equal(meta.label, `${getAttendanceCalendarMeta({ status }).label} · Late`);
  }
  assert.equal(getAttendanceCalendarMeta({ status: 'weekend', isLate: true }).dot, 'bg-zinc-400');
  assert.equal(getAttendanceCalendarMeta({ status: 'absent', isLate: true }).dot, 'bg-red-500');
});

test('missing and unknown statuses stay neutral rather than looking present', () => {
  assert.equal(getAttendanceCalendarMeta().dot, 'bg-zinc-400');
  assert.equal(getAttendanceCalendarMeta({ status: 'unknown' }).dot, 'bg-zinc-400');
});
