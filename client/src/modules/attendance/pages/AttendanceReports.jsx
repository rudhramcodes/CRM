import { useEffect, useMemo, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { useGetDailyReportQuery, useGetWeeklyReportQuery, useGetMonthlyReportQuery } from '../../../services/attendanceApi';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { DatePickerSimple } from '../../../components/ui/DatePickerSimple';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Users, Clock, TrendingUp, ChevronLeft, ChevronRight, CalendarDays, UserCheck, UserX, Umbrella, Timer, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatHours, formatMinutes } from '../../../utils/formatters';

const STATUS_COLORS = {
  present: '#10b981',
  wfh: '#6366f1',
  absent: '#f43f5e',
  leave: '#a855f7',
  late: '#f59e0b',
  half_day: '#f97316',
  holiday: '#3b82f6',
  weekend: '#94a3b8',
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

const REPORT_PAGE_SIZE = 10;

const safeFormat = (value, fmt, fallback = '—') => {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? format(d, fmt) : fallback;
};

const getEmployeeKey = (record) => (
  record.employee?._id || record.employee?.id || record.employee?.email || record.employee?.name || record.employeeId || record._id
);

const getFirstClockIn = (record) => record.sessions?.[0]?.clockIn?.time || record.clockIn?.time || null;

const getLastClockOut = (record) => {
  const sessions = record.sessions || [];
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    if (sessions[i].clockOut?.time) return sessions[i].clockOut.time;
  }
  return record.clockOut?.time || null;
};

const getLocation = (record) => {
  const location = record.sessions?.[0]?.clockIn?.location || record.clockIn?.location;
  return location?.lat != null && location?.lng != null
    ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    : null;
};

const getTotalBreakMinutes = (record) => {
  if (record.totalBreakMinutes != null) return Number(record.totalBreakMinutes) || 0;
  return (record.sessions || []).reduce((total, session) => (
    total + (session.breaks || []).reduce((sum, breakItem) => {
      if (breakItem.duration != null) return sum + (Number(breakItem.duration) || 0);
      if (breakItem.start && breakItem.end) {
        return sum + Math.max(0, Math.round((new Date(breakItem.end) - new Date(breakItem.start)) / 60000));
      }
      return sum;
    }, 0)
  ), 0);
};

const getSessionBreakMinutes = (session) => (session.breaks || []).reduce((total, breakItem) => {
  if (breakItem.duration != null) return total + (Number(breakItem.duration) || 0);
  if (breakItem.start && breakItem.end) {
    return total + Math.max(0, Math.round((new Date(breakItem.end) - new Date(breakItem.start)) / 60000));
  }
  return total;
}, 0);

const getSessionWorkMinutes = (session) => {
  if (!session.clockIn?.time) return 0;
  const end = session.clockOut?.time ? new Date(session.clockOut.time) : new Date();
  return Math.max(0, Math.round((end - new Date(session.clockIn.time)) / 60000) - getSessionBreakMinutes(session));
};

const getRecordWorkHours = (record) => {
  const directHours = Number(record.workHours ?? record.totalWorkHours);
  if (Number.isFinite(directHours)) return Math.max(0, directHours);
  return (record.sessions || []).reduce((total, session) => total + getSessionWorkMinutes(session) / 60, 0);
};

function ReportTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-semibold capitalize text-zinc-900">{label || item.name}</p>
      <p className="text-sm font-medium text-primary-900">{item.name === 'hours' ? formatHours(item.value) : `${item.value} records`}</p>
    </div>
  );
}

