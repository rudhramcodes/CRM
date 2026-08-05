import { Edit2, Trash2, Calendar, Clock, ExternalLink, Repeat } from 'lucide-react';
import MeetingStatusBadge from './MeetingStatusBadge';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../components/ui/Select';
import { formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { MEETING_STATUS } from '../../../constants';
import { TableSkeleton } from '../../../components/ui/Skeleton';

export default function MeetingTable({
  meetings = [],
  loading,
  error,
  onRowClick,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200">
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-12 text-center">
          <p className="text-sm text-red-600">Failed to load meetings</p>
        </div>
      </div>
    );
  }

  if (!meetings.length) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-12 text-center">
          <Calendar className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No meetings found</p>
          <p className="text-xs text-zinc-400 mt-1">Schedule a meeting to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date & Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Related To</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {meetings.map((meeting) => (
              <tr
                key={meeting._id}
                onClick={() => onRowClick?.(meeting)}
                className="hover:bg-zinc-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-primary-900" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-primary-900">{meeting.title}</p>
                        {meeting.seriesId && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-900/70 text-[10px] font-medium"
                            title="Part of a recurring series"
                          >
                            <Repeat className="w-2.5 h-2.5" />
                            Repeats
                          </span>
                        )}
                      </div>
                      {meeting.meetingLink && (
                        <a
                          href={meeting.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary-900/60 hover:text-primary-900 flex items-center gap-1 mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Join
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-zinc-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {formatDate(meeting.date)}
                    </span>
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {meeting.startTime} - {meeting.endTime}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div onClick={(e) => e.stopPropagation()}>
                    {canEdit && onStatusChange ? (
                      <Select value={meeting.status} onValueChange={(val) => onStatusChange(meeting._id, val)}>
                        <SelectTrigger
                          className={cn(
                            'w-auto gap-1 border-0 bg-transparent p-0 shadow-none',
                            'hover:bg-transparent focus:ring-0',
                            '[&>svg]:text-zinc-400 [&>svg]:w-3 [&>svg]:h-3',
                          )}
                        >
                          <MeetingStatusBadge status={meeting.status} />
                        </SelectTrigger>
                        <SelectContent>
                          {MEETING_STATUS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <MeetingStatusBadge status={meeting.status} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-zinc-700">
                    {meeting.client ? (
                      <span>{meeting.client.companyName}</span>
                    ) : meeting.lead ? (
                      <span className="text-zinc-400">{meeting.lead.name}</span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(meeting);
                        }}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(meeting);
                        }}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
