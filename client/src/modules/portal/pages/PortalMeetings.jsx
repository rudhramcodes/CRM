import { Link } from 'react-router-dom';
import { CalendarClock, Plus, Video } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { getStatusColor, formatDate } from '../../../utils/formatters';
import { useGetMeetingsQuery } from '../../../services/meetingApi';

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function PortalMeetings() {
  const { data, isLoading, isError, error } = useGetMeetingsQuery({ limit: 100 });
  const meetings = data?.data?.meetings || data?.meetings || data?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Could not load meetings"
        description={error?.data?.message || 'Something went wrong. Please try again.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-primary-900">Meetings</h1>
          <p className="text-sm text-zinc-500 mt-1">Schedule and join meetings with our team.</p>
        </div>
        <Link to="/portal/meetings/new">
          <Button>
            <Plus className="w-4 h-4" /> Schedule Meeting
          </Button>
        </Link>
      </div>

      {meetings.length === 0 ? (
        <EmptyState
          title="No meetings yet"
          description="Schedule a meeting with our team when you're ready to talk."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {meetings.map((meeting) => (
            <div key={meeting._id} className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-900/5 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-primary-900" />
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(meeting.status)}`}>
                  {STATUS_LABELS[meeting.status] || meeting.status}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-primary-900 mb-1">{meeting.title}</h3>
              <p className="text-xs text-zinc-500 mb-4">
                {formatDate(meeting.date)} · {meeting.startTime}–{meeting.endTime}
                {meeting.location && ` · ${meeting.location}`}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  to={`/portal/meetings/${meeting._id}`}
                  className="text-xs font-medium text-primary-900 hover:underline"
                >
                  View details
                </Link>
                {meeting.meetingLink && meeting.status === 'scheduled' && (
                  <a
                    href={meeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-900 hover:underline"
                  >
                    <Video className="w-3 h-3" /> Join
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}