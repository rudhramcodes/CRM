import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import LocationBadge from '../../../components/ui/LocationBadge';
import { format, isValid } from 'date-fns';
import {
  Clock,
  Coffee,
  Calendar,
  User,
  MapPin,
  FileText,
  AlertCircle,
  Home,
  CheckCircle2,
  XCircle,
  Pencil,
  Shield,
  Layers,
  History,
} from 'lucide-react';

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

const safeFormat = (val, fmt = 'hh:mm a') => {
  if (!val) return '—';
  const d = new Date(val);
  return isValid(d) ? format(d, fmt) : '—';
};

export default function AttendanceDetailModal({ record, open, onClose, onEdit, isAdmin }) {
  if (!record) return null;

  const employee = record.employee || {};
  const shift = record.shift || {};
  const sessions = record.sessions || [];
  const events = record.events || [];
  const leave = record.leave;

  const initials = employee.name
    ? employee.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <Modal open={open} onClose={onClose} title="Attendance Record Details" size="lg">
      <div className="space-y-6">
        {/* Employee Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-zinc-50 to-zinc-100/80 border border-zinc-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-primary-900 text-white flex items-center justify-center font-semibold text-base shadow-sm ring-2 ring-white">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-900">{employee.name || 'Unnamed Employee'}</h3>
                <Badge variant={STATUS_BADGE[record.status] || 'default'}>
                  {record.isWFH ? 'Work From Home' : record.status?.replace('_', ' ')}
                </Badge>
                {record.isLate && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    Late ({record.lateMinutes || 0}m)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                <span>{employee.email || 'No email provided'}</span>
                {employee.role && (
                  <>
                    <span>•</span>
                    <span className="capitalize font-medium text-zinc-600">{employee.role.replace('_', ' ')}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500 font-medium bg-white px-3 py-1.5 rounded-lg border border-zinc-200">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              {record.date ? format(new Date(record.date), 'EEEE, dd MMMM yyyy') : '—'}
            </div>
          </div>
        </div>

        {/* Quick KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <Clock className="w-3.5 h-3.5 text-primary-600" />
              <span>Work Duration</span>
            </div>
            <p className="text-lg font-bold text-zinc-900 mt-1">
              {record.workHours ? `${record.workHours} hrs` : record.status === 'present' ? 'In Progress' : '0 hrs'}
            </p>
            {record.overtime > 0 && (
              <span className="text-[11px] text-emerald-600 font-medium">+{record.overtime}h Overtime</span>
            )}
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span>Break Time</span>
            </div>
            <p className="text-lg font-bold text-zinc-900 mt-1">
              {record.totalBreakMinutes ? `${record.totalBreakMinutes} mins` : '0 mins'}
            </p>
            <span className="text-[11px] text-zinc-400">Total pauses</span>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Assigned Shift</span>
            </div>
            <p className="text-sm font-semibold text-zinc-900 mt-1 truncate">
              {shift.name || 'General Shift'}
            </p>
            <span className="text-[11px] text-zinc-500">
              {shift.startTime && shift.endTime ? `${shift.startTime} – ${shift.endTime}` : '09:00 – 18:00'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Total Sessions</span>
            </div>
            <p className="text-lg font-bold text-zinc-900 mt-1">
              {sessions.length || (record.clockIn?.time ? 1 : 0)}
            </p>
            <span className="text-[11px] text-zinc-400">Clock in/out cycles</span>
          </div>
        </div>

        {/* Leave Details Card (if status is leave) */}
        {record.status === 'leave' && (
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-100 text-purple-700">
                <FileText className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-semibold text-purple-900">Approved Leave Information</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <span className="text-purple-600">Leave Type:</span>{' '}
                <span className="font-semibold text-purple-950 uppercase">{leave?.leaveType || 'Leave'}</span>
              </div>
              <div>
                <span className="text-purple-600">Status:</span>{' '}
                <span className="font-semibold text-emerald-700 capitalize">{leave?.status || 'Approved'}</span>
              </div>
              <div className="sm:col-span-3">
                <span className="text-purple-600">Reason:</span>{' '}
                <span className="text-purple-950 italic">{leave?.reason || record.notes || 'No reason specified'}</span>
              </div>
            </div>
          </div>
        )}

        {/* WFH Notice Card */}
        {record.isWFH && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3 text-xs">
            <Home className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Remote Work / Work From Home</p>
              <p className="text-blue-700 mt-0.5">{record.wfhReason || 'Approved for remote working on this date.'}</p>
            </div>
          </div>
        )}

        {/* Notes (if any) */}
        {record.notes && (
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 text-xs">
            <span className="font-semibold text-zinc-700 flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              Supervisor / Admin Notes:
            </span>
            <p className="text-zinc-600 italic pl-5">{record.notes}</p>
          </div>
        )}

        {/* Sessions & Breaks Timeline */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            Clock Sessions & Break Timeline
          </h4>

          {sessions.length === 0 && !record.clockIn?.time ? (
            <div className="p-6 rounded-xl border border-dashed border-zinc-200 text-center text-zinc-400 text-sm">
              No clock in/out sessions recorded for this day.
            </div>
          ) : (
            <div className="space-y-3">
              {(sessions.length > 0 ? sessions : [{ clockIn: record.clockIn, clockOut: record.clockOut, breaks: record.breaks, workMinutes: Math.round((record.workHours || 0) * 60) }]).map(
                (session, idx) => (
                  <div key={idx} className="border border-zinc-200 rounded-xl p-4 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <span className="text-xs font-semibold text-primary-900">Session {idx + 1}</span>
                      {session.workMinutes > 0 && (
                        <span className="text-xs text-zinc-500 font-medium">
                          {Math.floor(session.workMinutes / 60)}h {session.workMinutes % 60}m logged
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Clock In Time</span>
                        </div>
                        <p className="font-semibold text-zinc-900 pl-5">
                          {safeFormat(session.clockIn?.time)}
                        </p>
                        {session.clockIn?.ip && (
                          <p className="text-[11px] text-zinc-400 pl-5">IP: {session.clockIn.ip}</p>
                        )}
                        {session.clockIn?.location?.lat != null && (
                          <div className="pl-5 pt-1.5">
                            <LocationBadge location={session.clockIn.location} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Clock Out Time</span>
                        </div>
                        <p className="font-semibold text-zinc-900 pl-5">
                          {session.clockOut?.time ? safeFormat(session.clockOut.time) : (
                            <span className="text-amber-600 font-medium">Session in progress</span>
                          )}
                        </p>
                        {session.clockOut?.location?.lat != null && (
                          <div className="pl-5 pt-1.5">
                            <LocationBadge location={session.clockOut.location} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Breaks list for this session */}
                    {session.breaks && session.breaks.length > 0 && (
                      <div className="pt-2 border-t border-zinc-100">
                        <p className="text-xs font-medium text-zinc-500 mb-2">Breaks during this session:</p>
                        <div className="space-y-1.5">
                          {session.breaks.map((b, bIdx) => (
                            <div key={bIdx} className="flex items-center justify-between text-xs bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-150">
                              <span className="text-zinc-700">Break {bIdx + 1}</span>
                              <span className="text-zinc-500">
                                {safeFormat(b.start)} – {b.end ? safeFormat(b.end) : 'On Break'}
                              </span>
                              <span className="font-medium text-zinc-800">
                                {b.duration ? `${b.duration} mins` : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Audit Events Log */}
        {events && events.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-200">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Activity Audit Log
            </h4>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {events.map((evt, eIdx) => (
                <div key={eIdx} className="text-xs flex items-center justify-between text-zinc-600 bg-zinc-50/80 px-3 py-1.5 rounded-md">
                  <span className="capitalize font-medium">{evt.type?.replace('_', ' ')}</span>
                  <span className="text-zinc-400">{evt.timestamp ? safeFormat(evt.timestamp, 'hh:mm:ss a') : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
          <div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit?.(record);
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit / Override Record
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
