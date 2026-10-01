import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../app/store/uiSlice';
import { useGetDashboardOverviewQuery } from '../services/dashboardApi';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import ProgressRing from '../components/ui/ProgressRing';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import EmployeeDashboard from './EmployeeDashboard';
import {
  Users, UserCheck, FolderKanban, IndianRupee, Clock, AlertCircle,
  TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Activity,
  Calendar, CreditCard, Building2, ArrowRight, BarChart3, Plus,
  Sparkles, Layers,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BRANDS, BRAND_METAS } from '../constants';
import { cn } from '../utils/cn';

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CHART_COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

const ACTIVITY_ICONS = {
  lead: Users,
  client: UserCheck,
  payment: CreditCard,
  meeting: Calendar,
};

const ACTIVITY_COLORS = {
  lead: 'bg-blue-50 text-blue-600 border-blue-100',
  client: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  payment: 'bg-amber-50 text-amber-600 border-amber-100',
  meeting: 'bg-purple-50 text-purple-600 border-purple-100',
};

function StatCard({ label, value, icon: Icon, prefix = '', suffix = '', decimals = 0, trend, iconStyle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-2xl border border-zinc-200/80 p-4.5 sm:p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.08)] hover:border-zinc-300 hover:-translate-y-0.5 transition-all duration-200 text-left group w-full cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 border', iconStyle)}>
          <Icon className="w-4 h-4" strokeWidth={1.8} />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-primary-900">
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </p>
        {trend !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
              trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
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
    <div className="bg-white/95 backdrop-blur-md border border-zinc-200/90 rounded-2xl shadow-[0_16px_35px_-10px_rgba(0,0,0,0.2)] px-4 py-3 min-w-[160px]">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
              <span className="text-zinc-600 font-medium">{item.name}</span>
            </div>
            <span className="font-bold text-primary-900 font-mono">
              {formatter ? formatter(item.value) : item.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col', className)}>
      <div className="flex items-start justify-between mb-4 shrink-0">
        <div>
          <h4 className="font-heading text-base font-bold text-primary-900 tracking-tight">{title}</h4>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const isEmployee = user?.role === 'employee';
  const { data, isLoading, isError } = useGetDashboardOverviewQuery(undefined, { skip: isEmployee });

  useEffect(() => {
    dispatch(setPageTitle('Dashboard'));
  }, [dispatch]);

  if (isEmployee) {
    return <EmployeeDashboard />;
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-sm mx-auto p-6 bg-white rounded-2xl border border-zinc-200/80 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="font-heading text-base font-bold text-primary-900">Failed to load dashboard metrics</p>
        <p className="text-xs text-zinc-500 mt-1 mb-4">There was a problem communicating with the analytics service.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-900 text-white rounded-xl text-xs font-semibold hover:bg-primary-800 transition-colors cursor-pointer"
        >
          Try Reloading
        </button>
      </div>
    );
  }

  const d = data.data;
  const { kpis, revenue, pipeline, clients, invoices, tasks, recentActivity } = d;

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary-900 tracking-tight mb-1">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm">
            {todayStr} • Here&apos;s what&apos;s happening across your pipeline and ventures.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/leads/new')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-primary-900 rounded-xl hover:bg-primary-800 transition-all shadow-[0_4px_12px_-2px_rgba(11,11,11,0.2)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/80 rounded-xl transition-colors cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-zinc-500" />
            View Reports
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          label="Total Leads"
          value={kpis.totalLeads}
          icon={Users}
          iconStyle="bg-blue-50 text-blue-600 border-blue-200/60"
          onClick={() => navigate('/leads')}
        />
        <StatCard
          label="Active Clients"
          value={kpis.activeClients}
          icon={UserCheck}
          iconStyle="bg-emerald-50 text-emerald-600 border-emerald-200/60"
          onClick={() => navigate('/clients')}
        />
        <StatCard
          label="Revenue"
          value={kpis.totalRevenue}
          icon={IndianRupee}
          prefix="₹"
          iconStyle="bg-zinc-900 text-white border-zinc-800 shadow-2xs"
          onClick={() => navigate('/payments')}
        />
        <StatCard
          label="Pending Payments"
          value={kpis.pendingPayments}
          icon={Clock}
          iconStyle="bg-amber-50 text-amber-600 border-amber-200/60"
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          label="Overdue"
          value={kpis.overdueInvoices}
          icon={AlertCircle}
          iconStyle="bg-rose-50 text-rose-600 border-rose-200/60"
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          label="Conversion"
          value={kpis.conversionRate}
          icon={TrendingUp}
          suffix="%"
          decimals={1}
          iconStyle="bg-purple-50 text-purple-600 border-purple-200/60"
          onClick={() => navigate('/leads')}
        />
      </div>

      {/* Ventures Ecosystem Grid */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-500" />
            <h4 className="font-heading text-base font-bold text-primary-900 tracking-tight">
              Ventures & Brands
            </h4>
            <span className="text-[11px] font-semibold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full border border-zinc-200/70">
              {BRANDS.length} Active
            </span>
          </div>
          <span className="text-xs text-zinc-400 hidden sm:inline">Select a brand to view dedicated metrics</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {BRANDS.map((brand) => {
            const brandClients = clients.byBrand?.find((b) => b.brand === brand.value)?.count || 0;
            const meta = BRAND_METAS[brand.value] || { label: brand.label, gradient: 'from-zinc-600 to-zinc-800', initial: brand.label?.[0] || 'V' };

            return (
              <button
                key={brand.value}
                onClick={() => navigate(`/dashboard/venture/${brand.value}`)}
                className="flex flex-col items-center gap-2 p-3 sm:p-3.5 rounded-2xl border border-zinc-100/90 hover:border-zinc-300 hover:bg-zinc-50/70 hover:shadow-xs transition-all duration-150 group cursor-pointer text-center"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:scale-105 select-none p-1 border border-zinc-200/70 bg-white shadow-2xs group-hover:shadow-sm">
                  {meta.logo ? (
                    <img
                      src={meta.logo}
                      alt={meta.label}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <div className={cn(
                      'w-full h-full rounded-xl bg-gradient-to-br text-white flex items-center justify-center font-heading font-bold text-sm shadow-2xs',
                      meta.gradient,
                    )}>
                      {meta.initial}
                    </div>
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <span className="text-xs font-semibold text-zinc-800 truncate block leading-snug">
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
                    {brandClients} client{brandClients !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts Row 1: Revenue Trend + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend — 2 cols */}
        <ChartCard
          title="Revenue Trend"
          subtitle="Monthly cash collection vs outstanding balances"
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
                <span className="text-zinc-600 font-medium">Collected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-zinc-600 font-medium">Outstanding</span>
              </div>
            </div>
          }
        >
          {revenue.monthly?.length > 0 ? (
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.monthly}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f1f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip formatter={fmt} />} />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#0f172a" fill="url(#colorCollected)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="outstanding" name="Outstanding" stroke="#f59e0b" fill="url(#colorOutstanding)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-400 text-sm">No revenue data available</div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs text-zinc-500 font-mono mt-2">
            <span>Total Collected: <strong className="text-zinc-900">{fmt(kpis.totalRevenue)}</strong></span>
            <span>Total Outstanding: <strong className="text-zinc-900">{fmt(revenue.summary?.totalOutstanding)}</strong></span>
          </div>
        </ChartCard>

        {/* Pipeline — 1 col */}
        <ChartCard
          title="Lead Pipeline"
          subtitle="Deals distribution across stages"
        >
          {pipeline.byStatus?.length > 0 ? (
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline.byStatus} layout="vertical" barSize={14}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f1f0" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} width={95} tickFormatter={(v) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]}>
                    {pipeline.byStatus.map((entry, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-400 text-sm">No pipeline data recorded</div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2: Client Distribution + Invoice Aging + Task Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Distribution by Brand — Donut */}
        <ChartCard
          title="Clients by Venture"
          subtitle="Portfolio share across brands"
        >
          {clients.byBrand?.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={clients.byBrand} dataKey="count" nameKey="brand" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={4}>
                      {clients.byBrand.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip formatter={(v) => `${v} clients`} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2">
                {clients.byBrand.map((d, i) => (
                  <div key={d.brand} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-zinc-500">{BRAND_METAS[d.brand]?.label || d.brand}</span>
                    <span className="font-bold text-zinc-800 font-mono">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-zinc-400 text-sm">No clients onboarded yet</div>
          )}
        </ChartCard>

        {/* Invoice Aging */}
        <ChartCard
          title="Invoice Aging"
          subtitle="Outstanding receivables aging brackets"
        >
          {invoices.aging?.some((a) => a.count > 0) ? (
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invoices.aging} barSize={26}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f1f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip formatter={fmt} />} />
                  <Bar dataKey="amount" name="Amount" radius={[6, 6, 0, 0]}>
                    {invoices.aging.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px]">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <IndianRupee className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-zinc-700">All Invoices Cleared</p>
              <p className="text-xs text-zinc-400 mt-0.5">No overdue balances pending</p>
            </div>
          )}
        </ChartCard>

        {/* Task Completion */}
        <ChartCard
          title="Task Completion"
          subtitle="Operational velocity"
        >
          <div className="flex flex-col items-center py-2">
            <ProgressRing
              value={tasks.done}
              max={tasks.total || 1}
              size={110}
              strokeWidth={8}
              color="#0f172a"
              label={`${tasks.done} of ${tasks.total}`}
              sublabel="tasks completed"
            />
            {tasks.byStatus?.length > 0 && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full px-4">
                {tasks.byStatus.map((t) => (
                  <div key={t.status} className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      t.status === 'done' ? 'bg-emerald-500' :
                      t.status === 'in_progress' ? 'bg-blue-500' :
                      t.status === 'review' ? 'bg-amber-500' : 'bg-zinc-400',
                    )} />
                    <span className="text-zinc-500 capitalize truncate">{t.status.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-zinc-800 ml-auto font-mono">{t.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/40">
          <h3 className="font-heading text-base font-bold text-primary-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-500" />
            Workspace Activity Log
          </h3>
          <span className="text-xs text-zinc-400 font-mono">Latest 10 actions</span>
        </div>
        {recentActivity?.length > 0 ? (
          <div className="divide-y divide-zinc-100/80">
            {recentActivity.map((item, i) => {
              const Icon = ACTIVITY_ICONS[item.type] || Activity;
              const colorClass = ACTIVITY_COLORS[item.type] || 'bg-zinc-100 text-zinc-600 border-zinc-200/60';
              return (
                <div key={i} className="flex items-start gap-3.5 px-6 py-3.5 hover:bg-zinc-50/70 transition-colors">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs mt-0.5', colorClass)}>
                    <Icon className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{item.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-mono text-zinc-500 font-medium">
                      {new Date(item.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                    {item.user && <p className="text-[10px] text-zinc-400 truncate max-w-[120px]">{item.user}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-zinc-100/80 rounded-2xl flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-zinc-400" strokeWidth={1.75} />
            </div>
            <p className="font-heading text-base font-bold text-primary-900">No recent workspace activity</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">Activity events will automatically register as your team creates leads, schedules meetings, and registers clients.</p>
          </div>
        )}
      </div>
    </div>
  );
}
