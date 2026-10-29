const neutral = { label: 'Attendance', dot: 'bg-zinc-400', badge: 'bg-zinc-50 text-zinc-600 border-zinc-200', text: 'text-zinc-500' };

const statuses = {
  present: { label: 'Present', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: 'text-emerald-600' },
  absent: { label: 'Absent', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-100', text: 'text-red-600' },
  weekend: { ...neutral, label: 'Weekend' },
  leave: { label: 'On leave', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800 border-amber-100', text: 'text-amber-600' },
  half_day: { label: 'Half day', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-800 border-orange-100', text: 'text-orange-600' },
  wfh: { label: 'Work from home', dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100', text: 'text-indigo-600' },
  holiday: { label: 'Holiday', dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-100', text: 'text-sky-600' },
  late: { label: 'Late', dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-800 border-yellow-200', text: 'text-yellow-600' },
};

export function getAttendanceCalendarMeta(record) {
  const meta = statuses[record?.status] || neutral;
  if (record?.isLate && ['present', 'wfh', 'half_day'].includes(record.status)) {
    return { ...statuses.late, label: `${meta.label} · Late` };
  }
  return meta;
}
