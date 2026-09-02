import { useGetAttendanceStatsQuery } from '../../../services/attendanceApi';
import { CheckCircle, XCircle, Clock, Award } from 'lucide-react';

export default function AttendanceStats({ employeeId }) {
  const { data, isLoading } = useGetAttendanceStatsQuery(
    { employee: employeeId },
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
  const { present = 0, absent = 0, late = 0, leave = 0, totalWorkHours = 0, totalOvertime = 0, totalDays = 0 } = stats;

  const attendanceRate = totalDays > 0 ? Math.round(((present + leave) / totalDays) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
      <h3 className="font-semibold text-zinc-900">This Month</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
           
           
          <div>
            <p className="text-lg font-bold text-zinc-900">{present}</p>
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
          <span className="font-medium text-zinc-900">{attendanceRate}%</span>
        </div>
        <div className="w-full bg-zinc-200 rounded-full h-2">
          <div className="bg-primary-900 h-2 rounded-full" style={{ width: `${Math.min(attendanceRate, 100)}%` }} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Total Hours</span>
          <span className="font-medium text-zinc-900">{totalWorkHours}h</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Total Overtime</span>
          <span className="font-medium text-green-600">{totalOvertime}h</span>
        </div>
      </div>
    </div>
  );
}
