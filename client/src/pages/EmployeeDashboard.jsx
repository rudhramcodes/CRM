import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../app/store/uiSlice';
import { useGetEmployeeDashboardQuery } from '../services/dashboardApi';
import ProgressRing from '../components/ui/ProgressRing';
import Badge from '../components/ui/Badge';
import {
  CheckCircle2, Clock, AlertCircle, Loader2, Calendar,
  ListTodo, Users, ArrowRight, MapPin, Video,
} from 'lucide-react';

const TASK_STATUS_CONFIG = {
  todo: { label: 'To Do', color: 'bg-zinc-100 text-zinc-700', dot: 'bg-zinc-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  review: { label: 'Review', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  done: { label: 'Done', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', variant: 'default' },
  medium: { label: 'Medium', variant: 'info' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'danger' },
};

const ACTIVITY_ICONS = {
  task: ListTodo,
  lead: Users,
};

const ACTIVITY_COLORS = {
  task: 'bg-blue-100 text-blue-600',
  lead: 'bg-indigo-100 text-indigo-600',
};

function formatMeetingDate(date) {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function EmployeeDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { data, isLoading, isError } = useGetEmployeeDashboardQuery();

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

  const { tasks, meetings, activity } = data.data;
  const activeTasks = tasks.total - tasks.done;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-primary-900">
          Welcome back, {user?.name?.split(' ')[0] || 'Employee'}
        </h2>
        <p className="text-zinc-500 text-sm mt-1">
          Here&apos;s your work summary for today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-zinc-400" />
                My Tasks
              </h3>
              <button
                onClick={() => navigate('/projects')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-6 mb-5">
              <ProgressRing
                value={tasks.done}
                max={tasks.total || 1}
                size={90}
                strokeWidth={7}
                color="#6366f1"
                label={`${tasks.done} of ${tasks.total}`}
                sublabel="completed"
              />
              <div className="flex-1 grid grid-cols-2 gap-3">
                {tasks.byStatus?.filter((s) => s.status !== 'done').map((s) => {
                  const config = TASK_STATUS_CONFIG[s.status] || TASK_STATUS_CONFIG.todo;
                  return (
                    <div key={s.status} className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-50">
                      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                      <span className="text-xs text-zinc-600">{config.label}</span>
                      <span className="text-sm font-semibold text-zinc-800 ml-auto">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {activeTasks > 0 && (
              <div className="space-y-2">
                {tasks.byStatus?.filter((s) => s.status !== 'done').slice(0, 3).map((s) => {
                  const config = TASK_STATUS_CONFIG[s.status] || TASK_STATUS_CONFIG.todo;
                  return (
                    <div key={s.status} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:border-zinc-200 transition-colors">
                      <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-zinc-800">{s.count} {config.label.toLowerCase()} tasks</span>
                      </div>
                      <Badge variant={s.status === 'in_progress' ? 'info' : s.status === 'review' ? 'warning' : 'default'} size="sm">
                        {config.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTasks === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-300 mb-2" />
                <p className="text-sm font-medium text-zinc-500">All tasks completed!</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400" />
                Upcoming Meetings
              </h3>
              <button
                onClick={() => navigate('/meetings')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {meetings?.length > 0 ? (
              <div className="space-y-2">
                {meetings.map((m) => (
                  <div
                    key={m._id}
                    onClick={() => navigate(`/meetings/${m._id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg border border-zinc-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">{m.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-500">{formatMeetingDate(m.date)}</span>
                        <span className="text-xs text-zinc-400">•</span>
                        <span className="text-xs text-zinc-500">{m.startTime} - {m.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {m.lead && (
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {m.lead.name}
                          </span>
                        )}
                        {m.client && (
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {m.client.companyName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {m.meetingLink && <Video className="w-3.5 h-3.5 text-zinc-400" />}
                      {m.location && <MapPin className="w-3.5 h-3.5 text-zinc-400" />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5 text-zinc-300" />
                </div>
                <p className="text-sm font-medium text-zinc-500">No upcoming meetings</p>
                <p className="text-xs text-zinc-400 mt-1">You&apos;re all clear!</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                Recent Activity
              </h3>
            </div>
            {activity?.length > 0 ? (
              <div className="divide-y divide-zinc-50">
                {activity.map((item, i) => {
                  const Icon = ACTIVITY_ICONS[item.type] || Clock;
                  const colorClass = ACTIVITY_COLORS[item.type] || 'bg-zinc-100 text-zinc-600';
                  return (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 truncate">{item.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-zinc-400">
                          {new Date(item.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </p>
                        {item.priority && (
                          <Badge variant={PRIORITY_CONFIG[item.priority]?.variant || 'default'} size="sm">
                            {PRIORITY_CONFIG[item.priority]?.label || item.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-zinc-300" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-zinc-500">No recent activity</p>
                <p className="text-xs text-zinc-400 mt-1">Activity will appear as you work.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Quick Links</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/projects')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <ListTodo className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-800">My Projects</p>
                  <p className="text-xs text-zinc-400">View assigned projects</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/leads')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-800">Leads</p>
                  <p className="text-xs text-zinc-400">Browse lead pipeline</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/meetings')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-800">Meetings</p>
                  <p className="text-xs text-zinc-400">View meeting schedule</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
