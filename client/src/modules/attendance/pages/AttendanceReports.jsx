import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { useGetDailyReportQuery, useGetWeeklyReportQuery, useGetMonthlyReportQuery } from '../../../services/attendanceApi';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { format, startOfWeek, isValid } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, MapPin, Download, Users, Clock, Coffee, TrendingUp, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatHours, formatMinutes } from '../../../utils/formatters';

const safeFormat = (value, fmt, fallback = '—') => {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? format(d, fmt) : fallback;
};

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

const STATUS_BADGE = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  half_day: 'warning',
  leave: 'info',
  holiday: 'info',
  weekend: 'default',
  wfh: 'primary',
};

const getFirstClockIn = (rec) => {
  const first = rec.sessions?.[0];
  return first?.clockIn?.time || rec.clockIn?.time || null;
};

const getLastClockOut = (rec) => {
  const sessions = rec.sessions || [];
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].clockOut?.time) return sessions[i].clockOut.time;
  }
  return rec.clockOut?.time || null;
};

const getLocation = (rec) => {
  const loc = rec.sessions?.[0]?.clockIn?.location || rec.clockIn?.location;
  if (loc && loc.lat != null && loc.lng != null) {
    return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
  }
  return null;
};

const getTotalBreakMinutes = (rec) => {
  if (rec.totalBreakMinutes) return rec.totalBreakMinutes;
  let total = 0;
  for (const session of rec.sessions || []) {
    for (const brk of session.breaks || []) {
      total += brk.duration || 0;
    }
  }
  return total;
};

const getSessionBreakMinutes = (session) => {
  let total = 0;
  for (const brk of session.breaks || []) {
    if (brk.duration) total += brk.duration;
    else if (brk.start && brk.end) total += Math.round((new Date(brk.end) - new Date(brk.start)) / 60000);
  }
  return total;
};

const getSessionWorkMinutes = (session) => {
  if (!session.clockIn?.time) return 0;
  const end = session.clockOut?.time ? new Date(session.clockOut.time) : new Date();
  const brk = getSessionBreakMinutes(session);
  return Math.max(0, Math.round((end - new Date(session.clockIn.time)) / 60000) - brk);
};

