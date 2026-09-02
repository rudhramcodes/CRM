import { useState, useEffect, useRef } from 'react';

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LiveTimer({ clockInTime, isRunning, isPaused, breakSeconds = 0 }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!isRunning || !clockInTime) {
      setElapsed(0);
      return;
    }

    const calcElapsed = () => {
      const now = Date.now();
      const total = Math.floor((now - new Date(clockInTime).getTime()) / 1000);
      return Math.max(0, total - breakSeconds);
    };

    setElapsed(calcElapsed());

    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsed(calcElapsed());
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [clockInTime, isRunning, isPaused, breakSeconds]);

  if (!isRunning) {
    return (
      <div className="text-center">
        <p className="text-5xl md:text-6xl font-mono font-bold text-zinc-300 tracking-wider">
          00:00:00
        </p>
        <p className="text-sm text-zinc-400 mt-2">Not clocked in</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className={`text-5xl md:text-6xl font-mono font-bold tracking-wider ${
        isPaused ? 'text-amber-500' : 'text-primary-900'
      }`}>
        {formatTime(elapsed)}
      </p>
      <p className="text-sm mt-2 font-medium">
        {isPaused ? (
          <span className="text-amber-500 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            On Break
          </span>
        ) : (
          <span className="text-green-600 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Working
          </span>
        )}
      </p>
    </div>
  );
}
