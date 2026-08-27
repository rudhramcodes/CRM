import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../app/store/uiSlice';
import { useGetVentureDashboardQuery } from '../services/dashboardApi';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import ProgressRing from '../components/ui/ProgressRing';
import {
  ArrowLeft, Users, UserCheck, IndianRupee, TrendingUp,
  Loader2, AlertCircle, Building2, Mail, Phone, ExternalLink,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BRANDS } from '../constants';

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const BRAND_LABELS = BRANDS.reduce((acc, b) => ({ ...acc, [b.value]: b.label }), {});

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
          <span className="text-zinc-600">{item.name}:</span>
          <span className="font-semibold text-zinc-900">{formatter ? formatter(item.value) : item.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-zinc-200 p-5 shadow-sm ${className}`}>
      <h4 className="text-sm font-semibold text-zinc-700 mb-4">{title}</h4>
      {children}
    </div>
  );
}

export default function VentureDashboard() {
  const { brand } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data, isLoading, isError } = useGetVentureDashboardQuery(brand);

  useEffect(() => {
    const label = BRAND_LABELS[brand] || brand;
    dispatch(setPageTitle(`${label} Dashboard`));
  }, [dispatch, brand]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-900 animate-spin" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertCircle className="w-12 h-12 text-zinc-300 mb-3" />
        <p className="text-zinc-500 font-medium">Failed to load venture data</p>
        <button onClick={() => navigate('/dashboard')} className="mt-3 text-sm text-indigo-600 hover:underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const d = data.data;
  const { kpis, pipeline, revenue, clients, invoices, tasks, comparison } = d;
  const brandLabel = BRAND_LABELS[brand] || brand;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-primary-900">{brandLabel}</h2>
            </div>
            <p className="text-zinc-500 text-sm mt-0.5">Venture dashboard &mdash; all metrics filtered for {brandLabel}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
          </div>
          <p className="font-heading text-2xl font-semibold text-primary-900">
            <AnimatedCounter value={kpis.totalLeads} />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Active Clients</span>
            <UserCheck className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
          </div>
          <p className="font-heading text-2xl font-semibold text-primary-900">
            <AnimatedCounter value={kpis.activeClients} />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Revenue</span>
            <IndianRupee className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
          </div>
          <p className="font-heading text-2xl font-semibold text-emerald-600">
            <AnimatedCounter value={kpis.totalRevenue} prefix="₹" />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Outstanding</span>
            <IndianRupee className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
          </div>
          <p className="font-heading text-2xl font-semibold text-amber-600">
            <AnimatedCounter value={kpis.totalOutstanding} prefix="₹" />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Won Leads</span>
            <TrendingUp className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
          </div>
          <p className="font-heading text-2xl font-semibold text-indigo-600">
            <AnimatedCounter value={kpis.wonLeads} />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Conversion</span>
            <TrendingUp className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
          </div>
          <p className="font-heading text-2xl font-semibold text-primary-900">
            <AnimatedCounter value={kpis.conversionRate} suffix="%" />
          </p>
        </div>
      </div>

      {/* Charts Row 1: Revenue + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={`${brandLabel} — Revenue Trend`}>
          {revenue.monthly?.some((m) => m.collected > 0 || m.invoiced > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenue.monthly}>
                <defs>
                  <linearGradient id="vcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip formatter={fmt} />} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#6366f1" fill="url(#vcGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="outstanding" name="Outstanding" stroke="#f59e0b" fill="transparent" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-400 text-sm">No revenue data for {brandLabel}</div>
          )}
        </ChartCard>

        <ChartCard title={`${brandLabel} — Lead Pipeline`}>
          {pipeline.byStatus?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipeline.byStatus} layout="vertical" barSize={16}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} width={110} tickFormatter={(v) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                  {pipeline.byStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-400 text-sm">No leads for {brandLabel}</div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2: Lead Sources + Task Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title={`${brandLabel} — Lead Sources`}>
          {pipeline.bySource?.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pipeline.bySource} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {pipeline.bySource.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v} leads`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {pipeline.bySource.map((d, i) => (
                  <div key={d.source} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-zinc-500 capitalize">{d.source?.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-zinc-700">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-zinc-400 text-sm">No source data</div>
          )}
        </ChartCard>

        <ChartCard title={`${brandLabel} — Task Completion`}>
          <div className="flex flex-col items-center py-4">
            <ProgressRing value={tasks.done} max={tasks.total || 1} size={100} strokeWidth={8} color="#6366f1" label={`${tasks.done} of ${tasks.total}`} sublabel="tasks completed" />
            {tasks.byStatus?.length > 0 && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
                {tasks.byStatus.map((t) => (
                  <div key={t.status} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${
                      t.status === 'done' ? 'bg-emerald-500' :
                      t.status === 'in_progress' ? 'bg-blue-500' :
                      t.status === 'review' ? 'bg-amber-500' : 'bg-zinc-400'
                    }`} />
                    <span className="text-zinc-500 capitalize">{t.status.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-zinc-700 ml-auto">{t.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ChartCard>

        {/* Comparison vs Other Ventures */}
        <ChartCard title="Venture Comparison">
          {comparison?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={comparison} barSize={20}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="brand" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717a' }} tickFormatter={(v) => (BRAND_LABELS[v] || v).slice(0, 8)} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="leads" name="Total Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="won" name="Won" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-zinc-400 text-sm">No comparison data</div>
          )}
        </ChartCard>
      </div>

      {/* Top Clients Table */}
      {clients.topClients?.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h4 className="text-sm font-semibold text-zinc-700">Top Clients — {brandLabel}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Client ID</th>
                  <th className="text-left py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Company</th>
                  <th className="text-left py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Contact</th>
                  <th className="text-left py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Email</th>
                  <th className="text-left py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.topClients.map((c, i) => (
                  <tr key={c._id} className={`border-b border-zinc-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}`}>
                    <td className="py-2.5 px-5 font-mono text-xs text-zinc-600">{c.clientId || '—'}</td>
                    <td className="py-2.5 px-5 font-medium text-zinc-800">{c.companyName}</td>
                    <td className="py-2.5 px-5 text-zinc-600">{c.contactPerson}</td>
                    <td className="py-2.5 px-5 text-zinc-600 text-xs">{c.email}</td>
                    <td className="py-2.5 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