export default function AttendanceReports() {
  const dispatch = useDispatch();
  const [reportType, setReportType] = useState('monthly');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    dispatch(setPageTitle('Attendance Reports'));
  }, [dispatch]);

  const weekStart = format(startOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthYear = { year: new Date(date).getFullYear(), month: new Date(date).getMonth() + 1 };

  const { data: dailyData, isLoading: dailyLoading } = useGetDailyReportQuery({ date }, { skip: reportType !== 'daily' });
  const { data: weeklyData, isLoading: weeklyLoading } = useGetWeeklyReportQuery({ startDate: weekStart }, { skip: reportType !== 'weekly' });
  const { data: monthlyData, isLoading: monthlyLoading } = useGetMonthlyReportQuery(monthYear, { skip: reportType !== 'monthly' });

  const rawRecords = (
    reportType === 'daily' ? dailyData?.data?.records :
    reportType === 'weekly' ? weeklyData?.data?.records :
    monthlyData?.data?.records
  ) || [];

  const records = rawRecords;

  const isLoading = dailyLoading || weeklyLoading || monthlyLoading;

  const toggleExpand = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalEmployees = records.length;
  const presentCount = records.filter((r) => r.status === 'present' || r.status === 'wfh').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const avgHours = records.length > 0
    ? (records.reduce((sum, r) => sum + (r.workHours || 0), 0) / records.length).toFixed(1)
    : 0;

  const statusCounts = records.reduce((acc, r) => {
    const status = r.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts)
    .filter(([status]) => status && status !== 'undefined')
    .map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
      color: STATUS_COLORS[status] || '#71717a',
    }));

  const employeeHours = records
    .filter((r) => r.workHours > 0 || (r.totalWorkHours || 0) > 0)
    .reduce((acc, r) => {
      const name = r.employee?.name || 'Unknown';
      const hours = r.workHours || r.totalWorkHours || 0;
      const existing = acc.find((e) => e.name === name);
      if (existing) {
        existing.hours += hours;
      } else {
        acc.push({ name, hours });
      }
      return acc;
    }, [])
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  const handleExport = () => {
    const exportData = [];
    for (const rec of records) {
      const sessions = rec.sessions || [];
      if (sessions.length === 0) {
        exportData.push({
          Employee: rec.employee?.name || '—',
          Date: safeFormat(rec.date, 'dd MMM yyyy'),
          Session: '—',
          'Clock In': safeFormat(getFirstClockIn(rec), 'hh:mm a'),
          'Clock Out': safeFormat(getLastClockOut(rec), 'hh:mm a'),
          'Work Hours': formatHours(rec.workHours || rec.totalWorkHours),
          Break: formatMinutes(getTotalBreakMinutes(rec)),
          Location: getLocation(rec) || '—',
          Status: (rec.status || '—').replace('_', ' '),
        });
      } else {
        for (let i = 0; i < sessions.length; i++) {
          const s = sessions[i];
          const workMin = getSessionWorkMinutes(s);
          const brkMin = getSessionBreakMinutes(s);
          const loc = s.clockIn?.location;
          exportData.push({
            Employee: rec.employee?.name || '—',
            Date: safeFormat(rec.date, 'dd MMM yyyy'),
            Session: `#${i + 1}`,
            'Clock In': safeFormat(s.clockIn?.time, 'hh:mm a'),
            'Clock Out': safeFormat(s.clockOut?.time, 'hh:mm a'),
            'Work Hours': formatHours(workMin / 60),
            Break: formatMinutes(brkMin),
            Location: (loc?.lat != null) ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : '—',
            Status: (rec.status || '—').replace('_', ' '),
          });
        }
      }
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, `attendance-report-${reportType}-${date}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Attendance Reports</h2>
          <p className="text-sm text-zinc-500 mt-1">Analytics and workforce insights</p>
        </div>
        {records.length > 0 && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total Employees</p>
              <p className="text-xl font-semibold text-zinc-900">{totalEmployees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Present Today</p>
              <p className="text-xl font-semibold text-zinc-900">{presentCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Users className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Absent</p>
              <p className="text-xl font-semibold text-zinc-900">{absentCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Avg. Hours</p>
              <p className="text-xl font-semibold text-zinc-900">{formatHours(avgHours)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-0.5 bg-zinc-100 rounded-lg p-0.5">
          {['daily', 'weekly', 'monthly'].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                reportType === type ? 'bg-white text-primary-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
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
          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-1 focus:ring-primary-900 focus:border-primary-900 outline-none"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-medium text-zinc-500 mb-4">Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No data" description="Select a different date range." />
          )}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-medium text-zinc-500 mb-4">Top Work Hours</h3>
          {employeeHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis tick={{ fill: '#71717a' }} tickFormatter={(value) => formatHours(value)} />
                <Tooltip formatter={(value) => formatHours(value)} />
                <Bar dataKey="hours" fill="#18181b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No data" description="Select a different date range." />
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : records.length === 0 ? (
          <EmptyState icon={BarChart3} title="No records" description="No attendance data for this period." />
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Clock In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Clock Out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Hours</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Break</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {records.map((rec) => {
                const sessions = rec.sessions || [];
                const multiSession = sessions.length > 1;
                const isExpanded = expandedRows.has(rec._id);
                const breakMin = getTotalBreakMinutes(rec);
                const location = getLocation(rec);
                return (
                  <Fragment key={rec._id}>
                    <tr
                      className={`transition-colors ${multiSession ? 'cursor-pointer hover:bg-zinc-50' : ''}`}
                      onClick={() => multiSession && toggleExpand(rec._id)}
                    >
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {multiSession && (
                          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                        {rec.employee?.name || '—'}
                        {multiSession && (
                          <span className="ml-2 text-xs text-zinc-400">{sessions.length} sessions</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{safeFormat(rec.date, 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{safeFormat(getFirstClockIn(rec), 'hh:mm a')}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{safeFormat(getLastClockOut(rec), 'hh:mm a')}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{formatHours(rec.workHours || rec.totalWorkHours)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{breakMin > 0 ? formatMinutes(breakMin) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {location ? (
                          <span className="flex items-center gap-1" title={location}>
                            <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                            {location}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[rec.status] || 'default'}>{rec.status?.replace('_', ' ')}</Badge>
                      </td>
                    </tr>
                    {isExpanded && multiSession && (
                      <tr>
                        <td colSpan={9} className="px-4 py-2 bg-zinc-50">
                          <div className="ml-8 space-y-2">
                            {sessions.map((s, i) => {
                              const sBrk = getSessionBreakMinutes(s);
                              const sWork = getSessionWorkMinutes(s);
                              const sLoc = s.clockIn?.location;
                              return (
                                <div key={i} className="flex items-center gap-6 text-xs text-zinc-600 py-1.5 border-b border-zinc-100 last:border-0">
                                  <span className="font-medium text-zinc-700 w-16">#{i + 1}</span>
                                  <span>In: {safeFormat(s.clockIn?.time, 'hh:mm a')}</span>
                                  <span>Out: {s.clockOut?.time ? safeFormat(s.clockOut.time, 'hh:mm a') : '—'}</span>
                                  <span>{formatHours(sWork / 60)}</span>
                                  {sBrk > 0 && <span className="text-amber-600">Break: {formatMinutes(sBrk)}</span>}
                                  {sLoc?.lat != null && (
                                    <span className="text-zinc-400 flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {sLoc.lat.toFixed(4)}, {sLoc.lng.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : records.length === 0 ? (
          <EmptyState icon={BarChart3} title="No records" description="No data for this period." />
        ) : (
          records.map((rec) => {
            const sessions = rec.sessions || [];
            const multiSession = sessions.length > 1;
            const isExpanded = expandedRows.has(rec._id);
            const breakMin = getTotalBreakMinutes(rec);
            const location = getLocation(rec);
            return (
              <div key={rec._id} className="bg-white rounded-xl border border-zinc-200 p-4">
                <div
                  className={`flex items-center justify-between mb-2 ${multiSession ? 'cursor-pointer' : ''}`}
                  onClick={() => multiSession && toggleExpand(rec._id)}
                >
                  <p className="font-medium text-zinc-900 flex items-center gap-2">
                    {rec.employee?.name || '—'}
                    {multiSession && (
                      <>
                        <ChevronRight className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        <span className="text-xs text-zinc-400">{sessions.length} sessions</span>
                      </>
                    )}
                  </p>
                  <Badge variant={STATUS_BADGE[rec.status] || 'default'}>{rec.status?.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-zinc-500 mb-2">{safeFormat(rec.date, 'dd MMM yyyy')}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-zinc-400">In:</span>{' '}
                    <span className="text-zinc-700">{safeFormat(getFirstClockIn(rec), 'hh:mm a')}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Out:</span>{' '}
                    <span className="text-zinc-700">{safeFormat(getLastClockOut(rec), 'hh:mm a')}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Hours:</span>{' '}
                    <span className="text-zinc-700">{formatHours(rec.workHours || rec.totalWorkHours)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Break:</span>{' '}
                    <span className="text-zinc-700">{breakMin > 0 ? formatMinutes(breakMin) : '—'}</span>
                  </div>
                  {location && (
                    <div className="col-span-2">
                      <span className="text-zinc-400">Location:</span>{' '}
                      <span className="text-zinc-700 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-zinc-400" />
                        {location}
                      </span>
                    </div>
                  )}
                </div>
                {isExpanded && multiSession && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2">
                    {sessions.map((s, i) => {
                      const sBrk = getSessionBreakMinutes(s);
                      const sWork = getSessionWorkMinutes(s);
                      const sLoc = s.clockIn?.location;
                      return (
                        <div key={i} className="flex items-center gap-4 text-xs text-zinc-600 py-1.5 border-b border-zinc-50 last:border-0">
                          <span className="font-medium text-zinc-700 w-12">#{i + 1}</span>
                          <span>In: {safeFormat(s.clockIn?.time, 'hh:mm a')}</span>
                          <span>Out: {s.clockOut?.time ? safeFormat(s.clockOut.time, 'hh:mm a') : '—'}</span>
                          <span>{formatHours(sWork / 60)}</span>
                          {sBrk > 0 && <span className="text-amber-600">Brk: {sBrk}m</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
