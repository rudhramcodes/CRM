import { useState } from 'react';
import { useGetAttendanceListQuery, useRequestRegularizationMutation } from '../../../services/attendanceApi';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import { format } from 'date-fns';
import { Clock, MapPin, AlertTriangle, FileText, Coffee, Play, LogOut } from 'lucide-react';
import { formatHours, formatMinutes } from '../../../utils/formatters';
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

  const [requestRegularization, { isLoading: submittingRegularize }] = useRequestRegularizationMutation();
  const [regularizeOpen, setRegularizeOpen] = useState(false);
  const [regularizeReason, setRegularizeReason] = useState('');
  const [regularizeError, setRegularizeError] = useState('');

  const records = Array.isArray(data?.data) ? data.data : [];
  const record = records[0];

  const handleRegularize = async (e) => {
    e.preventDefault();
    if (!record) return;
    const reason = regularizeReason.trim();
    if (reason.length < 10) {
      setRegularizeError('Reason must be at least 10 characters');
      return;
    }
    try {
      await requestRegularization({ attendanceId: record._id, reason }).unwrap();
      toast.success('Regularization request submitted');
      setRegularizeOpen(false);
      setRegularizeReason('');
      setRegularizeError('');
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
                    Work: {formatMinutes(session.workMinutes)}
                    {session.overtime > 0 && <span className="text-green-600 ml-1">+{formatMinutes(session.overtime)} OT</span>}
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
                          {brk.duration !== null && brk.duration !== undefined ? ` (${formatMinutes(brk.duration)})` : ''}
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
        {record.workHours !== null && record.workHours !== undefined && (
          <div className="flex items-center gap-2 text-zinc-600">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span>{formatHours(record.workHours)} worked</span>
            {record.overtime > 0 && <span className="text-green-600">({formatHours(record.overtime)} OT)</span>}
          </div>
        )}

        {record.totalBreakMinutes !== null && record.totalBreakMinutes !== undefined && (
          <div className="flex items-center gap-2 text-zinc-500">
            <Coffee className="h-4 w-4 text-zinc-400" />
            <span>Total break: {formatMinutes(record.totalBreakMinutes)}</span>
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
          <span>Late by {formatMinutes(record.lateMinutes)}</span>
        </div>
      )}

      {record.isWFH && (
        <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-sm text-indigo-700">
          <MapPin className="h-4 w-4" />
          <span>Work From Home</span>
        </div>
      )}

      {record.status === 'absent' && (
        <Button variant="outline" className="w-full" onClick={() => { setRegularizeOpen(true); setRegularizeError(''); }}>
          Request Regularization
        </Button>
      )}

      <Modal open={regularizeOpen} onClose={() => setRegularizeOpen(false)} title="Request Regularization">
        <form onSubmit={handleRegularize} className="space-y-4">
          <p className="text-sm text-zinc-500">
            Approving a request does not change clock times. An admin can correct times with Manual Entry.
          </p>
          <Textarea
            label="Reason"
            value={regularizeReason}
            onChange={(e) => {
              setRegularizeReason(e.target.value);
              setRegularizeError('');
            }}
            error={regularizeError}
            rows={4}
            placeholder="Explain why this day should be regularized (min 10 characters)"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRegularizeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submittingRegularize}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
