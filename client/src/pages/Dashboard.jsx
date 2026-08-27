import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../app/store/uiSlice';
import { useGetDashboardOverviewQuery } from '../services/dashboardApi';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import ProgressRing from '../components/ui/ProgressRing';
import {
  Users, UserCheck, FolderKanban, IndianRupee, Clock, AlertCircle,
  TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Activity,
  Calendar, CreditCard, Building2, ArrowRight, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BRANDS } from '../constants';

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const BRAND_LABELS = BRANDS.reduce((acc, b) => ({ ...acc, [b.value]: b.label }), {});

const ACTIVITY_ICONS = {
  lead: Users,
  client: UserCheck,
  payment: CreditCard,
  meeting: Calendar,
};

const ACTIVITY_COLORS = {
  lead: 'bg-blue-100 text-blue-600',
  client: 'bg-emerald-100 text-emerald-600',
  payment: 'bg-amber-100 text-amber-600',
  meeting: 'bg-purple-100 text-purple-600',
};

function StatCard({ label, value, icon: Icon, prefix = '', suffix = '', decimals = 0, trend, color = 'text-primary-900', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all duration-200 text-left group w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors">
          <Icon className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className={`font-heading text-2xl font-semibold ${color}`}>
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </p>
        {trend !== undefined && (
          <span className={`flex items-center text-xs font-medium mb-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </button>
  );
}

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

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { data, isLoading, isError } = useGetDashboardOverviewQuery();

  useEffect(() => {
    dispatch(setPageTitle('Dashboard'));
  }, [dispatch]);

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
        <p className="text-zinc-500 font-medium">Failed to load dashboard</p>
        <p className="text-sm text-zinc-400 mt-1">Check your connection and try again</p>
      </div>
    );
  }

  const d = data.data;
  const { kpis, revenue, pipeline, clients, invoices, tasks, recentActivity } = d;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-primary-900">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          View Reports
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Leads" value={kpis.totalLeads} icon={Users} />
        <StatCard label="Active Clients" value={kpis.activeClients} icon={UserCheck} />
        <StatCard label="Revenue" value={kpis.totalRevenue} icon={IndianRupee} prefix="₹" color="text-emerald-600" />
        <StatCard label="Pending Payments" value={kpis.pendingPayments} icon={Clock} color="text-amber-600" />
        <StatCard label="Overdue" value={kpis.overdueInvoices} icon={AlertCircle} color="text-red-500" />
        <StatCard label="Conversion" value={kpis.conversionRate} icon={TrendingUp} suffix="%" color="text-indigo-600" />
      </div>

      {/* Ventures Quick Access */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-zinc-700">Ventures</h4>
          <span className="text-xs text-zinc-400">{BRANDS.length} brands</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {BRANDS.map((brand) => {
            const brandClients = clients.byBrand?.find((b) => b.brand === brand.value)?.count || 0;
            const brandLeads = pipeline.byStatus?.reduce((sum) => sum, 0) || 0;
            return (
              <button
                key={brand.value}
                onClick={() => navigate(`/dashboard/venture/${brand.value}`)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-zinc-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-[11px] font-medium text-zinc-700 text-center leading-tight">{brand.label}</span>
                <span className="text-[10px] text-zinc-400">{brandClients} clients</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts Row 1: Revenue Trend + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend — 2 cols */}
        <ChartCard title="Revenue Trend" className="lg:col-span-2">
          {revenue.monthly?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenue.monthly}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip formatter={fmt} />} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#6366f1" fill="url(#colorCollected)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="outstanding" name="Outstanding" stroke="#f59e0b" fill="url(#colorOutstanding)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-400 text-sm">No revenue data</div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
              <span className="text-zinc-500">Collected: {fmt(kpis.totalRevenue)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span className="text-zinc-500">Outstanding: {fmt(revenue.summary?.totalOutstanding)}</span>
            </div>
          </div>
        </ChartCard>

        {/* Pipeline — 1 col */}
        <ChartCard title="Lead Pipeline">
          {pipeline.byStatus?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipeline.byStatus} layout="vertical" barSize={16}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} width={100} tickFormatter={(v) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                  {pipeline.byStatus.map((entry, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-400 text-sm">No pipeline data</div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2: Client Distribution + Invoice Aging + Task Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Distribution by Brand — Donut */}
        <ChartCard title="Clients by Venture">
          {clients.byBrand?.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={clients.byBrand} dataKey="count" nameKey="brand" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {clients.byBrand.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v} clients`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {clients.byBrand.map((d, i) => (
                  <div key={d.brand} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-zinc-500">{BRAND_LABELS[d.brand] || d.brand}</span>
                    <span className="font-semibold text-zinc-700">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-zinc-400 text-sm">No clients yet</div>
          )}
        </ChartCard>

        {/* Invoice Aging */}
        <ChartCard title="Invoice Aging">
          {invoices.aging?.some((a) => a.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={invoices.aging} barSize={28}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip content={<CustomTooltip formatter={fmt} />} />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                  {invoices.aging.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px]">
              <IndianRupee className="w-10 h-10 text-emerald-200 mb-2" />
              <p className="text-sm text-zinc-400">All invoices paid</p>
            </div>
          )}
        </ChartCard>

        {/* Task Completion */}
        <ChartCard title="Task Completion">
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
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-primary-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            Recent Activity
          </h3>
          <span className="text-xs text-zinc-400">Last 10 events</span>
        </div>
        {recentActivity?.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {recentActivity.map((item, i) => {
              const Icon = ACTIVITY_ICONS[item.type] || Activity;
              const colorClass = ACTIVITY_COLORS[item.type] || 'bg-zinc-100 text-zinc-600';
              return (
                <div key={i} className="flex items-start gap-3 px-6 py-3.5 hover:bg-zinc-50/50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{item.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-zinc-400">{new Date(item.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                    {item.user && <p className="text-[10px] text-zinc-400">{item.user}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-zinc-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-zinc-500">No recent activity</p>
            <p className="text-xs text-zinc-400 mt-1">Activity will appear once you start using Rudhram.</p>
          </div>
        )}
      </div>
    </div>
  );
}
