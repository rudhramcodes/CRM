import { Link } from 'react-router-dom';
import { FolderOpen, CalendarClock, Plus } from 'lucide-react';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import { getStatusColor } from '../../../utils/formatters';
import { useGetClientMeQuery } from '../../../services/clientApi';
import { useGetProjectsQuery } from '../../../services/projectApi';
import { useGetMeetingsQuery } from '../../../services/meetingApi';

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  review: 'Review',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

export default function ClientDashboard() {
  const { data: me, isLoading: meLoading } = useGetClientMeQuery();
  const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery({ limit: 4 });
  const { data: meetingsData, isLoading: meetingsLoading } = useGetMeetingsQuery({ limit: 5 });

  const stats = me?.data?.stats || { projectsByStatus: [], totalProjects: 0, upcomingMeetings: 0 };
  const projects = projectsData?.data?.projects || projectsData?.projects || projectsData?.data || [];
  const meetings = meetingsData?.data?.meetings || meetingsData?.meetings || meetingsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-primary-900">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Welcome back, {me?.data?.client?.companyName || 'there'}.</p>
        </div>
        <Link to="/portal/meetings/new">
          <Button>
            <Plus className="w-4 h-4" /> New Meeting
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <FolderOpen className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Total Projects</span>
          </div>
          {meLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="font-heading text-3xl font-semibold text-primary-900">{stats.totalProjects}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <CalendarClock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Upcoming Meetings</span>
          </div>
          {meLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="font-heading text-3xl font-semibold text-primary-900">{stats.upcomingMeetings}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <span className="text-xs uppercase tracking-wide">Projects by Status</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stats.projectsByStatus.length === 0 && <p className="text-sm text-zinc-400">—</p>}
            {stats.projectsByStatus.map((s) => (
              <span
                key={s._id}
                className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(s._id)}`}
              >
                {STATUS_LABELS[s._id] || s._id}: {s.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-primary-900">Recent Projects</h2>
            <Link to="/portal/projects" className="text-xs text-primary-900 hover:underline">
              View all
            </Link>
          </div>
          {projectsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              title="You don't have any projects yet"
              description="When we start work for you, your projects will show up here."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {projects.map((project) => (
                <li key={project._id}>
                  <Link
                    to={`/portal/projects/${project._id}`}
                    className="flex items-center justify-between py-3 hover:bg-zinc-50 -mx-3 px-3 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary-900 truncate">{project.name}</p>
                      <p className="text-xs text-zinc-400">
                        {project.client?.companyName || '—'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(project.status)}`}>
                      {STATUS_LABELS[project.status] || project.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-primary-900">Upcoming Meetings</h2>
            <Link to="/portal/meetings" className="text-xs text-primary-900 hover:underline">
              View all
            </Link>
          </div>
          {meetingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : meetings.length === 0 ? (
            <EmptyState
              title="No upcoming meetings"
              description="Schedule a meeting with our team when you're ready."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {meetings.map((meeting) => (
                <li key={meeting._id}>
                  <Link
                    to={`/portal/meetings/${meeting._id}`}
                    className="flex items-center justify-between py-3 hover:bg-zinc-50 -mx-3 px-3 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary-900 truncate">{meeting.title}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(meeting.date).toLocaleDateString()} · {meeting.startTime}–{meeting.endTime}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(meeting.status)}`}>
                      {meeting.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}