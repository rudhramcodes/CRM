import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, CalendarClock, MapPin, Video, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { formatDate } from '../../../utils/formatters';
import { useGetMeetingByIdQuery, useDeleteMeetingMutation } from '../../../services/meetingApi';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  completed: { label: 'Completed', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  cancelled: { label: 'Cancelled', badge: 'bg-rose-50 text-rose-700 border border-rose-200' },
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
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-6 w-40 bg-zinc-200" />
        <Skeleton className="h-60 w-full rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  if (isError || !meeting) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Link to="/portal/meetings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to meetings
        </Link>
        <EmptyState title="Meeting not found" description={error?.data?.message || 'This meeting is unavailable.'} />
      </div>
    );
  }

  const canCancel = meeting.createdBy?._id === user?._id || meeting.createdBy === user?._id;
  const statusCfg = STATUS_CONFIG[meeting.status] || { label: meeting.status, badge: 'bg-zinc-100 text-zinc-700 border border-zinc-200' };

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
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link to="/portal/meetings" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to schedule
      </Link>

      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.badge}`}>
                {statusCfg.label}
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900">{meeting.title}</h1>
            <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary-900" />
              {formatDate(meeting.date)} · {meeting.startTime} – {meeting.endTime}
            </p>
          </div>

          {meeting.meetingLink && meeting.status === 'scheduled' && (
            <a
              href={meeting.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-900 hover:bg-primary-800 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
            >
              <Video className="w-4 h-4" /> Join Room
            </a>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-6 border-t border-zinc-100 text-sm">
          {meeting.location && (
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-xs font-medium uppercase text-zinc-500 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Location / Format
              </div>
              <div className="font-semibold text-zinc-900">{meeting.location}</div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="text-xs font-medium uppercase text-zinc-500 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" /> Time Window
            </div>
            <div className="font-semibold text-zinc-900">{meeting.startTime} – {meeting.endTime}</div>
          </div>
        </div>

        {meeting.attendees?.length > 0 && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="text-xs font-medium uppercase text-zinc-500 mb-2">Confirmed Attendees</div>
            <div className="flex flex-wrap gap-2">
              {meeting.attendees.map((a, idx) => {
                const name = typeof a === 'object' ? a.name || a.email : a;
                return (
                  <span key={idx} className="px-3 py-1 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-800 font-medium shadow-xs">
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {meeting.notes && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="text-xs font-medium uppercase text-zinc-500 mb-2">Agenda & Notes</div>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{meeting.notes}</p>
          </div>
        )}

        {meeting.status === 'scheduled' && canCancel && (
          <div className="pt-4 border-t border-zinc-100 flex justify-end">
            <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={isDeleting}>
              <Trash2 className="w-3.5 h-3.5" /> Cancel Meeting
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleCancel}
        title="Cancel this session?"
        message="The meeting will be cancelled and everyone notified. This cannot be undone."
        confirmLabel="Cancel Meeting"
      />
    </div>
  );
}