export default function AttendanceReports() {
  const dispatch = useDispatch();
  const [reportType, setReportType] = useState('monthly');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportPage, setReportPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    dispatch(setPageTitle('Attendance Reports'));
  }, [dispatch]);

  useEffect(() => {
    setExpandedRows(new Set());
    setReportPage(1);
  }, [reportType, date]);

  const selectedDate = new Date(`${date}T00:00:00`);
  const period = useMemo(() => {
    if (reportType === 'daily') return { start: selectedDate, end: selectedDate, label: format(selectedDate, 'dd MMM yyyy') };
    if (reportType === 'weekly') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return { start, end, label: `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}` };
    }
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return { start, end, label: `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}` };
  }, [reportType, date]);

  const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthYear = { year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1 };

  const { data: dailyData, isLoading: dailyLoading, isFetching: dailyFetching } = useGetDailyReportQuery({ date }, { skip: reportType !== 'daily' });
  const { data: weeklyData, isLoading: weeklyLoading, isFetching: weeklyFetching } = useGetWeeklyReportQuery({ startDate: weekStart }, { skip: reportType !== 'weekly' });
  const { data: monthlyData, isLoading: monthlyLoading, isFetching: monthlyFetching } = useGetMonthlyReportQuery(monthYear, { skip: reportType !== 'monthly' });

  const records = (
    reportType === 'daily' ? dailyData?.data?.records :
    reportType === 'weekly' ? weeklyData?.data?.records :
    monthlyData?.data?.records
  ) || [];
  const isLoading = dailyLoading || weeklyLoading || monthlyLoading;
  const isFetching = dailyFetching || weeklyFetching || monthlyFetching;
  const reportTotalPages = Math.max(1, Math.ceil(records.length / REPORT_PAGE_SIZE));
  const visibleRecords = records.slice((reportPage - 1) * REPORT_PAGE_SIZE, reportPage * REPORT_PAGE_SIZE);

  useEffect(() => {
    if (reportPage > reportTotalPages) setReportPage(reportTotalPages);
  }, [reportPage, reportTotalPages]);

  const metrics = useMemo(() => {
    const employeeKeys = new Set(records.map(getEmployeeKey).filter(Boolean));
    const present = records.filter((record) => ['present', 'wfh', 'late', 'half_day'].includes(record.status));
    const absent = records.filter((record) => record.status === 'absent');
    const leave = records.filter((record) => record.status === 'leave');
    const worked = records.filter((record) => getRecordWorkHours(record) > 0);
    const totalWorkedHours = worked.reduce((total, record) => total + getRecordWorkHours(record), 0);
    const averageWorkedHours = worked.length ? totalWorkedHours / worked.length : 0;
    const attendanceRate = records.length ? Math.round((present.length / records.length) * 100) : 0;
    return {
      totalEmployees: employeeKeys.size,
      presentDays: present.length,
      absentDays: absent.length,
      leaveDays: leave.length,
      totalWorkedRecords: worked.length,
      averageWorkedHours,
      attendanceRate,
      totalRecords: records.length,
    };
  }, [records]);

  const statusData = useMemo(() => {
    const counts = records.reduce((result, record) => {
      const status = record.status || 'unknown';
      result[status] = (result[status] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts).map(([status, value]) => ({
      name: status.replace('_', ' '),
      status,
      value,
      color: STATUS_COLORS[status] || '#71717a',
    }));
  }, [records]);

  const employeeHours = useMemo(() => {
    const grouped = records.reduce((result, record) => {
      const name = record.employee?.name || 'Unknown employee';
      const hours = getRecordWorkHours(record);
      if (hours <= 0) return result;
      const current = result[name] || 0;
      result[name] = current + hours;
      return result;
    }, {});
    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [records]);

  const toggleExpand = (id) => {
    setExpandedRows((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cards = [
    { label: 'Unique Employees', value: metrics.totalEmployees, helper: `${metrics.totalRecords} attendance records in period`, icon: Users, color: 'blue' },
    { label: 'Present Records', value: metrics.presentDays, helper: 'Present attendance records in period', icon: UserCheck, color: 'emerald' },
    { label: 'Absent Records', value: metrics.absentDays, helper: 'Absent attendance records in period', icon: UserX, color: 'rose' },
    { label: 'Leave Records', value: metrics.leaveDays, helper: 'Approved leave attendance records', icon: Umbrella, color: 'purple' },
    { label: 'Attendance Rate', value: `${metrics.attendanceRate}%`, helper: `${metrics.presentDays} present of ${metrics.totalRecords} records`, icon: TrendingUp, color: 'indigo' },
    { label: 'Avg. Worked Time', value: formatHours(metrics.averageWorkedHours), helper: `Across ${metrics.totalWorkedRecords} worked records`, icon: Timer, color: 'amber' },
  ];

  return (
    <div className="min-h-full space-y-6 bg-zinc-50/60 pb-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-primary-900">Attendance Reports</h2>
            {isFetching && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700"><Activity className="h-3 w-3 animate-pulse" /> Updating</span>}
          </div>
          <p className="mt-1 text-sm text-zinc-500">Analytics and workforce insights for <span className="font-medium text-zinc-700">{period.label}</span></p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
          <CalendarDays className="h-4 w-4 text-primary-600" />
          <span>{reportType === 'daily' ? 'Daily view' : reportType === 'weekly' ? 'Weekly view' : 'Monthly view'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full gap-1 rounded-xl bg-zinc-100 p-1 sm:w-auto">
          {['daily', 'weekly', 'monthly'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setReportType(type)}
              className={`relative flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all duration-200 sm:flex-none ${reportType === type ? 'bg-white text-primary-900 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-800'}`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <DatePickerSimple
            value={date}
            onChange={setDate}
            label="Reference date"
            placeholder="Select date"
            className="w-[180px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const colors = {
            blue: 'bg-blue-50 text-blue-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            rose: 'bg-rose-50 text-rose-600',
            purple: 'bg-purple-50 text-purple-600',
            indigo: 'bg-indigo-50 text-indigo-600',
            amber: 'bg-amber-50 text-amber-600',
          };
          return (
            <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className={`rounded-xl p-2.5 ${colors[card.color]}`}><Icon className="h-5 w-5" /></div>
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{reportType}</span>
              </div>
              <p className="mt-4 text-xs font-medium text-zinc-500">{card.label}</p>
              <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-zinc-900">{isLoading ? '—' : card.value}</p>
              <p className="mt-1 truncate text-[11px] text-zinc-400">{card.helper}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-3 flex items-start justify-between">
            <div><h3 className="font-semibold text-zinc-900">Status Distribution</h3><p className="mt-0.5 text-xs text-zinc-400">Attendance records in this period</p></div>
            <div className="rounded-lg bg-zinc-50 p-2 text-zinc-400"><Activity className="h-4 w-4" /></div>
          </div>
          {statusData.length > 0 ? (
            <div className="relative h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={65} outerRadius={96} paddingAngle={3} stroke="none" labelLine={false}>
                    {statusData.map((entry) => <Cell key={entry.status} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ReportTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1"><span className="text-2xl font-semibold text-zinc-900">{metrics.totalRecords}</span><span className="text-[11px] text-zinc-400">records</span></div>
            </div>
          ) : <EmptyState icon={BarChart3} title="No status data" description="Choose another reporting period." />}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-100 pt-3">
            {statusData.map((entry) => <span key={entry.status} className="inline-flex items-center gap-1.5 text-xs capitalize text-zinc-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />{entry.name}: <strong>{entry.value}</strong></span>)}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-3 flex items-start justify-between"><div><h3 className="font-semibold text-zinc-900">Top Work Hours</h3><p className="mt-0.5 text-xs text-zinc-400">Highest worked duration for {period.label}</p></div><div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><TrendingUp className="h-4 w-4" /></div></div>
          {employeeHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={employeeHours} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}…` : value} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(value) => formatHours(value)} width={42} />
                <Tooltip content={<ReportTooltip />} cursor={{ fill: '#f4f4f5' }} />
                <Bar dataKey="hours" name="hours" fill="#18181b" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={Clock} title="No worked hours" description="No completed work duration exists in this period." />}
        </motion.section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-zinc-900">Attendance Details</h3><p className="text-xs text-zinc-400">{records.length} records · {period.label}</p></div><span className="text-xs font-medium text-zinc-500">Times shown in local time</span></div>
        {isLoading ? <TableSkeleton rows={6} /> : records.length === 0 ? <div className="p-8"><EmptyState icon={BarChart3} title="No attendance records" description="Choose another date or reporting period." /></div> : (
          <>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px]"><thead className="bg-zinc-50/80"><tr>{['', 'Employee', 'Date', 'Clock In', 'Clock Out', 'Worked', 'Break', 'Location', 'Status'].map((heading, index) => <th key={heading || index} className="border-b border-zinc-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-zinc-100">
              {visibleRecords.map((record) => {
                const sessions = record.sessions || [];
                const expanded = expandedRows.has(record._id);
                const breakMinutes = getTotalBreakMinutes(record);
                const location = getLocation(record);
                return <Fragment key={record._id}>
                  <tr className={`transition-colors ${sessions.length > 1 ? 'cursor-pointer hover:bg-zinc-50' : 'hover:bg-zinc-50/50'}`} onClick={() => sessions.length > 1 && toggleExpand(record._id)}>
                    <td className="w-8 px-3 py-3 text-zinc-400">{sessions.length > 1 && <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{record.employee?.name || '—'}{sessions.length > 1 && <span className="ml-2 text-[11px] font-normal text-zinc-400">{sessions.length} sessions</span>}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{safeFormat(record.date, 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{safeFormat(getFirstClockIn(record), 'hh:mm a')}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{safeFormat(getLastClockOut(record), 'hh:mm a')}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-800">{formatHours(getRecordWorkHours(record))}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{breakMinutes > 0 ? formatMinutes(breakMinutes) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{location || '—'}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[record.status] || 'default'}>{record.status?.replace('_', ' ') || '—'}</Badge></td>
                  </tr>
                  {expanded && sessions.length > 1 && <tr><td colSpan={9} className="bg-zinc-50 px-8 py-3"><div className="space-y-2">{sessions.map((session, index) => <div key={index} className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-zinc-200/70 py-1.5 text-xs text-zinc-600 last:border-0"><span className="font-medium text-zinc-700">Session {index + 1}</span><span>In: {safeFormat(session.clockIn?.time, 'hh:mm a')}</span><span>Out: {session.clockOut?.time ? safeFormat(session.clockOut.time, 'hh:mm a') : 'In Progress'}</span><span>Worked: {formatMinutes(getSessionWorkMinutes(session))}</span><span>Break: {formatMinutes(getSessionBreakMinutes(session))}</span></div>)}</div></td></tr>}
                </Fragment>;
              })}
            </tbody></table></div>
            <div className="space-y-3 p-3 md:hidden">{visibleRecords.map((record) => { const sessions = record.sessions || []; const expanded = expandedRows.has(record._id); return <div key={record._id} className="rounded-xl border border-zinc-200 p-4 transition-shadow hover:shadow-sm"><button type="button" className="flex w-full items-center justify-between text-left" onClick={() => sessions.length > 1 && toggleExpand(record._id)}><span className="font-medium text-zinc-900">{record.employee?.name || '—'}<span className="ml-2 text-xs text-zinc-400">{sessions.length > 1 ? `${sessions.length} sessions` : safeFormat(record.date, 'dd MMM')}</span></span><Badge variant={STATUS_BADGE[record.status] || 'default'}>{record.status?.replace('_', ' ') || '—'}</Badge></button><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><span className="text-zinc-500">In: <strong className="font-medium text-zinc-800">{safeFormat(getFirstClockIn(record), 'hh:mm a')}</strong></span><span className="text-zinc-500">Out: <strong className="font-medium text-zinc-800">{safeFormat(getLastClockOut(record), 'hh:mm a')}</strong></span><span className="text-zinc-500">Worked: <strong className="font-medium text-zinc-800">{formatHours(getRecordWorkHours(record))}</strong></span><span className="text-zinc-500">Break: <strong className="font-medium text-zinc-800">{getTotalBreakMinutes(record) > 0 ? formatMinutes(getTotalBreakMinutes(record)) : '—'}</strong></span></div>{expanded && <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">{sessions.map((session, index) => <div key={index} className="flex flex-wrap gap-3 text-xs text-zinc-600"><span>#{index + 1}</span><span>In {safeFormat(session.clockIn?.time, 'hh:mm a')}</span><span>Out {session.clockOut?.time ? safeFormat(session.clockOut.time, 'hh:mm a') : 'In Progress'}</span><span>{formatMinutes(getSessionWorkMinutes(session))}</span></div>)}</div>}</div>; })}</div>
          </>
        )}
      </section>
    </div>
  );
}
