// Office hours for review clocks: 10:00–19:00 IST, Monday to Saturday.
// shortcut: fixed hours, holidays not skipped; read the attendance shift + holiday list if teams work other hours.
const IST = 330 * 60e3; // India has no daylight saving, so a fixed offset is exact
const OPEN = 10 * 60;
const CLOSE = 19 * 60;
const DAY = 864e5;

// The moment `minutes` of office time have passed after `from`.
export const addWorkingMinutes = (from, minutes) => {
  let t = new Date(from).getTime() + IST; // shifted so the UTC getters read Indian wall-clock time
  let left = minutes;
  for (;;) {
    const d = new Date(t);
    const dayStart = t - (d.getUTCHours() * 60 + d.getUTCMinutes()) * 60e3 - d.getUTCSeconds() * 1e3 - d.getUTCMilliseconds();
    const now = (t - dayStart) / 60e3;
    if (d.getUTCDay() === 0 || now >= CLOSE) { t = dayStart + DAY + OPEN * 60e3; continue; }
    if (now < OPEN) t = dayStart + OPEN * 60e3;
    const room = CLOSE - (t - dayStart) / 60e3;
    if (left <= room) return new Date(t + left * 60e3 - IST);
    left -= room;
    t = dayStart + DAY + OPEN * 60e3;
  }
};

// Quiet hours for task pushes: 21:00–08:00 IST. Returns when they end (08:00 IST), or null outside them.
export const quietHoursEnd = (at) => {
  const t = new Date(at).getTime() + IST;
  const d = new Date(t);
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (mins >= 8 * 60 && mins < 21 * 60) return null;
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(dayStart + (mins >= 21 * 60 ? DAY : 0) + 8 * 60 * 60e3 - IST);
};
