import { Edit2, Trash2, Calendar, Clock, ExternalLink, Repeat, Building2, User, Video } from 'lucide-react';
import MeetingStatusBadge from './MeetingStatusBadge';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../components/ui/Select';
import { formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { MEETING_STATUS, BRANDS, BRAND_METAS } from '../../../constants';
import { TableSkeleton } from '../../../components/ui/Skeleton';

const BRAND_LABELS = BRANDS.reduce((acc, b) => {
  acc[b.value] = b.label;
  return acc;
}, {});

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
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4">
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-12 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
        <p className="text-sm font-semibold text-rose-600">Failed to load meetings</p>
        <p className="text-xs text-zinc-400 mt-1">Please try refreshing your connection</p>
      </div>
    );
  }

  if (!meetings.length) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-12 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
        <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <Calendar className="w-6 h-6 text-zinc-400" />
        </div>
        <p className="text-sm font-bold text-primary-900">No scheduled meetings found</p>
        <p className="text-xs text-zinc-400 mt-1">Schedule a new briefing or client sync to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              <th className="px-4 py-3.5">Meeting & Session</th>
              <th className="px-4 py-3.5">Schedule</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Venture</th>
              <th className="px-4 py-3.5">Related Entity</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {meetings.map((meeting) => {
              const brandKey =
                meeting.brand ||
                meeting.client?.brand ||
                meeting.lead?.brand;
              const meta = BRAND_METAS[brandKey];
              const brandLabel = BRAND_LABELS[brandKey] || brandKey;

              return (
                <tr
                  key={meeting._id}
                  onClick={() => onRowClick?.(meeting)}
                  className="hover:bg-zinc-50/80 cursor-pointer transition-colors"
                >
                  {/* Title & Join link */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-primary-900 shrink-0 shadow-2xs mt-0.5">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-primary-900 text-xs sm:text-sm truncate">
                            {meeting.title}
                          </p>
                          {meeting.seriesId && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70 text-[10px] font-semibold"
                              title="Part of a recurring series"
                            >
                              <Repeat className="w-2.5 h-2.5" />
                              Repeats
                            </span>
                          )}
                        </div>

                        {meeting.meetingLink ? (
                          <a
                            href={meeting.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200/60 transition-colors shadow-2xs"
                          >
                            <Video className="w-3 h-3" />
                            <span>Join Meeting</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                          </a>
                        ) : meeting.location ? (
                          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                            {meeting.location}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Schedule */}
                  <td className="px-4 py-3.5">
                    <div className="space-y-0.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-zinc-800 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{formatDate(meeting.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                        <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span>
                          {meeting.startTime} - {meeting.endTime}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Status Dropdown */}
                  <td className="px-4 py-3.5">
                    <div onClick={(e) => e.stopPropagation()}>
                      {canEdit && onStatusChange ? (
                        <Select
                          value={meeting.status}
                          onValueChange={(val) => onStatusChange(meeting._id, val)}
                        >
                          <SelectTrigger
                            className={cn(
                              'w-auto gap-1 border-0 bg-transparent p-0 shadow-none cursor-pointer',
                              'hover:bg-transparent focus:ring-0',
                              '[&>svg]:text-zinc-400 [&>svg]:w-3 [&>svg]:h-3'
                            )}
                          >
                            <MeetingStatusBadge status={meeting.status} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                            {MEETING_STATUS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <MeetingStatusBadge status={meeting.status} />
                      )}
                    </div>
                  </td>

                  {/* Venture */}
                  <td className="px-4 py-3.5">
                    {meta ? (
                      <div className="flex items-center gap-1.5">
                        {meta.logo ? (
                          <img
                            src={meta.logo}
                            alt={meta.label}
                            className="w-5 h-5 rounded-md object-contain border border-zinc-200/80 p-0.5 bg-white shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div
                            className={cn(
                              'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs bg-gradient-to-br',
                              meta.gradient
                            )}
                          >
                            {meta.initial || 'R'}
                          </div>
                        )}
                        <span className="text-xs font-medium text-zinc-700 truncate max-w-[100px]">
                          {meta.label || brandLabel}
                        </span>
                      </div>
                    ) : brandKey ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200/60">
                        {brandLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </td>

                  {/* Related To */}
                  <td className="px-4 py-3.5">
                    {meeting.client ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-medium shadow-2xs">
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        <span className="truncate max-w-[120px]">{meeting.client.companyName}</span>
                      </span>
                    ) : meeting.lead ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200/80 text-xs font-medium shadow-2xs">
                        <User className="w-3 h-3 text-sky-600" />
                        <span className="truncate max-w-[120px]">{meeting.lead.name}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(meeting);
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="Edit meeting"
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
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete meeting"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

