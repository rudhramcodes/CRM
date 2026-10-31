import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetTodayStatusQuery,
  useClockInMutation,
  useClockOutMutation,
} from '../services/attendanceApi';
import ClockOutSummary from '../modules/attendance/components/ClockOutSummary';
import { Play, LogOut, Coffee } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const getLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
};

function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function HeaderAttendancePill() {
  const user = useSelector((state) => state.auth.user);
  const { data, isLoading } = useGetTodayStatusQuery(undefined, {
    skip: !user || user.role === 'client',
    pollingInterval: 60000,
  });

  const [clockIn, { isLoading: clockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: clockingOut }] = useClockOutMutation();
  const [showSummary, setShowSummary] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const today = data?.data?.attendance;
  const sessions = today?.sessions || [];
  const activeSession = sessions.find((s) => s.clockIn?.time && !s.clockOut?.time) || null;
  const isClockedIn = !!activeSession;
  const isOnBreak =
    activeSession?.breaks?.length > 0 &&
    !activeSession.breaks[activeSession.breaks.length - 1]?.end;

  const totalBreakSeconds = useMemo(() => {
    return (activeSession?.breaks || []).reduce((acc, brk) => {
      if (brk.start && brk.end) {
        return acc + Math.round((new Date(brk.end) - new Date(brk.start)) / 1000);
      }
      return acc;
    }, 0);
  }, [activeSession?.breaks]);

  const totalBreakMinutes = Math.round(totalBreakSeconds / 60);

  useEffect(() => {
    if (!isClockedIn || !activeSession?.clockIn?.time) {
      setElapsed(0);
      return;
    }

    const calc = () => {
      const now = Date.now();
      const inTime = new Date(activeSession.clockIn.time).getTime();
      const diff = Math.max(0, Math.floor((now - inTime) / 1000));
      return Math.max(0, diff - totalBreakSeconds);
    };

    setElapsed(calc());

    if (!isOnBreak) {
      const interval = setInterval(() => setElapsed(calc()), 1000);
      return () => clearInterval(interval);
    }
  }, [isClockedIn, activeSession?.clockIn?.time, totalBreakSeconds, isOnBreak]);

  if (!user || user.role === 'client') return null;

  if (isLoading) {
    return (
      <div className="hidden sm:flex items-center h-8 px-3 rounded-full bg-zinc-100 animate-pulse w-28" />
    );
  }

  const handleClockIn = async () => {
    try {
      const location = await getLocation();
      await clockIn({ isWFH: false, location }).unwrap();
      toast.success('Punched In successfully! Have a great day.');
    } catch (err) {
      toast.error(err?.data?.message || 'Clock In failed');
    }
  };

  const handleConfirmClockOut = async () => {
    try {
      const location = await getLocation();
      await clockOut({ location }).unwrap();
      setShowSummary(false);
      toast.success('Clocked out successfully');
    } catch (err) {
      toast.error(err?.data?.message || 'Clock Out failed');
    }
  };

  return (
    <>
      <div className="flex items-center">
        {!isClockedIn ? (
          <button
            type="button"
            onClick={handleClockIn}
            disabled={clockingIn}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-2xs border group',
              'bg-emerald-50/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300'
            )}
            title="Click to Clock In for today"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform shrink-0" />
            <span className="whitespace-nowrap">
              {clockingIn ? 'Punching in...' : 'Punch In'}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 p-0.5 rounded-full bg-zinc-100/90 border border-zinc-200/80 text-xs shadow-2xs">
            <div className="flex items-center gap-2 px-2.5 py-1 text-zinc-800 font-mono font-medium text-xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="whitespace-nowrap tracking-wide">{formatElapsed(elapsed)}</span>
              {isOnBreak && (
                <span className="text-[10px] text-amber-700 bg-amber-100 font-sans font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <Coffee className="w-3 h-3" /> Break
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowSummary(true)}
              disabled={clockingOut}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-semibold border border-zinc-200/60 hover:border-rose-200 transition-all cursor-pointer text-xs shadow-2xs"
              title="Click to Clock Out"
            >
              {clockingOut ? '...' : 'Clock Out'}
            </button>
          </div>
        )}
      </div>

      {showSummary && (
        <ClockOutSummary
          open={showSummary}
          onClose={() => setShowSummary(false)}
          onConfirm={handleConfirmClockOut}
          activeSession={activeSession}
          totalBreakMinutes={totalBreakMinutes}
        />
      )}
    </>
  );
}

