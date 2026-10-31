import { useSelector, useDispatch } from 'react-redux';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../app/store/uiSlice';
import { useGetEmployeeDashboardQuery } from '../services/dashboardApi';
import ProgressRing from '../components/ui/ProgressRing';
import Badge from '../components/ui/Badge';
import EmployeeWorkCalendar from '../components/EmployeeWorkCalendar';
import TaskDrawer from '../modules/tasks/components/TaskDrawer';
import {
  CheckCircle2, Clock, AlertCircle, Loader2, Calendar,
  ListTodo, Users, ArrowRight, MapPin, Video,
  ClipboardCheck, Wallet, Sparkles, FolderKanban,
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
  const [selectedTaskId, setSelectedTaskId] = useState(null);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-heading text-xl font-bold text-primary-900">
              Welcome back, {user?.name?.split(' ')[0] || 'Employee'}
            </h2>
            {user?.profile?.designation && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary-900/10 text-primary-900 border border-primary-900/15">
                {user.profile.designation}
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-sm mt-0.5">
            Here&apos;s your daily workstation summary and active priority tasks.
          </p>
        </div>
      </div>

      <EmployeeWorkCalendar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-zinc-500" />
                My Tasks
              </h3>
              <button
                onClick={() => navigate('/tasks')}
                className="text-xs text-primary-900 hover:text-primary-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                View All Tasks <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-6 mb-5">
              <ProgressRing
                value={tasks.done}
                max={tasks.total || 1}
                size={90}
                strokeWidth={7}
                color="#0f172a"
                label={`${tasks.done} of ${tasks.total}`}
                sublabel="completed"
              />
              <div className="flex-1 grid grid-cols-2 gap-3">
                {tasks.byStatus?.filter((s) => s.status !== 'done').map((s) => {
                  const config = TASK_STATUS_CONFIG[s.status] || TASK_STATUS_CONFIG.todo;
                  return (
                    <div key={s.status} className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-50/80 border border-zinc-100">
                      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                      <span className="text-xs font-medium text-zinc-600">{config.label}</span>
                      <span className="text-sm font-bold text-zinc-800 ml-auto">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real Active Priority Tasks */}
            {tasks.items?.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Active Priority Tasks (Click to open)
                </p>
                {tasks.items.map((t) => {
                  const config = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.todo;
                  const priority = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <div
                      key={t._id}
                      onClick={() => setSelectedTaskId(t._id)}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-primary-900/30 hover:bg-zinc-50/60 transition-all cursor-pointer shadow-2xs"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${config.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 group-hover:text-primary-900 transition-colors truncate">
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                          {t.project?.name && (
                            <span className="font-medium text-zinc-600 truncate max-w-[140px]">
                              {t.project.name}
                            </span>
                          )}
                          {t.dueDate && (
                            <>
                              <span>•</span>
                              <span>Due {new Date(t.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={priority.variant} size="sm">
                          {priority.label}
                        </Badge>
                        <Badge variant={t.status === 'in_progress' ? 'info' : t.status === 'review' ? 'warning' : 'default'} size="sm">
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : activeTasks > 0 ? (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                {tasks.byStatus?.filter((s) => s.status !== 'done').slice(0, 3).map((s) => {
                  const config = TASK_STATUS_CONFIG[s.status] || TASK_STATUS_CONFIG.todo;
                  return (
                    <div
                      key={s.status}
                      onClick={() => navigate('/tasks')}
                      className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:border-zinc-200 transition-colors cursor-pointer"
                    >
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
            ) : (
              <div className="flex flex-col items-center py-6 text-center pt-4 border-t border-zinc-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-zinc-700">All tasks completed!</p>
                <p className="text-xs text-zinc-400 mt-0.5">Great job, your task queue is clear.</p>
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

          <div className="bg-white rounded-xl border border-zinc-200/80 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3">Quick Navigation</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/tasks')}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-zinc-100 hover:border-primary-900/20 hover:bg-zinc-50/70 transition-all text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-900/10 text-primary-900 flex items-center justify-center shrink-0">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Tasks Hub</p>
                  <p className="text-xs text-zinc-400">View & submit my assigned tasks</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/attendance')}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-zinc-100 hover:border-emerald-300/40 hover:bg-emerald-50/20 transition-all text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Attendance & Shifts</p>
                  <p className="text-xs text-zinc-400">Punches, calendar & regularize</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/my-payslips')}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-zinc-100 hover:border-amber-300/40 hover:bg-amber-50/20 transition-all text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">My Payslips</p>
                  <p className="text-xs text-zinc-400">Download salary slips & tax info</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/meetings')}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-zinc-100 hover:border-purple-300/40 hover:bg-purple-50/20 transition-all text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Meetings & Calls</p>
                  <p className="text-xs text-zinc-400">Check team and client syncs</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in Task Drawer for direct execution from dashboard */}
      <TaskDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
