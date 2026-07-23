import { Users, UserCheck, UserX, Building2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../../components/ui/chart';
import ReportSummaryCard from './ReportSummaryCard';

const PIE_COLORS = ['var(--chart-2)', 'var(--chart-6)'];
const BAR_COLOR = 'var(--chart-5)';
const chartConfig = { count: { label: 'New Clients', color: 'var(--chart-5)' } };

export default function ClientReport({ data }) {
  const { charts, summary } = data || {};
  const { byStatus = [], byBrand = [], monthly: monthlyNew = [] } = charts || {};
  const totalClients = byStatus.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ReportSummaryCard label="Total Clients" value={summary?.total ?? totalClients} color="text-indigo-600" icon={Users} subtitle="All registered clients" />
        <ReportSummaryCard label="Active" value={summary?.active ?? byStatus.find(d => d.status === 'active')?.count ?? 0} color="text-green-600" icon={UserCheck} subtitle="Currently active" />
        <ReportSummaryCard label="Inactive" value={byStatus.find(d => d.status === 'inactive')?.count ?? 0} color="text-zinc-500" icon={UserX} subtitle="Inactive accounts" />
        <ReportSummaryCard label="Converted" value={summary?.converted ?? 0} color="text-blue-600" icon={TrendingUp} subtitle="From leads" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active/Inactive Donut */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-zinc-700 mb-4">Client Status</h4>
          {byStatus.length > 0 ? (
            <div className="flex flex-col items-center">
              <ChartContainer config={{}} className="w-full h-[240px]">
                <PieChart>
                  <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4}>
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent formatter={(value, name, item) => {
                    const total = byStatus.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                    return (
                      <div className="flex items-center justify-between gap-6 w-full">
                        <span className="text-zinc-600 capitalize">{name}</span>
                        <div className="text-right">
                          <div className="font-semibold text-zinc-900">{value}</div>
                          <div className="text-xs text-zinc-400">{pct}%</div>
                        </div>
                      </div>
                    );
                  }} />} />
                </PieChart>
              </ChartContainer>
              <div className="flex justify-center gap-6 mt-2">
                {byStatus.map((d, i) => {
                  const pct = totalClients > 0 ? ((d.count / totalClients) * 100).toFixed(0) : 0;
                  return (
                    <div key={d.status} className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: `var(${PIE_COLORS[i % PIE_COLORS.length]})` }} />
                        <span className={`font-semibold capitalize ${d.status === 'active' ? 'text-green-600' : 'text-zinc-500'}`}>{d.status}</span>
                      </div>
                      <span className="text-lg font-bold text-zinc-800 mt-0.5">{d.count}</span>
                      <span className="text-xs text-zinc-400">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No client data</p>
              <p className="text-xs text-zinc-300 mt-1">Clients will appear once created</p>
            </div>
          )}
        </div>

        {/* Monthly New Clients */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-zinc-700 mb-4">New Clients (Monthly)</h4>
          {monthlyNew.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-[260px]">
              <BarChart data={monthlyNew}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item, index, payload) => (
                        <div className="flex items-center justify-between gap-6 w-full">
                          <span className="text-zinc-600">{name === 'count' ? 'New Clients' : name}</span>
                          <span className="font-semibold text-zinc-900">{value}</span>
                        </div>
                      )}
                      labelFormatter={(label) => (
                        <div className="text-xs text-zinc-400 mb-1 border-b border-zinc-100 pb-1">{label}</div>
                      )}
                    />
                  }
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={36} label={{ position: 'top', fontSize: 10, fill: '#52525b', fontWeight: 600 }} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TrendingUp className="w-10 h-10 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No new clients this period</p>
              <p className="text-xs text-zinc-300 mt-1">Try a different date range</p>
            </div>
          )}
        </div>
      </div>

      {/* Brand Breakdown Table */}
      {byBrand.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-700">Brand Breakdown</h4>
            <span className="text-xs text-zinc-400">{byBrand.reduce((s, d) => s + d.count, 0)} clients</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Brand</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Clients</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">%</th>
                </tr>
              </thead>
              <tbody>
                {byBrand.map((r, i) => {
                  const total = byBrand.reduce((s, d) => s + d.count, 0);
                  return (
                    <tr key={r.brand || r.name} className={`border-b border-zinc-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}`}>
                      <td className="py-2.5 px-5 font-medium text-zinc-800">{r.brand || r.name || 'Unbranded'}</td>
                      <td className="py-2.5 px-5 text-right font-semibold text-zinc-700">{r.count}</td>
                      <td className="py-2.5 px-5 text-right text-zinc-500">{total > 0 ? ((r.count / total) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when only summary exists but no brand data */}
      {byBrand.length === 0 && totalClients > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
          <Building2 className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">No brand data for this period</p>
        </div>
      )}
    </div>
  );
}
