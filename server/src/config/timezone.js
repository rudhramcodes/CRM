// Attendance days, late checks and crons all use local time: pin it to India so a UTC host can't shift them.
// Imported first in server.js, before any module reads the clock.
process.env.TZ = 'Asia/Kolkata';
