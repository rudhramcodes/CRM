import { IndianRupee, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../../../components/ui/chart';
import ReportSummaryCard from './ReportSummaryCard';
import { fmt } from './chartTheme';

const chartConfig = {
  collected: { label: 'Collected', color: 'var(--chart-1)' },
  outstanding: { label: 'Outstanding', color: 'var(--chart-4)' },
};

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-7)'];

function TooltipRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: `var(${color})` }} />
        <span className="text-zinc-600">{label}</span>
      </div>
      <span className="font-semibold text-zinc-900">{fmt(value)}</span>
    </div>
  );
}

export default function RevenueReport({ data }) {
  const { summary, charts } = data || {};
  const { monthlyRevenue = [], byMethod = [] } = charts || {};

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ReportSummaryCard label="Total Revenue" value={fmt(summary?.totalRevenue)} color="text-green-600" icon={IndianRupee} subtitle={`${summary?.collectionRate || 0}% collection rate`} />
        <ReportSummaryCard label="Outstanding" value={fmt(summary?.totalOutstanding)} color="text-orange-600" icon={Wallet} subtitle="Pending payments" />
        <ReportSummaryCard label="Total Invoiced" value={fmt(summary?.totalInvoiced)} color="text-blue-600" icon={TrendingUp} subtitle="Gross invoice value" />
        <ReportSummaryCard label="Collection Rate" value={`${summary?.collectionRate || 0}%`} color="text-indigo-600" icon={PiggyBank} subtitle="Paid / Total invoiced" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-zinc-700">Monthly Revenue</h4>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--chart-1)' }} />
                <span className="text-zinc-500">Collected</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--chart-4)' }} />
                <span className="text-zinc-500">Outstanding</span>
              </div>
            </div>
          </div>
          {monthlyRevenue.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-[300px]">
              <BarChart data={monthlyRevenue} barGap={2}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item, index, payload) => (
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="text-zinc-600">{name}</span>
                          <span className="font-semibold text-zinc-900">{fmt(value)}</span>
                        </div>
                      )}
                      labelFormatter={(label) => (
                        <div className="text-xs text-zinc-400 mb-1 border-b border-zinc-100 pb-1">{label}</div>
                      )}
                    />
                  }
                />
                <Bar dataKey="collected" fill="var(--color-collected)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="outstanding" fill="var(--color-outstanding)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <IndianRupee className="w-10 h-10 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No revenue data for this period</p>
              <p className="text-xs text-zinc-300 mt-1">Try selecting a wider date range</p>
            </div>
          )}
        </div>

        {/* Payment Method Pie Chart */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-zinc-700 mb-4">By Payment Method</h4>
          {byMethod.length > 0 ? (
            <div className="flex flex-col items-center">
              <ChartContainer config={{}} className="w-full h-[250px]">
                <PieChart>
                  <Pie data={byMethod} dataKey="amount" nameKey="method" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {byMethod.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent formatter={(value, name, item) => {
                    const total = byMethod.reduce((s, x) => s + x.amount, 0);
                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                    return (
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span className="text-zinc-600 capitalize">{name.replace(/_/g, ' ')}</span>
                        <div className="text-right">
                          <div className="font-semibold text-zinc-900">{fmt(value)}</div>
                          <div className="text-xs text-zinc-400">{pct}%</div>
                        </div>
                      </div>
                    );
                  }} />} />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-1">
                {byMethod.map((d, i) => {
                  const total = byMethod.reduce((s, x) => s + x.amount, 0);
                  const pct = total > 0 ? ((d.amount / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={d.method} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: `var(${PIE_COLORS[i % PIE_COLORS.length]})` }} />
                      <span className="text-zinc-500 capitalize">{d.method.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-zinc-800">{fmt(d.amount)}</span>
                      <span className="text-zinc-400">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wallet className="w-10 h-10 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No payments recorded yet</p>
              <p className="text-xs text-zinc-300 mt-1">Payments will appear here once recorded</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      {monthlyRevenue.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-700">Monthly Breakdown</h4>
            <span className="text-xs text-zinc-400">{monthlyRevenue.length} months</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Month</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Invoiced</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Collected</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Outstanding</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Invoices</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRevenue.map((r, i) => {
                  const collectedPct = r.invoiced > 0 ? ((r.collected / r.invoiced) * 100).toFixed(0) : 0;
                  return (
                    <tr key={r.month} className={`border-b border-zinc-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}`}>
                      <td className="py-2.5 px-5 font-medium text-zinc-800">{r.month}</td>
                      <td className="py-2.5 px-5 text-right text-blue-600 font-medium">{fmt(r.invoiced)}</td>
                      <td className="py-2.5 px-5 text-right text-green-600 font-medium">{fmt(r.collected)}</td>
                      <td className="py-2.5 px-5 text-right text-orange-600 font-medium">{fmt(r.outstanding)}</td>
                      <td className="py-2.5 px-5 text-right text-zinc-600">{r.count}</td>
                      <td className="py-2.5 px-5 text-right">
                        <span className={`font-medium ${collectedPct >= 80 ? 'text-green-600' : collectedPct >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                          {collectedPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
