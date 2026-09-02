import { useGetAttendanceListQuery, useRequestRegularizationMutation } from '../../../services/attendanceApi';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { format } from 'date-fns';
import { Clock, MapPin, AlertTriangle, FileText, Coffee, Play, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  half_day: 'warning',
  leave: 'info',
  holiday: 'info',
  weekend: 'default',
  wfh: 'primary',
};

const fmtTime = (t) => (t ? format(new Date(t), 'hh:mm a') : '—');
const fmtCoord = (loc) =>
  loc?.lat != null && loc?.lng != null ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : null;

export default function DayDetailPanel({ date, employeeId }) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, isLoading } = useGetAttendanceListQuery({
    dateFrom: dateStr,
    dateTo: dateStr,
    ...(employeeId && { employee: employeeId }),
    limit: 5,
  });

  const [requestRegularization] = useRequestRegularizationMutation();

  const records = Array.isArray(data?.data) ? data.data : [];
  const record = records[0];

  const handleRegularize = async () => {
    if (!record) return;
    const reason = prompt('Reason for regularization:');
    if (!reason) return;
    try {
      await requestRegularization({ attendanceId: record._id, reason }).unwrap();
      toast.success('Regularization request submitted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-zinc-200 rounded w-1/2" />
          <div className="h-3 bg-zinc-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <h3 className="font-semibold text-zinc-900 mb-2">{format(date, 'EEEE, dd MMM yyyy')}</h3>
        <p className="text-sm text-zinc-400">No attendance record for this day.</p>
      </div>
    );
  }

  const sessions = record.sessions || [];
  const hasSessions = sessions.length > 0;
  const breakH = Math.floor((record.totalBreakMinutes || 0) / 60);
  const breakM = (record.totalBreakMinutes || 0) % 60;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900">{format(date, 'EEEE, dd MMM yyyy')}</h3>
        <Badge variant={STATUS_BADGE[record.status] || 'default'}>
          {record.status?.replace('_', ' ')}
        </Badge>
      </div>

      <div className="space-y-3 text-sm">
        {/* Sessions */}
        {hasSessions ? (
          sessions.map((session, idx) => {
            const inLoc = fmtCoord(session.clockIn?.location);
            const outLoc = fmtCoord(session.clockOut?.location);
            return (
              <div key={idx} className="p-3 bg-zinc-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-zinc-700 font-medium">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  Session {idx + 1}
                </div>

                <div className="grid grid-cols-2 gap-2 pl-6 text-zinc-600">
                  <div className="flex items-center gap-1.5">
                    <Play className="h-3 w-3 text-green-500 shrink-0" />
                    <span>In: {fmtTime(session.clockIn?.time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <LogOut className="h-3 w-3 text-red-500 shrink-0" />
                    <span>Out: {fmtTime(session.clockOut?.time)}</span>
                  </div>
                </div>

                {session.workMinutes > 0 && (
                  <div className="pl-6 text-zinc-500">
                    Work: {(session.workMinutes / 60).toFixed(1)}h
                    {session.overtime > 0 && <span className="text-green-600 ml-1">+{(session.overtime / 60).toFixed(1)}h OT</span>}
                  </div>
                )}

                {/* Break details per session */}
                {session.breaks?.length > 0 && (
                  <div className="pl-6 space-y-1">
                    {session.breaks.map((brk, bi) => (
                      <div key={bi} className="flex items-center gap-1.5 text-zinc-500">
                        <Coffee className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>
                          Break {bi + 1}: {fmtTime(brk.start)} — {fmtTime(brk.end)}
                          {brk.duration ? ` (${brk.duration}m)` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Location per session */}
                {(inLoc || outLoc) && (
                  <div className="pl-6 text-zinc-500 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span>{inLoc || outLoc}</span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-600">
              <Clock className="h-4 w-4 text-zinc-400" />
              <span>In: {fmtTime(record.clockIn?.time)}</span>
              <span className="text-zinc-300">|</span>
              <span>Out: {fmtTime(record.clockOut?.time)}</span>
            </div>
          </div>
        )}

        {/* Totals */}
        {record.workHours > 0 && (
          <div className="flex items-center gap-2 text-zinc-600">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span>{record.workHours}h worked</span>
            {record.overtime > 0 && <span className="text-green-600">({record.overtime}h OT)</span>}
          </div>
        )}

        {record.totalBreakMinutes > 0 && (
          <div className="flex items-center gap-2 text-zinc-500">
            <Coffee className="h-4 w-4 text-zinc-400" />
            <span>Total break: {breakH > 0 ? `${breakH}h ` : ''}{breakM}m</span>
          </div>
        )}

        {record.shift && (
          <div className="text-zinc-500">
            Shift: {record.shift.name} ({record.shift.startTime} — {record.shift.endTime})
          </div>
        )}
      </div>

      {record.notes && (
        <div className="flex items-start gap-2 p-2 bg-zinc-50 rounded-lg text-sm text-zinc-600">
          <FileText className="h-4 w-4 mt-0.5 text-zinc-400 shrink-0" />
          <span>{record.notes}</span>
        </div>
      )}

      {record.lateMinutes > 0 && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span>Late by {record.lateMinutes} min</span>
        </div>
      )}

      {record.isWFH && (
        <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-sm text-indigo-700">
          <MapPin className="h-4 w-4" />
          <span>Work From Home</span>
        </div>
      )}

      {record.status === 'absent' && (
        <Button variant="outline" className="w-full" onClick={handleRegularize}>
          Request Regularization
        </Button>
      )}
    </div>
  );
}
