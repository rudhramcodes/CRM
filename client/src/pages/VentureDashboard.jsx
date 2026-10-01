import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../app/store/uiSlice';
import { useGetVentureDashboardQuery } from '../services/dashboardApi';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import ProgressRing from '../components/ui/ProgressRing';
import { VentureDashboardSkeleton } from '../components/ui/Skeleton';
import {
  ArrowLeft, Users, UserCheck, IndianRupee, TrendingUp,
  Loader2, AlertCircle, Building2, Layers, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BRANDS, BRAND_METAS } from '../constants';
import { cn } from '../utils/cn';

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const CHART_COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];
const BRAND_LABELS = BRANDS.reduce((acc, b) => ({ ...acc, [b.value]: b.label }), {});

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

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col', className)}>
      <div className="mb-4 shrink-0">
        <h4 className="font-heading text-base font-bold text-primary-900 tracking-tight">{title}</h4>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, prefix = '', suffix = '', iconStyle, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-zinc-200/80 p-4.5 sm:p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.08)] hover:border-zinc-300 hover:-translate-y-0.5 transition-all duration-200 text-left group w-full',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 border', iconStyle)}>
          <Icon className="w-4 h-4" strokeWidth={1.8} />
        </div>
      </div>
      <p className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-primary-900">
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
      </p>
    </div>
  );
}

