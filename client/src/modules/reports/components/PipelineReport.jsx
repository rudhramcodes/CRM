import { GitBranch, Target, Zap, Users, Hourglass } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../../components/ui/chart';
import ReportSummaryCard from './ReportSummaryCard';
import { STATUS_LABELS, fmt } from './chartTheme';

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-7)', 'var(--chart-3)'];

const barConfig = { count: { label: 'Leads', color: 'var(--chart-1)' } };

const STATUS_BAR_COLORS = {
  new: 'var(--chart-1)',
  contacted: 'var(--chart-5)',
  meeting_scheduled: 'var(--chart-4)',
  proposal_sent: 'var(--chart-7)',
  won: 'var(--chart-2)',
  lost: 'var(--chart-3)',
};

const statusOrder = ['new', 'contacted', 'meeting_scheduled', 'proposal_sent', 'won', 'lost'];

export default function PipelineReport({ data }) {
  const { charts, summary } = data || {};
  const { byStatus = [], bySource = [] } = charts || {};
  const totalLeads = byStatus.reduce((s, d) => s + d.count, 0);
  const totalSource = bySource.reduce((s, d) => s + d.count, 0);
  const sortedStatus = [...byStatus].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ReportSummaryCard label="Total Leads" value={totalLeads} color="text-indigo-600" icon={GitBranch} subtitle="All leads in pipeline" />
        <ReportSummaryCard label="Won" value={summary?.wonLeads ?? byStatus.find(d => d.status === 'won')?.count ?? 0} color="text-green-600" icon={Target} subtitle="Converted to client" />
        <ReportSummaryCard label="Conversion Rate" value={`${summary?.conversionRate ?? 0}%`} color="text-blue-600" icon={Zap} subtitle={`${summary?.lostLeads ?? 0} lost`} />
        <ReportSummaryCard label="Avg. Conversion" value={summary?.avgConversionDays ? `${summary.avgConversionDays}d` : '—'} color="text-orange-600" icon={Hourglass} subtitle="Lead to client" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-zinc-700">Pipeline by Status</h4>
            <span className="text-xs text-zinc-400">{totalLeads} total</span>
          </div>
          {sortedStatus.length > 0 ? (
            <ChartContainer config={barConfig} className="w-full h-[300px]">
              <BarChart data={sortedStatus} layout="vertical" barCategoryGap="25%" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#52525b' }} tickFormatter={(v) => STATUS_LABELS[v] || v} width={120} />
                <ChartTooltip
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
                              <div className="text-xs text-zinc-400">{pct}% of total</div>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {sortedStatus.map((d) => (
                    <Cell key={d.status} fill={STATUS_BAR_COLORS[d.status] || 'var(--chart-6)'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GitBranch className="w-10 h-10 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No leads in pipeline</p>
              <p className="text-xs text-zinc-300 mt-1">Create leads to see pipeline data</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-zinc-700 mb-4">Leads by Source</h4>
          {bySource.length > 0 ? (
            <div className="flex flex-col items-center">
              <ChartContainer config={{}} className="w-full h-[250px]">
                <PieChart>
                  <Pie data={bySource} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {bySource.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => {
                          const total = bySource.reduce((s, x) => s + x.count, 0);
                          const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                          return (
                            <div className="flex items-center justify-between gap-6 w-full">
                              <span className="text-zinc-600 capitalize">{name.replace(/_/g, ' ')}</span>
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
                {bySource.map((d, i) => {
                  const pct = totalSource > 0 ? ((d.count / totalSource) * 100).toFixed(0) : 0;
                  return (
                    <div key={d.source} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: `var(${PIE_COLORS[i % PIE_COLORS.length]})` }} />
                      <span className="text-zinc-500 capitalize">{d.source.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-zinc-800">{d.count}</span>
                      <span className="text-zinc-400">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No source data</p>
              <p className="text-xs text-zinc-300 mt-1">Sources appear once leads have them assigned</p>
            </div>
          )}
        </div>
      </div>

      {bySource.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-700">Source Breakdown</h4>
            <span className="text-xs text-zinc-400">{totalSource} leads</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Source</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">Count</th>
                  <th className="text-right py-2.5 px-5 text-xs text-zinc-500 font-medium uppercase tracking-wider">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((r, i) => (
                  <tr key={r.source} className={`border-b border-zinc-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}`}>
                    <td className="py-2.5 px-5 font-medium text-zinc-800 capitalize">{r.source.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 px-5 text-right font-semibold text-zinc-700">{r.count}</td>
                    <td className="py-2.5 px-5 text-right text-zinc-500">{totalSource > 0 ? ((r.count / totalSource) * 100).toFixed(1) : 0}%</td>
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
