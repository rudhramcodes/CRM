import { useGetAttendanceStatsQuery } from '../../../services/attendanceApi';
import { TrendingUp, CheckCircle, XCircle, Clock, Award } from 'lucide-react';

export default function AttendanceStats({ employeeId }) {
  const { data, isLoading } = useGetAttendanceStatsQuery(
    { employee: employeeId },
    { skip: !employeeId }
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-400">Loading stats...</p>
      </div>
    );
  }

  const stats = data?.data || {};
  const { totalDays = 0, present = 0, absent = 0, late = 0, leave = 0, halfDay = 0, totalWorkHours = 0, avgWorkHours = 0, totalOvertime = 0, attendanceRate = 0 } = stats;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">This Month</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">{present}</p>
            <p className="text-xs text-gray-500">Present</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
          <XCircle className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">{absent}</p>
            <p className="text-xs text-gray-500">Absent</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
          <Clock className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">{late}</p>
            <p className="text-xs text-gray-500">Late</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
          <Award className="h-5 w-5 text-purple-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">{leave}</p>
            <p className="text-xs text-gray-500">Leave</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Attendance Rate</span>
          <span className="font-medium text-gray-900">{attendanceRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(attendanceRate, 100)}%` }} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Avg Daily Hours</span>
          <span className="font-medium text-gray-900">{avgWorkHours}h</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Overtime</span>
          <span className="font-medium text-green-600">{totalOvertime}h</span>
        </div>
      </div>
    </div>
  );
}
