import { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  User,
  Timer,
  BarChart2,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { cn } from '../../../utils/cn';

export default function TaskAnalyticsModal({ open, onClose, tasks = [] }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const inReview = tasks.filter((t) => t.status === 'review').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;

    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length;

    const totalEstimated = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
    const totalActual = tasks.reduce((sum, t) => sum + (Number(t.actualHours) || 0), 0);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Priority breakdown
    const priorityCounts = {
      urgent: tasks.filter((t) => t.priority === 'urgent').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };

    // Team workload breakdown
    const memberMap = {};
    for (const t of tasks) {
      const name = t.assignedTo?.name || 'Unassigned';
      const id = t.assignedTo?._id || 'unassigned';
      if (!memberMap[id]) {
        memberMap[id] = { name, total: 0, done: 0, pending: 0, hours: 0 };
      }
      memberMap[id].total += 1;
      if (t.status === 'done') memberMap[id].done += 1;
      else memberMap[id].pending += 1;
      memberMap[id].hours += Number(t.actualHours) || 0;
    }

    const members = Object.values(memberMap).sort((a, b) => b.total - a.total);

    return {
      total,
      completed,
      inProgress,
      inReview,
      todo,
      overdue,
      totalEstimated,
      totalActual,
      completionRate,
      priorityCounts,
      members,
    };
  }, [tasks]);

  return (
    <Modal open={open} onClose={onClose} title="Task Velocity & Operations Analytics" size="2xl">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* KPI Banner Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Completion Velocity
            </span>
            <p className="text-2xl font-bold text-primary-900 mt-1">
              {stats.completionRate}%
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {stats.completed} of {stats.total} deliverables
            </p>
          </div>

          <div className="bg-blue-50/50 border border-blue-200/60 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Active in Flight
            </span>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {stats.inProgress + stats.inReview}
            </p>
            <p className="text-[11px] text-blue-600 mt-0.5">
              {stats.inProgress} progressing, {stats.inReview} review
            </p>
          </div>

          <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
              Overdue Alerts
            </span>
            <p className="text-2xl font-bold text-rose-900 mt-1">
              {stats.overdue}
            </p>
            <p className="text-[11px] text-rose-600 mt-0.5">
              Requires deadline adjustment
            </p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Logged Effort
            </span>
            <p className="text-2xl font-bold text-emerald-900 mt-1">
              {stats.totalActual} hrs
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              Estimated: {stats.totalEstimated} hrs
            </p>
          </div>
        </div>

        {/* Effort & Variance Meter */}
        <div className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-800">
              <Timer className="w-4 h-4 text-zinc-500" />
              <span>Effort Accuracy (Estimated vs Actual)</span>
            </div>
            <span className="text-xs font-semibold text-zinc-500">
              {stats.totalActual}h logged / {stats.totalEstimated}h planned
            </span>
          </div>

          <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${
                  stats.totalEstimated > 0
                    ? Math.min(100, Math.round((stats.totalActual / stats.totalEstimated) * 100))
                    : stats.totalActual > 0
                    ? 100
                    : 0
                }%`,
              }}
              title="Actual logged hours"
            />
          </div>
          <p className="text-[11px] text-zinc-400">
            {stats.totalActual <= stats.totalEstimated
              ? 'On track within planned estimations.'
              : `Effort overrun by ${(stats.totalActual - stats.totalEstimated).toFixed(1)} hours.`}
          </p>
        </div>

        {/* Priority Balance Bar */}
        <div className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
            Priority Distribution
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80">
              <span className="text-[10px] font-bold text-rose-700 uppercase">Urgent</span>
              <p className="text-lg font-bold text-rose-900 mt-0.5">{stats.priorityCounts.urgent}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80">
              <span className="text-[10px] font-bold text-amber-700 uppercase">High</span>
              <p className="text-lg font-bold text-amber-900 mt-0.5">{stats.priorityCounts.high}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/80">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Medium</span>
              <p className="text-lg font-bold text-blue-900 mt-0.5">{stats.priorityCounts.medium}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] font-bold text-zinc-600 uppercase">Low</span>
              <p className="text-lg font-bold text-zinc-800 mt-0.5">{stats.priorityCounts.low}</p>
            </div>
          </div>
        </div>

        {/* Team Workload Matrix */}
        <div className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-800">
            <User className="w-4 h-4 text-zinc-500" />
            <span>Team Workload Distribution</span>
          </div>

          <div className="divide-y divide-zinc-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="pb-2">Member</th>
                  <th className="pb-2 text-center">Assigned</th>
                  <th className="pb-2 text-center">Pending</th>
                  <th className="pb-2 text-center">Done</th>
                  <th className="pb-2 text-right">Logged Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {stats.members.map((m, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/60">
                    <td className="py-2.5 font-semibold text-primary-900">{m.name}</td>
                    <td className="py-2.5 text-center font-medium text-zinc-600">{m.total}</td>
                    <td className="py-2.5 text-center font-semibold text-amber-700">{m.pending}</td>
                    <td className="py-2.5 text-center font-semibold text-emerald-700">{m.done}</td>
                    <td className="py-2.5 text-right font-medium text-zinc-800">{m.hours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
