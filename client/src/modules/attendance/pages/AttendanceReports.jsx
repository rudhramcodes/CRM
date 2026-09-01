import { useState } from 'react';
import { useGetDailyReportQuery, useGetWeeklyReportQuery, useGetMonthlyReportQuery } from '../../../services/attendanceApi';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const STATUS_COLORS = {
  present: '#22c55e',
  absent: '#ef4444',
  late: '#eab308',
  half_day: '#f97316',
  leave: '#a855f7',
  holiday: '#3b82f6',
  weekend: '#9ca3af',
  wfh: '#6366f1',
};

export default function AttendanceReports() {
  const [reportType, setReportType] = useState('monthly');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const weekStart = format(startOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthYear = { year: new Date(date).getFullYear(), month: new Date(date).getMonth() + 1 };

  const { data: dailyData, isLoading: dailyLoading } = useGetDailyReportQuery({ date }, { skip: reportType !== 'daily' });
  const { data: weeklyData, isLoading: weeklyLoading } = useGetWeeklyReportQuery({ startDate: weekStart }, { skip: reportType !== 'weekly' });
  const { data: monthlyData, isLoading: monthlyLoading } = useGetMonthlyReportQuery(monthYear, { skip: reportType !== 'monthly' });

  const records = (
    reportType === 'daily' ? dailyData?.data?.records :
    reportType === 'weekly' ? weeklyData?.data?.records :
    monthlyData?.data?.records
  ) || [];

  const isLoading = dailyLoading || weeklyLoading || monthlyLoading;

  const statusCounts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
    color: STATUS_COLORS[status] || '#6b7280',
  }));

  const employeeHours = records
    .filter((r) => r.workHours > 0)
    .reduce((acc, r) => {
      const name = r.employee?.name || 'Unknown';
      const existing = acc.find((e) => e.name === name);
      if (existing) {
        existing.hours += r.workHours;
      } else {
        acc.push({ name, hours: r.workHours });
      }
      return acc;
    }, [])
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <p className="text-sm text-gray-500">Analytics and workforce insights</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['daily', 'weekly', 'monthly'].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${
                reportType === type ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-12">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Top Work Hours</h3>
          {employeeHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-12">No data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No records found</td></tr>
            ) : (
              records.map((rec) => (
                <tr key={rec._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{rec.employee?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(rec.date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rec.clockIn?.time ? format(new Date(rec.clockIn.time), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rec.clockOut?.time ? format(new Date(rec.clockOut.time), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rec.workHours ? `${rec.workHours}h` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rec.overtime ? `${rec.overtime}h` : '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[rec.status] + '20', color: STATUS_COLORS[rec.status] }}
                    >
                      {rec.status?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
