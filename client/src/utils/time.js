export const toDisplay = (value) => {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

// Accepts: "9", "9am", "9:30", "09:30", "9:30 AM", "9:30pm", "2130" -> "HH:mm" (24h)
export const parseTime = (raw) => {
  let s = (raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return '';
  let h;
  let m = 0;
  let isPM = null;

  const ampm = s.match(/(am|pm)$/);
  if (ampm) {
    isPM = ampm[1] === 'pm';
    s = s.slice(0, -2).trim();
  }

  if (s.includes(':')) {
    const [hs, ms] = s.split(':');
    h = Number(hs);
    m = Number(ms);
  } else if (/^\d{4}$/.test(s)) {
    h = Number(s.slice(0, 2));
    m = Number(s.slice(2));
  } else {
    h = Number(s);
  }

  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  if (isPM !== null) {
    if (h < 1 || h > 12 || m < 0 || m > 59) return '';
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
  } else {
    if (h < 0 || h > 23 || m < 0 || m > 59) return '';
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const addMinutes = (time24, minutesToAdd) => {
  const [h, m] = (time24 || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = (h * 60 + m + minutesToAdd) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export const toMin = (t) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || !t.includes(':')) return null;
  return h * 60 + m;
};

const check = async () => {
  const assert = await import('node:assert');
  const strict = assert.strict;
  const cases = [
    ['9', '09:00'],
    ['9am', '09:00'],
    ['9:30', '09:30'],
    ['09:30', '09:30'],
    ['9:30 AM', '09:30'],
    ['9:30pm', '21:30'],
    ['12am', '00:00'],
    ['12pm', '12:00'],
    ['2130', '21:30'],
    ['25:00', ''],
    ['13am', ''],
  ];
  for (const [input, expected] of cases) {
    strict.strictEqual(parseTime(input), expected, `parseTime(${input})`);
  }
  strict.strictEqual(toDisplay('09:30'), '09:30 AM');
  strict.strictEqual(toDisplay('21:30'), '09:30 PM');
  strict.strictEqual(addMinutes('22:30', 120), '00:30');
  strict.strictEqual(toMin('09:00'), 540);
  strict.strictEqual(toMin(''), null);
  console.log('time utils: all checks passed');
};

if (typeof process !== 'undefined' && process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  await check();
}
