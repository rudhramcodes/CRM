import { CheckCircle, ListTodo, Target, BarChart3, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../../components/ui/chart';
import ReportSummaryCard from './ReportSummaryCard';
import { STATUS_LABELS } from './chartTheme';

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-4)', 'var(--chart-2)', 'var(--chart-6)', 'var(--chart-7)'];
const PRIORITY_COLORS = { high: 'var(--chart-3)', medium: 'var(--chart-4)', low: 'var(--chart-2)' };
const chartConfig = { count: { label: 'Tasks', color: 'var(--chart-1)' } };

const statusDisplayOrder = ['todo', 'in_progress', 'review', 'done'];

export default function ProductivityReport({ data }) {
  const { charts, summary } = data || {};
  const { byStatus = [], byPriority = [], byAssignee = [] } = charts || {};
  const totalTasks = byStatus.reduce((s, d) => s + d.count, 0);
  const doneCount = byStatus.find(d => d.status === 'done')?.count || 0;

  const sortedStatus = [...byStatus].sort(
    (a, b) => statusDisplayOrder.indexOf(a.status) - statusDisplayOrder.indexOf(b.status)
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ReportSummaryCard label="Total Tasks" value={summary?.total ?? totalTasks} color="text-indigo-600" icon={ListTodo} subtitle="All tasks" />
        <ReportSummaryCard label="Completed" value={summary?.done ?? doneCount} color="text-green-600" icon={CheckCircle} subtitle={`${summary?.completionRate ?? (totalTasks > 0 ? ((doneCount / totalTasks) * 100).toFixed(0) : 0)}% done`} />
        <ReportSummaryCard label="In Progress" value={byStatus.find(d => d.status === 'in_progress')?.count ?? 0} color="text-blue-600" icon={Target} subtitle="Currently active" />
        <ReportSummaryCard label="Overdue" value={summary?.overdue ?? 0} color="text-red-600" icon={AlertTriangle} subtitle="Past due date" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Donut */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-zinc-700 mb-4">Tasks by Status</h4>
          {sortedStatus.length > 0 ? (
            <div className="flex flex-col items-center">
              <ChartContainer config={{}} className="w-full h-[220px]">
                <PieChart>
                  <Pie data={sortedStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {sortedStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
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
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {sortedStatus.map((d, i) => (
                  <div key={d.status} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: `var(${PIE_COLORS[i % PIE_COLORS.length]})` }} />
                    <span className="text-zinc-500">{STATUS_LABELS[d.status] || d.status}</span>
                    <span className="font-medium text-zinc-800">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ListTodo className="w-8 h-8 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No tasks for this period</p>
            </div>
          )}
        </div>

        {/* Priority Bars */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-zinc-700 mb-4">Tasks by Priority</h4>
          {byPriority.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-[220px]">
              <BarChart data={byPriority} layout="vertical" barCategoryGap="35%">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                <YAxis type="category" dataKey="priority" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#52525b', textTransform: 'capitalize' }} width={65} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => (
                        <div className="flex items-center justify-between gap-6 w-full">
                          <span className="text-zinc-600 capitalize">{item.payload.priority} Priority</span>
                          <div className="text-right">
                            <div className="font-semibold text-zinc-900">{value}</div>
                            <div className="text-xs text-zinc-400">tasks</div>
                          </div>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {byPriority.map((d) => (
                    <Cell key={d.priority} fill={PRIORITY_COLORS[d.priority] || 'var(--chart-6)'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="w-8 h-8 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No priority data</p>
            </div>
          )}
          {byPriority.length > 0 && (
            <div className="flex justify-center gap-4 mt-2 text-xs">
              {byPriority.map(d => (
                <div key={d.priority} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[d.priority] || 'var(--chart-6)' }} />
                  <span className="text-zinc-500 capitalize">{d.priority}</span>
                  <span className="font-medium text-zinc-700">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignee Bars */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-zinc-700 mb-4">Tasks by Assignee</h4>
          {byAssignee.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-[220px]">
              <BarChart data={byAssignee} layout="vertical" barCategoryGap="25%" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#52525b' }} width={85} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => (
                        <div className="flex items-center justify-between gap-6 w-full">
                          <span className="text-zinc-600">{item.payload.name}</span>
                          <div className="text-right">
                            <div className="font-semibold text-zinc-900">{value}</div>
                            <div className="text-xs text-zinc-400">tasks</div>
                          </div>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="count" fill="var(--chart-5)" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="w-8 h-8 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">No assignments yet</p>
            </div>
          )}
          {byAssignee.length > 0 && (
            <div className="mt-2 text-xs text-zinc-400 text-center">
              {byAssignee.length} team members have tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
