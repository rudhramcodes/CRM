import { useState } from 'react';
import { useGetTodayStatusQuery, useClockInMutation, useClockOutMutation, useStartBreakMutation, useEndBreakMutation } from '../../../services/attendanceApi';
import CalendarGrid from '../components/CalendarGrid';
import DayDetailPanel from '../components/DayDetailPanel';
import AttendanceStats from '../components/AttendanceStats';
import { useAuth } from '../../../hooks/useAuth';
import { ChevronLeft, ChevronRight, Clock, LogOut, Coffee, Play } from 'lucide-react';
import { format } from 'date-fns';

export default function AttendanceCalendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: todayData, isLoading: todayLoading } = useGetTodayStatusQuery();
  const [clockIn, { isLoading: clockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: clockingOut }] = useClockOutMutation();
  const [startBreak, { isLoading: startingBreak }] = useStartBreakMutation();
  const [endBreak, { isLoading: endingBreak }] = useEndBreakMutation();

  const today = todayData?.data?.attendance;
  const isClockedIn = today?.clockIn?.time && !today?.clockOut?.time;
  const isOnBreak = today?.breaks?.length > 0 && !today?.breaks[today.breaks.length - 1]?.end;

  const handleClockIn = async () => {
    try {
      await clockIn({ shift: today?.shift?._id }).unwrap();
    } catch (err) {
      console.error('Clock in failed:', err);
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut().unwrap();
    } catch (err) {
      console.error('Clock out failed:', err);
    }
  };

  const handleStartBreak = async () => {
    try {
      await startBreak().unwrap();
    } catch (err) {
      console.error('Start break failed:', err);
    }
  };

  const handleEndBreak = async () => {
    try {
      await endBreak().unwrap();
    } catch (err) {
      console.error('End break failed:', err);
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">Track your daily attendance and work hours</p>
        </div>
        <div className="flex items-center gap-2">
          {!isClockedIn ? (
            <button
              onClick={handleClockIn}
              disabled={clockingIn}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Clock In
            </button>
          ) : (
            <>
              {isOnBreak ? (
                <button
                  onClick={handleEndBreak}
                  disabled={endingBreak}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  End Break
                </button>
              ) : (
                <button
                  onClick={handleStartBreak}
                  disabled={startingBreak}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  <Coffee className="h-4 w-4" />
                  Start Break
                </button>
              )}
              <button
                onClick={handleClockOut}
                disabled={clockingOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                Clock Out
              </button>
            </>
          )}
        </div>
      </div>

      {isClockedIn && today && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
          <Clock className="h-5 w-5 text-green-600" />
          <div className="text-sm text-green-800">
            <span className="font-medium">Clocked in at {format(new Date(today.clockIn.time), 'hh:mm a')}</span>
            {today.workHours > 0 && (
              <span className="ml-4">{today.workHours}h worked</span>
            )}
            {today.overtime > 0 && (
              <span className="ml-2 text-green-600">({today.overtime}h overtime)</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <CalendarGrid
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              employeeId={user?._id}
            />
          </div>
        </div>

        <div className="space-y-6">
          <DayDetailPanel date={selectedDate} employeeId={user?._id} />
          <AttendanceStats employeeId={user?._id} />
        </div>
      </div>
    </div>
  );
}
