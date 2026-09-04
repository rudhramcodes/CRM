import { useGetAttendanceStatsQuery } from '../../../services/attendanceApi';
import { CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { endOfMonth, format, isSameMonth, startOfMonth } from 'date-fns';
import { formatHours } from '../../../utils/formatters';

export default function AttendanceStats({ employeeId, monthDate = new Date() }) {
  const dateFrom = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const dateTo = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const { data, isLoading } = useGetAttendanceStatsQuery(
    { employee: employeeId, dateFrom, dateTo },
    { skip: !employeeId }
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-200 rounded w-1/3" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-zinc-100 rounded-lg" />
            <div className="h-16 bg-zinc-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.data || {};
  const {
    present = 0,
    wfh = 0,
    absent = 0,
    half_day: halfDay = 0,
    late = 0,
    leave = 0,
    totalWorkHours = 0,
    totalOvertime = 0,
  } = stats;

  const presentCount = present + wfh;
  const rateDenom = present + wfh + absent + halfDay;
  const attendanceRate = rateDenom > 0 ? Math.round((presentCount / rateDenom) * 100) : null;
  const title = isSameMonth(monthDate, new Date()) ? 'This Month' : format(monthDate, 'MMMM yyyy');

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
      <h3 className="font-semibold text-zinc-900">{title}</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-zinc-900">{presentCount}</p>
            <p className="text-xs text-zinc-500">Present</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-zinc-900">{absent}</p>
            <p className="text-xs text-zinc-500">Absent</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-zinc-900">{late}</p>
            <p className="text-xs text-zinc-500">Late</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
          <Award className="h-5 w-5 text-purple-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-zinc-900">{leave}</p>
            <p className="text-xs text-zinc-500">Leave</p>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Attendance Rate</span>
          <span className="font-medium text-zinc-900">{attendanceRate == null ? '—' : `${attendanceRate}%`}</span>
        </div>
        <div className="w-full bg-zinc-200 rounded-full h-2">
          <div
            className="bg-primary-900 h-2 rounded-full"
            style={{ width: `${attendanceRate == null ? 0 : Math.min(attendanceRate, 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-zinc-400">Present includes WFH. Leave and holidays are excluded from the rate.</p>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Total Hours</span>
          <span className="font-medium text-zinc-900">{formatHours(totalWorkHours)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Total Overtime</span>
          <span className="font-medium text-green-600">{formatHours(totalOvertime)}</span>
        </div>
      </div>
    </div>
  );
}
