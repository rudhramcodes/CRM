import { useGetAttendanceListQuery, useRequestRegularizationMutation } from '../../../services/attendanceApi';
import { format } from 'date-fns';
import { Clock, MapPin, AlertTriangle, FileText } from 'lucide-react';

const STATUS_BADGE = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  half_day: 'bg-orange-100 text-orange-800',
  leave: 'bg-purple-100 text-purple-800',
  holiday: 'bg-blue-100 text-blue-800',
  weekend: 'bg-gray-100 text-gray-800',
  wfh: 'bg-indigo-100 text-indigo-800',
};

export default function DayDetailPanel({ date, employeeId }) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, isLoading } = useGetAttendanceListQuery({
    dateFrom: dateStr,
    dateTo: dateStr,
    ...(employeeId && { employee: employeeId }),
    limit: 5,
  });

  const [requestRegularization] = useRequestRegularizationMutation();

  const records = data?.data?.records || [];
  const record = records[0];

  const handleRegularize = async () => {
    if (!record) return;
    const reason = prompt('Reason for regularization:');
    if (!reason) return;
    try {
      await requestRegularization({ attendanceId: record._id, reason, requestedClockIn: record.clockIn?.time, requestedClockOut: record.clockOut?.time }).unwrap();
      alert('Regularization request submitted');
    } catch (err) {
      alert(err?.data?.message || 'Failed to submit');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{format(date, 'EEEE, dd MMM yyyy')}</h3>
        <p className="text-sm text-gray-400">No attendance record for this day.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{format(date, 'EEEE, dd MMM yyyy')}</h3>
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_BADGE[record.status] || 'bg-gray-100 text-gray-800'}`}>
          {record.status?.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="h-4 w-4 text-gray-400" />
          <span>In: {record.clockIn?.time ? format(new Date(record.clockIn.time), 'hh:mm a') : '—'}</span>
          <span className="text-gray-300">|</span>
          <span>Out: {record.clockOut?.time ? format(new Date(record.clockOut.time), 'hh:mm a') : '—'}</span>
        </div>

        {record.workHours > 0 && (
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{record.workHours}h worked</span>
            {record.overtime > 0 && <span className="text-green-600">({record.overtime}h OT)</span>}
          </div>
        )}

        {record.clockIn?.location && (
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>{record.clockIn.location}</span>
          </div>
        )}

        {record.breaks?.length > 0 && (
          <div className="text-gray-500">
            Breaks: {record.breaks.length} ({record.totalBreakMinutes || 0} min total)
          </div>
        )}

        {record.shift && (
          <div className="text-gray-500">
            Shift: {record.shift.name} ({record.shift.startTime} - {record.shift.endTime})
          </div>
        )}
      </div>

      {record.notes && (
        <div className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
          <FileText className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
          <span>{record.notes}</span>
        </div>
      )}

      {record.lateByMinutes > 0 && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          <span>Late by {record.lateByMinutes} min</span>
        </div>
      )}

      {record.status === 'absent' && (
        <button
          onClick={handleRegularize}
          className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Request Regularization
        </button>
      )}
    </div>
  );
}
