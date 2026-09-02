import { useMemo } from 'react';
import { useGetAttendanceCalendarQuery } from '../../../services/attendanceApi';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns';

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

export default function CalendarGrid({ currentMonth, selectedDate, onSelectDate, employeeId, viewMode = 'month' }) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data } = useGetAttendanceCalendarQuery(
    { employeeId, year, month },
    { skip: !employeeId }
  );

  const records = data?.data?.records || [];

  const recordMap = useMemo(() => {
    const map = {};
    for (const rec of records) {
      const key = format(new Date(rec.date), 'yyyy-MM-dd');
      map[key] = rec;
    }
    return map;
  }, [records]);

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
          const rec = recordMap[dateKey];
          const inMonth = isSameMonth(day, currentMonth);
          const selected = isSameDay(day, selectedDate);
          const todayCheck = isToday(day);
          const isWeekView = viewMode === 'week';

          return (
            <button
              key={dateKey}
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
              {rec && STATUS_DOT[rec.status] && (
                <span className={`mt-1 w-2 h-2 rounded-full ${STATUS_DOT[rec.status]}`} />
              )}
              {rec && (
                <div className="mt-1 text-[10px] text-zinc-500 text-center leading-tight">
                  {rec.clockIn?.time && (
                    <div className="text-green-600">In {format(new Date(rec.clockIn.time), 'hh:mm a')}</div>
                  )}
                  {rec.clockOut?.time && (
                    <div className="text-red-500">Out {format(new Date(rec.clockOut.time), 'hh:mm a')}</div>
                  )}
                  {rec.workHours > 0 && (
                    <div className="text-zinc-600 font-medium">{rec.workHours}h</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
