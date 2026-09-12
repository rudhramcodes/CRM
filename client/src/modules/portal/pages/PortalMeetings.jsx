import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarClock, Plus, Video, Eye, Clock, Calendar } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { formatDate } from '../../../utils/formatters';
import { useGetMeetingsQuery } from '../../../services/meetingApi';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function PortalMeetings() {
  const { data, isLoading, isError, error } = useGetMeetingsQuery({ limit: 100 });
  const meetings = data?.data?.meetings || data?.meetings || data?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-48 bg-zinc-200 rounded-xl animate-pulse" />
        <div className="grid sm:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-zinc-100 border border-zinc-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50 text-center text-rose-700 max-w-7xl mx-auto">
        <p className="font-semibold">{error?.data?.message || 'Something went wrong loading meetings.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-primary-900" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-900">
              Video Sessions & Calls
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 font-heading">
            Scheduled Meetings
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Review upcoming project briefings, progress demos, and team sync sessions.
          </p>
        </div>
        <Link to="/portal/meetings/new">
          <Button className="bg-primary-900 hover:bg-primary-800 text-white font-medium shadow-xs border-0">
            <Plus className="w-4 h-4" /> Book New Session
          </Button>
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <EmptyState
            title="No sessions currently scheduled"
            description="Book a video conference or phone call with your project team at your convenience."
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {meetings.map((meeting, idx) => {
            const statusMeta = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.scheduled;

            return (
              <motion.div
                key={meeting._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="p-6 rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 transition-all duration-150 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-900">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 font-heading truncate">
                    {meeting.title}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 flex-wrap">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{formatDate(meeting.date)}</span>
                    <span>&bull;</span>
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{meeting.startTime} &ndash; {meeting.endTime}</span>
                  </p>
                  {meeting.location && (
                    <p className="text-xs text-zinc-500 mt-1">📍 {meeting.location}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-5 mt-5 border-t border-zinc-100">
                  <Link
                    to={`/portal/meetings/${meeting._id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Agenda & details
                  </Link>

                  {meeting.meetingLink && meeting.status === 'scheduled' && (
                    <a
                      href={meeting.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-900 hover:bg-primary-800 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" /> Join Room
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}