export default function VentureDashboard() {
  const { brand } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data, isLoading, isError } = useGetVentureDashboardQuery(brand);

  const meta = BRAND_METAS[brand] || {
    label: BRAND_LABELS[brand] || brand,
    gradient: 'from-zinc-700 to-zinc-900',
    initial: brand?.[0]?.toUpperCase() || 'V',
  };

  useEffect(() => {
    const label = BRAND_LABELS[brand] || brand;
    dispatch(setPageTitle(`${label} Dashboard`));
  }, [dispatch, brand]);

  if (isLoading) {
    return <VentureDashboardSkeleton />;
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-sm mx-auto p-6 bg-white rounded-2xl border border-zinc-200/80 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="font-heading text-base font-bold text-primary-900">Failed to load venture data</p>
        <p className="text-xs text-zinc-500 mt-1 mb-4">Could not retrieve analytics for {meta.label}.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-primary-900 text-white rounded-xl text-xs font-semibold hover:bg-primary-800 transition-colors cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const d = data.data;
  const { kpis, pipeline, revenue, clients, tasks, comparison } = d;

  return (
    <div className="space-y-6">
      {/* Venture Header */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-xl border border-zinc-200/80 flex items-center justify-center hover:bg-zinc-100/80 text-zinc-600 hover:text-primary-900 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Back to Main Dashboard"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.8} />
            </button>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden p-1 border border-zinc-200/80 bg-white shadow-2xs shrink-0">
                {meta.logo ? (
                  <img
                    src={meta.logo}
                    alt={meta.label}
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className={cn('w-full h-full rounded-xl bg-gradient-to-br text-white flex items-center justify-center font-heading font-bold text-base', meta.gradient)}>
                    {meta.initial}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary-900 tracking-tight">
                    {meta.label}
                  </h2>
                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-primary-900 text-white px-2 py-0.5 rounded-md shadow-xs">
                    Venture
                  </span>
                </div>
                <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
                  Dedicated performance dashboard &amp; venture portfolio analytics.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono hidden md:inline">
              Switch Venture:
            </span>
          </div>
        </div>

        {/* Brand Switcher Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-zinc-100 scrollbar-hide">
          {BRANDS.map((b) => {
            const bMeta = BRAND_METAS[b.value] || { label: b.label };
            const isActive = b.value === brand;
            return (
              <button
                key={b.value}
                onClick={() => navigate(`/dashboard/venture/${b.value}`)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border',
                  isActive
                    ? 'bg-primary-900 text-white border-primary-900 shadow-sm'
                    : 'bg-zinc-50 hover:bg-zinc-100/90 text-zinc-600 border-zinc-200/80',
                )}
              >
                {bMeta.logo ? (
                  <img src={bMeta.logo} alt={bMeta.label} className="w-4 h-4 object-contain rounded-sm" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                )}
                <span>{bMeta.label}</span>
              </button>
            );
          })}
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
          prefix="₹"
          icon={IndianRupee}
          iconStyle="bg-zinc-900 text-white border-zinc-800 shadow-2xs"
          onClick={() => navigate('/payments')}
        />
        <StatCard
          label="Outstanding"
          value={kpis.totalOutstanding}
          prefix="₹"
          icon={IndianRupee}
          iconStyle="bg-amber-50 text-amber-600 border-amber-200/60"
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          label="Won Deals"
          value={kpis.wonLeads}
          icon={TrendingUp}
          iconStyle="bg-indigo-50 text-indigo-600 border-indigo-200/60"
          onClick={() => navigate('/leads')}
        />
        <StatCard
          label="Conversion"
          value={kpis.conversionRate}
          suffix="%"
          icon={TrendingUp}
          iconStyle="bg-purple-50 text-purple-600 border-purple-200/60"
          onClick={() => navigate('/leads')}
        />
      </div>

      {/* Charts Row 1: Revenue + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue Trend"
          subtitle={`Historical collection for ${meta.label}`}
        >
          {revenue.monthly?.some((m) => m.collected > 0 || m.invoiced > 0) ? (
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.monthly}>
                  <defs>
                    <linearGradient id="vcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f1f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip formatter={fmt} />} />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#0f172a" fill="url(#vcGrad)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="outstanding" name="Outstanding" stroke="#f59e0b" fill="transparent" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-400 text-sm">No revenue data for {meta.label}</div>
          )}
        </ChartCard>

        <ChartCard
          title="Lead Pipeline"
          subtitle={`Deal distribution for ${meta.label}`}
        >
          {pipeline.byStatus?.length > 0 ? (
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline.byStatus} layout="vertical" barSize={16}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f1f0" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} width={105} tickFormatter={(v) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]}>
                    {pipeline.byStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-zinc-400 text-sm">No leads for {meta.label}</div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2: Lead Sources + Task Completion + Venture Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Lead Sources"
          subtitle="Top marketing intake channels"
        >
          {pipeline.bySource?.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pipeline.bySource} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4}>
                      {pipeline.bySource.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip formatter={(v) => `${v} leads`} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                {pipeline.bySource.map((d, i) => (
                  <div key={d.source} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-zinc-500 capitalize">{d.source?.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-zinc-800 font-mono">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-zinc-400 text-sm">No lead sources tracked</div>
          )}
        </ChartCard>

        <ChartCard
          title="Task Velocity"
          subtitle="Milestones & deliverables progress"
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

        {/* Comparison vs Other Ventures */}
        <ChartCard
          title="Venture Benchmarking"
          subtitle="Leads vs won across all brands"
        >
          {comparison?.length > 0 ? (
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison} barSize={18}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f1f0" />
                  <XAxis dataKey="brand" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} tickFormatter={(v) => (BRAND_LABELS[v] || v).slice(0, 8)} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="leads" name="Total Leads" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="won" name="Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-zinc-400 text-sm">No comparison data available</div>
          )}
        </ChartCard>
      </div>

      {/* Top Clients Table */}
      {clients.topClients?.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/40">
            <h4 className="font-heading text-base font-bold text-primary-900 tracking-tight">
              Top Clients — {meta.label}
            </h4>
            <span className="text-xs text-zinc-400 font-mono">
              {clients.topClients.length} key account{clients.topClients.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left py-3 px-6 text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">Client ID</th>
                  <th className="text-left py-3 px-6 text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">Company</th>
                  <th className="text-left py-3 px-6 text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">Contact</th>
                  <th className="text-left py-3 px-6 text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">Email</th>
                  <th className="text-left py-3 px-6 text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {clients.topClients.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => navigate(`/clients/${c._id}`)}
                    className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-6 font-mono text-xs text-zinc-500 font-medium">{c.clientId || '—'}</td>
                    <td className="py-3 px-6 font-semibold text-zinc-800 group-hover:text-primary-900 transition-colors">{c.companyName}</td>
                    <td className="py-3 px-6 text-zinc-600">{c.contactPerson}</td>
                    <td className="py-3 px-6 text-zinc-500 text-xs font-mono">{c.email}</td>
                    <td className="py-3 px-6">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                        c.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200',
                      )}>
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
