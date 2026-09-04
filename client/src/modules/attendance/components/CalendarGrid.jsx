import { useMemo } from 'react';
import { useGetAttendanceCalendarQuery, useGetHolidaysQuery } from '../../../services/attendanceApi';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { formatHours, formatMinutes } from '../../../utils/formatters';

const STATUS_DOT = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  late: 'bg-yellow-500',
  half_day: 'bg-orange-500',
  leave: 'bg-purple-500',
  holiday: 'bg-blue-500',
  weekend: 'bg-zinc-300',
  wfh: 'bg-indigo-500',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const monthParams = (anchor, offset) => {
  const d = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

const punchTimes = (rec) => {
  const sessions = rec?.sessions || [];
  const withIn = sessions.filter((s) => s.clockIn?.time);
  const firstIn = withIn[0]?.clockIn?.time || rec?.clockIn?.time;
  const lastOutSession = [...sessions].reverse().find((s) => s.clockOut?.time);
  const lastOut = lastOutSession?.clockOut?.time || rec?.clockOut?.time;
  return { firstIn, lastOut };
};

const dotClass = (rec) => {
  if (!rec) return null;
  if (rec.isLate && ['present', 'wfh', 'half_day'].includes(rec.status)) {
    return STATUS_DOT.late;
  }
  return STATUS_DOT[rec.status] || null;
};

export default function CalendarGrid({ currentMonth, selectedDate, onSelectDate, employeeId, viewMode = 'month' }) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const prev = monthParams(currentMonth, -1);
  const next = monthParams(currentMonth, 1);

  const skip = !employeeId;
  const currentQ = useGetAttendanceCalendarQuery({ employeeId, year, month }, { skip });
  const prevQ = useGetAttendanceCalendarQuery(
    { employeeId, year: prev.year, month: prev.month },
    { skip }
  );
  const nextQ = useGetAttendanceCalendarQuery(
    { employeeId, year: next.year, month: next.month },
    { skip }
  );

  const holidaysCurrent = useGetHolidaysQuery({ year, page: 1, limit: 100 });
  const holidaysPrevYear = useGetHolidaysQuery({ year: year - 1, page: 1, limit: 100 }, { skip: month !== 1 });
  const holidaysNextYear = useGetHolidaysQuery({ year: year + 1, page: 1, limit: 100 }, { skip: month !== 12 });

  const records = useMemo(() => {
    const merged = [
      ...(prevQ.data?.data?.records || []),
      ...(currentQ.data?.data?.records || []),
      ...(nextQ.data?.data?.records || []),
    ];
    const map = {};
    for (const rec of merged) {
      map[format(new Date(rec.date), 'yyyy-MM-dd')] = rec;
    }
    return map;
  }, [prevQ.data, currentQ.data, nextQ.data]);

  const holidayMap = useMemo(() => {
    const list = [
      ...(Array.isArray(holidaysCurrent.data?.data) ? holidaysCurrent.data.data : holidaysCurrent.data?.data?.holidays || []),
      ...(Array.isArray(holidaysPrevYear.data?.data) ? holidaysPrevYear.data.data : holidaysPrevYear.data?.data?.holidays || []),
      ...(Array.isArray(holidaysNextYear.data?.data) ? holidaysNextYear.data.data : holidaysNextYear.data?.data?.holidays || []),
    ];
    const map = {};
    for (const h of list) {
      if (!h?.date) continue;
      map[format(new Date(h.date), 'yyyy-MM-dd')] = h;
    }
    return map;
  }, [holidaysCurrent.data, holidaysPrevYear.data, holidaysNextYear.data]);

  const days = useMemo(() => {
    if (viewMode === 'week') {
      return eachDayOfInterval({
        start: startOfWeek(currentMonth, { weekStartsOn: 0 }),
        end: endOfWeek(currentMonth, { weekStartsOn: 0 }),
      });
    }
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
    });
  }, [currentMonth, viewMode]);

  if (currentQ.isLoading) {
    return (
      <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-lg overflow-hidden animate-pulse">
        {Array.from({ length: viewMode === 'week' ? 7 : 35 }).map((_, i) => (
          <div key={i} className={`${viewMode === 'week' ? 'h-24 md:h-32' : 'h-20 md:h-24'} bg-white`} />
        ))}
      </div>
    );
  }

  if (currentQ.isError) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-8 text-center">
        <p className="text-sm text-red-700">Could not load calendar.</p>
        <button
          type="button"
          onClick={() => currentQ.refetch()}
          className="mt-2 text-sm font-medium text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-lg overflow-hidden">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const rec = records[dateKey];
          const holiday = holidayMap[dateKey];
          const inMonth = isSameMonth(day, currentMonth);
          const selected = isSameDay(day, selectedDate);
          const todayCheck = isToday(day);
          const isWeekView = viewMode === 'week';
          const { firstIn, lastOut } = punchTimes(rec);
          const color = rec ? dotClass(rec) : holiday ? STATUS_DOT.holiday : null;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`relative flex flex-col items-center justify-center bg-white p-1 transition-colors
                ${isWeekView ? 'h-24 md:h-32' : 'h-20 md:h-24'}
                ${!inMonth && !isWeekView ? 'text-zinc-300' : 'text-zinc-700'}
                ${selected ? 'ring-2 ring-inset ring-primary-900 bg-primary-50' : 'hover:bg-zinc-50'}
              `}
            >
              <span
                className={`text-sm ${todayCheck ? 'bg-primary-900 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold' : ''}`}
              >
                {format(day, 'd')}
              </span>
              {color && (
                <span className={`mt-1 w-2 h-2 rounded-full ${color}`} />
              )}
              {rec && (
                <div className="mt-1 text-[10px] text-zinc-500 text-center leading-tight">
                  {firstIn && (
                    <div className="text-green-600">In {format(new Date(firstIn), 'hh:mm a')}</div>
                  )}
                  {lastOut && (
                    <div className="text-red-500">Out {format(new Date(lastOut), 'hh:mm a')}</div>
                  )}
                  {rec.workHours !== null && rec.workHours !== undefined && (
                    <div className="text-zinc-600 font-medium">{formatHours(rec.workHours)}</div>
                  )}
                  {rec.totalBreakMinutes !== null && rec.totalBreakMinutes !== undefined && (
                    <div className="text-amber-600">Brk {formatMinutes(rec.totalBreakMinutes)}</div>
                  )}
                </div>
              )}
              {!rec && holiday && (
                <div className="mt-1 text-[10px] text-blue-600 text-center leading-tight px-0.5 line-clamp-2">
                  {holiday.name}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
