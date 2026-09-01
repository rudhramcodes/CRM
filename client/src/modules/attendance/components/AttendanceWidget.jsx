import { useGetTodayStatusQuery, useClockInMutation, useClockOutMutation, useStartBreakMutation, useEndBreakMutation } from '../../services/attendanceApi';
import { format } from 'date-fns';
import { Play, LogOut, Coffee, Clock } from 'lucide-react';

export default function AttendanceWidget() {
  const { data, isLoading } = useGetTodayStatusQuery();
  const [clockIn, { isLoading: clockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: clockingOut }] = useClockOutMutation();
  const [startBreak, { isLoading: startingBreak }] = useStartBreakMutation();
  const [endBreak, { isLoading: endingBreak }] = useEndBreakMutation();

  const today = data?.data?.attendance;
  const isClockedIn = today?.clockIn?.time && !today?.clockOut?.time;
  const isOnBreak = today?.breaks?.length > 0 && !today?.breaks[today.breaks.length - 1]?.end;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Today&apos;s Attendance</h3>
        {isClockedIn && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Active
          </span>
        )}
      </div>

      {isClockedIn && today ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>In: {format(new Date(today.clockIn.time), 'hh:mm a')}</span>
            {today.workHours > 0 && <span className="text-gray-400">| {today.workHours}h worked</span>}
          </div>

          <div className="flex gap-2">
            {isOnBreak ? (
              <button
                onClick={() => endBreak()}
                disabled={endingBreak}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                End Break
              </button>
            ) : (
              <button
                onClick={() => startBreak()}
                disabled={startingBreak}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                <Coffee className="h-3.5 w-3.5" />
                Break
              </button>
            )}
            <button
              onClick={() => clockOut()}
              disabled={clockingOut}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Clock Out
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">You haven&apos;t clocked in today.</p>
          <button
            onClick={() => clockIn()}
            disabled={clockingIn}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            Clock In
          </button>
        </div>
      )}
    </div>
  );
}
