import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, CalendarClock, MapPin, Video, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { getStatusColor, formatDate } from '../../../utils/formatters';
import { useGetMeetingByIdQuery, useDeleteMeetingMutation } from '../../../services/meetingApi';

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function PortalMeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError, error } = useGetMeetingByIdQuery(id, { skip: !id });
  const meeting = data?.data?.meeting;
  const [deleteMeeting, { isLoading: isDeleting }] = useDeleteMeetingMutation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !meeting) {
    return (
      <div className="space-y-4">
        <Link to="/portal/meetings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to meetings
        </Link>
        <EmptyState title="Meeting not found" description={error?.data?.message || 'This meeting is unavailable.'} />
      </div>
    );
  }

  const canCancel = meeting.createdBy?._id === user?._id || meeting.createdBy === user?._id;

  const handleCancel = async () => {
    try {
      await deleteMeeting({ id }).unwrap();
      toast.success('Meeting cancelled');
      navigate('/portal/meetings');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to cancel meeting');
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/portal/meetings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to meetings
      </Link>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold text-primary-900">{meeting.title}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {formatDate(meeting.date)} · {meeting.startTime}–{meeting.endTime}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(meeting.status)}`}>
            {STATUS_LABELS[meeting.status] || meeting.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-zinc-600">
          {meeting.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-zinc-400" /> {meeting.location}
            </span>
          )}
          {meeting.meetingLink && meeting.status === 'scheduled' && (
            <a
              href={meeting.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg font-medium text-sm px-3 py-1.5 bg-primary-900 text-white hover:bg-primary-800 active:bg-primary-950 transition-colors"
            >
              <Video className="w-4 h-4" /> Join meeting
            </a>
          )}
          {meeting.attendees?.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-zinc-400" />
              With: {meeting.attendees.map((a) => a.name || a).join(', ')}
            </span>
          )}
        </div>

        {meeting.status === 'scheduled' && canCancel && (
          <div className="mt-5 pt-5 border-t border-zinc-100">
            <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={isDeleting}>
              <Trash2 className="w-3.5 h-3.5" /> Cancel Meeting
            </Button>
          </div>
        )}
      </div>

      {meeting.notes && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-primary-900 mb-3">Notes</h2>
          <p className="text-sm text-zinc-600 whitespace-pre-wrap leading-relaxed">{meeting.notes}</p>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleCancel}
        title="Cancel this meeting?"
        message="The meeting will be cancelled and everyone notified. This cannot be undone."
        confirmLabel="Cancel Meeting"
      />
    </div>
  );
}