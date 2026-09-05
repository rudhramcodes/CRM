import { useMemo, useState } from 'react';
import {
  useGetTodayStatusQuery,
  useGetHolidaysQuery,
  useClockInMutation,
  useClockOutMutation,
  useStartBreakMutation,
  useEndBreakMutation,
} from '../../../services/attendanceApi';
import LiveTimer from './LiveTimer';
import ClockOutSummary from './ClockOutSummary';
import Button from '../../../components/ui/Button';
import Switch from '../../../components/ui/Switch';
import { format } from 'date-fns';
import { Play, LogOut, Coffee, PlayCircle, Plane, Gift, CalendarOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatHours, formatMinutes } from '../../../utils/formatters';

const BLOCKED_STATUS = {
  leave: {
    title: 'On leave today',
    icon: Plane,
    className: 'bg-purple-50 text-purple-800 border-purple-100',
  },
  holiday: {
    title: 'Holiday today',
    icon: Gift,
    className: 'bg-blue-50 text-blue-800 border-blue-100',
  },
  weekend: {
    title: 'Weekend',
    icon: CalendarOff,
    className: 'bg-zinc-50 text-zinc-600 border-zinc-100',
  },
};

const formatLeaveType = (type) =>
  type ? String(type).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Leave';

const getLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: false }
    );
  });
};

