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
  weekend: 'bg-gray-300',
  wfh: 'bg-indigo-500',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarGrid({ currentMonth, selectedDate, onSelectDate, employeeId }) {
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

  const calendarStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const rec = recordMap[dateKey];
          const inMonth = isSameMonth(day, currentMonth);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(day)}
              className={`relative flex flex-col items-center justify-center h-20 bg-white p-1 transition-colors
                ${!inMonth ? 'text-gray-300' : 'text-gray-700'}
                ${selected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}
              `}
            >
              <span
                className={`text-sm ${today ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold' : ''}`}
              >
                {format(day, 'd')}
              </span>
              {rec && STATUS_DOT[rec.status] && (
                <span className={`mt-1 w-2 h-2 rounded-full ${STATUS_DOT[rec.status]}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
