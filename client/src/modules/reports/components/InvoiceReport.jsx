import { FileText, Clock, CheckCircle, AlertTriangle, IndianRupee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../../components/ui/chart';
import ReportSummaryCard from './ReportSummaryCard';
import { STATUS_LABELS, fmt } from './chartTheme';

const STATUS_CHART_COLORS = {
  draft: 'var(--chart-6)',
  sent: 'var(--chart-1)',
  partially_paid: 'var(--chart-5)',
  paid: 'var(--chart-2)',
  overdue: 'var(--chart-3)',
  cancelled: 'var(--chart-6)',
};

const AGING_COLORS = ['var(--chart-2)', 'var(--chart-4)', 'var(--chart-3)', 'var(--chart-7)'];
const chartConfig = { count: { label: 'Invoices', color: 'var(--chart-1)' } };

const statusDisplayOrder = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];

export default function InvoiceReport({ data }) {
  const { charts, summary } = data || {};
  const { byStatus = [], aging: agingBuckets = [], monthly: monthlyTrends = [] } = charts || {};

  const sortedStatus = [...byStatus].sort(
    (a, b) => statusDisplayOrder.indexOf(a.status) - statusDisplayOrder.indexOf(b.status)
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ReportSummaryCard label="Total Invoices" value={summary?.totalInvoices ?? byStatus.reduce((s, d) => s + d.count, 0)} color="text-indigo-600" icon={FileText} subtitle={summary?.avgValue ? `Avg ₹${summary.avgValue.toLocaleString('en-IN')}` : ''} />
        <ReportSummaryCard label="Paid" value={summary?.paidInvoices ?? byStatus.find(d => d.status === 'paid')?.count ?? 0} color="text-green-600" icon={CheckCircle} subtitle="Fully paid" />
        <ReportSummaryCard label="Overdue" value={summary?.overdueCount ?? byStatus.find(d => d.status === 'overdue')?.count ?? 0} color="text-red-600" icon={AlertTriangle} subtitle="Past due date" />
        <ReportSummaryCard label="Pending" value={byStatus.filter(d => d.status === 'sent' || d.status === 'partially_paid').reduce((s, d) => s + d.count, 0)} color="text-orange-600" icon={Clock} subtitle="Awaiting payment" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Donut */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-zinc-700 mb-4">Invoice Status</h4>
          {sortedStatus.length > 0 ? (
            <div className="flex flex-col items-center">
              <ChartContainer config={{}} className="w-full h-[250px]">
                <PieChart>
                  <Pie data={sortedStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {sortedStatus.map((d) => (
                      <Cell key={d.status} fill={STATUS_CHART_COLORS[d.status] || 'var(--chart-6)'} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => {
                          const total = sortedStatus.reduce((s, d) => s + d.count, 0);
                          const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                          return (
                            <div className="flex items-center justify-between gap-6 w-full">
                              <span className="text-zinc-600">{STATUS_LABELS[item.payload.status] || item.payload.status}</span>
                              <div className="text-right">
                                <div className="font-semibold text-zinc-900">{value}</div>
                                <div className="text-xs text-zinc-400">{pct}%</div>
                              </div>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-1">
                {sortedStatus.map(d => {
                  const total = sortedStatus.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? ((d.count / total) * 100).toFixed(0) : 0;
                  return (
                    <div key={d.status} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_CHART_COLORS[d.status] || 'var(--chart-6)' }} />
                      <span className="text-zinc-500">{STATUS_LABELS[d.status] || d.status}</span>
                      <span className="font-medium text-zinc-800">{d.count}</span>
                      <span className="text-zinc-400">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-10 h-10 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No invoices for this period</p>
              <p className="text-xs text-zinc-300 mt-1">Invoices will appear once created</p>
            </div>
          )}
        </div>

        {/* Aging Buckets */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-zinc-700 mb-4">Aging Buckets (Unpaid)</h4>
          {agingBuckets.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-[260px]">
              <BarChart data={agingBuckets} layout="vertical" barCategoryGap="28%" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#52525b' }} width={80} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => (
                        <div className="space-y-1">
                          <div className="text-xs text-zinc-400 mb-1 border-b border-zinc-100 pb-1">{item.payload.label}</div>
                          <div className="flex items-center justify-between gap-6 w-full">
                            <span className="text-zinc-600">Invoices</span>
                            <span className="font-semibold text-zinc-900">{value}</span>
                          </div>
                          <div className="flex items-center justify-between gap-6 w-full">
                            <span className="text-zinc-600">Amount</span>
                            <span className="font-semibold text-zinc-900">{fmt(item.payload.amount || 0)}</span>
                          </div>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {agingBuckets.map((_, i) => (
                    <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-10 h-10 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No overdue invoices</p>
              <p className="text-xs text-zinc-300 mt-1">All invoices are paid on time</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends Table */}
      {monthlyTrends.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-700">Monthly Trends</h4>
            <span className="text-xs text-zinc-400">{monthlyTrends.length} months</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Month</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Issued</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Total Value</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Collected</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((r, i) => {
                  const collectionPct = r.total > 0 ? ((r.paid / r.total) * 100).toFixed(0) : 0;
                  return (
                    <tr key={r.month} className={`border-b border-zinc-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}`}>
                      <td className="py-2.5 px-5 font-medium text-zinc-800">{r.month}</td>
                      <td className="py-2.5 px-5 text-right font-medium text-zinc-700">{r.count}</td>
                      <td className="py-2.5 px-5 text-right text-blue-600 font-medium">{fmt(r.total)}</td>
                      <td className="py-2.5 px-5 text-right text-green-600 font-medium">{fmt(r.paid)}</td>
                      <td className="py-2.5 px-5 text-right">
                        <span className={`font-medium ${collectionPct >= 80 ? 'text-green-600' : collectionPct >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                          {collectionPct}%
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