export default function AttendanceWidget() {
  const now = new Date();
  const { data, isLoading } = useGetTodayStatusQuery();
  const { data: holidaysData } = useGetHolidaysQuery({ year: now.getFullYear(), page: 1, limit: 100 });
  const [clockIn, { isLoading: clockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: clockingOut }] = useClockOutMutation();
  const [startBreak, { isLoading: startingBreak }] = useStartBreakMutation();
  const [endBreak, { isLoading: endingBreak }] = useEndBreakMutation();

  const [showSummary, setShowSummary] = useState(false);
  const [isWFH, setIsWFH] = useState(false);

  const today = data?.data?.attendance;
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const holidayToday = useMemo(() => {
    const holidays = Array.isArray(holidaysData?.data)
      ? holidaysData.data
      : holidaysData?.data?.holidays || [];
    return holidays.find((h) => {
      if (!h?.date) return false;
      return format(new Date(h.date), 'yyyy-MM-dd') === todayKey;
    }) || null;
  }, [holidaysData, todayKey]);

  const blockedKind = useMemo(() => {
    if (today?.status && BLOCKED_STATUS[today.status]) return today.status;
    if (holidayToday) return 'holiday';
    if (new Date().getDay() === 0) return 'weekend';
    return null;
  }, [today?.status, holidayToday]);
  const sessions = today?.sessions || [];
  const activeSession = sessions.find((s) => s.clockIn?.time && !s.clockOut?.time) || null;
  const isClockedIn = !!activeSession;
  const isOnBreak = activeSession?.breaks?.length > 0 && !activeSession.breaks[activeSession.breaks.length - 1]?.end;

  const totalBreakSeconds = (activeSession?.breaks || []).reduce((acc, brk) => {
    if (brk.start && brk.end) {
      return acc + Math.round((new Date(brk.end) - new Date(brk.start)) / 1000);
    }
    return acc;
  }, 0);

  const completedSessions = sessions.filter((s) => s.clockIn?.time && s.clockOut?.time);
  const currentClockInTime = activeSession?.clockIn?.time || null;

  const handleClockIn = async () => {
    if (blockedKind) {
      toast.error(BLOCKED_STATUS[blockedKind].title);
      return;
    }
    try {
      const location = await getLocation();
      await clockIn({ isWFH, location }).unwrap();
      toast.success(isWFH ? 'Clocked in (WFH)' : 'Clocked in successfully');
    } catch (err) {
      toast.error(err?.data?.message || 'Clock in failed');
    }
  };

  const handleClockOut = async () => {
    setShowSummary(true);
  };

  const confirmClockOut = async () => {
    try {
      const location = await getLocation();
      await clockOut({ location }).unwrap();
      setShowSummary(false);
      toast.success('Clocked out successfully');
    } catch (err) {
      toast.error(err?.data?.message || 'Clock out failed');
    }
  };

  const handleStartBreak = async () => {
    try {
      await startBreak().unwrap();
      toast.success('Break started');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    try {
      await endBreak().unwrap();
      toast.success('Break ended');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to end break');
    }
  };

  const blocked = !isClockedIn && blockedKind ? BLOCKED_STATUS[blockedKind] : null;
  const BlockedIcon = blocked?.icon;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-6 animate-pulse">
        <div className="h-5 bg-zinc-200 rounded w-1/3 mb-6" />
        <div className="h-20 bg-zinc-100 rounded-lg mb-4" />
        <div className="h-10 bg-zinc-100 rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-zinc-900">Today&apos;s Attendance</h3>
          {isClockedIn && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {isOnBreak ? 'On Break' : 'Active'}
            </span>
          )}
          {!isClockedIn && blockedKind && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              blockedKind === 'leave' ? 'bg-purple-50 text-purple-700' :
              blockedKind === 'holiday' ? 'bg-blue-50 text-blue-700' :
              'bg-zinc-100 text-zinc-600'
            }`}>
              {blockedKind === 'leave' ? 'Leave' : blockedKind === 'holiday' ? 'Holiday' : 'Weekend'}
            </span>
          )}
        </div>

        <div className="mb-6">
          <LiveTimer
            clockInTime={currentClockInTime}
            isRunning={isClockedIn}
            isPaused={isOnBreak}
            breakSeconds={totalBreakSeconds}
            idleMessage={blocked ? blocked.title : 'Not clocked in'}
          />
        </div>

        {isClockedIn && activeSession && (
          <div className="mb-4 px-4 py-2.5 bg-zinc-50 rounded-lg space-y-1">
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5 text-green-500" />
                In: {format(new Date(activeSession.clockIn.time), 'hh:mm a')}
              </span>
              {activeSession.clockOut?.time && (
                <span className="flex items-center gap-1.5">
                  <LogOut className="h-3.5 w-3.5 text-red-500" />
                  Out: {format(new Date(activeSession.clockOut.time), 'hh:mm a')}
                </span>
              )}
              {activeSession.workMinutes > 0 && (
                <span>{formatMinutes(activeSession.workMinutes)} worked</span>
              )}
              {activeSession.overtime > 0 && (
                <span className="text-green-600">+{formatMinutes(activeSession.overtime)} OT</span>
              )}
            </div>

            {activeSession.breaks?.length > 0 && (
              <div className="pt-2 border-t border-zinc-200">
                <p className="text-xs font-medium text-zinc-500 mb-1.5">Break History</p>
                <div className="space-y-1">
                  {activeSession.breaks.map((brk, idx) => {
                    const start = brk.start ? format(new Date(brk.start), 'hh:mm a') : '—';
                    const end = brk.end ? format(new Date(brk.end), 'hh:mm a') : 'Ongoing';
                    const dur = brk.duration !== null && brk.duration !== undefined ? formatMinutes(brk.duration) : '...';
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs text-zinc-600">
                        <Coffee className="h-3 w-3 text-amber-500" />
                        <span>{idx + 1}.</span>
                        <span>{start} — {end}</span>
                        <span className="text-zinc-400">({dur})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!isClockedIn && completedSessions.length > 0 && (
          <div className="mb-4 px-4 py-2.5 bg-zinc-50 rounded-lg space-y-2">
            <p className="text-xs font-medium text-zinc-500">Completed sessions</p>
            {completedSessions.map((session, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 text-green-500" />
                  In: {format(new Date(session.clockIn.time), 'hh:mm a')}
                </span>
                <span className="flex items-center gap-1.5">
                  <LogOut className="h-3.5 w-3.5 text-red-500" />
                  Out: {format(new Date(session.clockOut.time), 'hh:mm a')}
                </span>
                {session.workMinutes > 0 && (
                  <span>{formatMinutes(session.workMinutes)}</span>
                )}
              </div>
            ))}
            {today?.workHours > 0 && (
              <p className="text-xs text-zinc-500">Total today: {formatHours(today.workHours)}</p>
            )}
          </div>
        )}

        {!isClockedIn && !blockedKind && completedSessions.length === 0 && (
          <div className="mb-6 px-4 py-3 bg-zinc-50 rounded-lg">
            <Switch checked={isWFH} onChange={setIsWFH} label="Work From Home" />
          </div>
        )}

        {blocked && (
          <div className={`mb-6 px-4 py-3 rounded-lg border flex items-start gap-3 ${blocked.className}`}>
            {BlockedIcon && <BlockedIcon className="h-5 w-5 mt-0.5 shrink-0" />}
            <div>
              <p className="text-sm font-medium">{blocked.title}</p>
              <p className="text-xs mt-0.5 opacity-80">
                {blockedKind === 'leave' && (
                  <>Clock-in is disabled. {today?.leave?.leaveType ? `${formatLeaveType(today.leave.leaveType)} is approved for today.` : 'You have approved leave for today.'}</>
                )}
                {blockedKind === 'holiday' && (
                  <>{holidayToday?.name || 'Company holiday'} — clock-in is not available.</>
                )}
                {blockedKind === 'weekend' && (
                  <>Clock-in is not allowed on Sunday.</>
                )}
              </p>
            </div>
          </div>
        )}

        {(isClockedIn || !blockedKind) && (
        <div className="flex gap-3">
          {!isClockedIn ? (
            <Button className="w-full" size="lg" onClick={handleClockIn} loading={clockingIn}>
              <PlayCircle className="h-5 w-5" />
              Clock In
            </Button>
          ) : (
            <>
              {isOnBreak ? (
                <Button variant="secondary" className="flex-1" size="lg" onClick={handleEndBreak} loading={endingBreak}>
                  <Play className="h-4 w-4" />
                  End Break
                </Button>
              ) : (
                <Button variant="secondary" className="flex-1" size="lg" onClick={handleStartBreak} loading={startingBreak}>
                  <Coffee className="h-4 w-4" />
                  Break
                </Button>
              )}
              <Button variant="danger" className="flex-1" size="lg" onClick={handleClockOut} loading={clockingOut}>
                <LogOut className="h-4 w-4" />
                Clock Out
              </Button>
            </>
          )}
        </div>
        )}
      </div>

      <ClockOutSummary
        open={showSummary}
        onClose={() => setShowSummary(false)}
        onConfirm={confirmClockOut}
        activeSession={activeSession}
        totalBreakMinutes={Math.round(totalBreakSeconds / 60)}
      />
    </>
  );
}
