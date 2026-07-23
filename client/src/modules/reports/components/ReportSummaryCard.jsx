import { useRef, useEffect, useState } from 'react';

function extractNumber(val) {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val !== 'string') return null;
  const num = parseFloat(val.replace(/[₹,]/g, ''));
  return isNaN(num) ? null : num;
}

function isCurrency(val) { return typeof val === 'string' && val.startsWith('₹'); }
function isPercent(val) { return typeof val === 'string' && val.endsWith('%'); }

export default function ReportSummaryCard({ label, value, color = 'text-zinc-900', subtitle, icon: Icon }) {
  const [display, setDisplay] = useState(() => {
    const t = extractNumber(value);
    if (t !== null) {
      const formatted = t % 1 === 0 ? t.toLocaleString('en-IN') : t.toFixed(1);
      return `${isCurrency(value) ? '₹' : ''}${formatted}${isPercent(value) ? '%' : ''}`;
    }
    return value ?? '';
  });
  const frameRef = useRef(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const target = extractNumber(value);
    if (target === null || hasRun.current) return;
    hasRun.current = true;

    let startTime = null;
    const duration = 800;

    function tick(now) {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      const formatted = target % 1 === 0 ? Math.round(current).toLocaleString('en-IN') : current.toFixed(1);
      setDisplay(`${isCurrency(value) ? '₹' : ''}${formatted}${isPercent(value) ? '%' : ''}`);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value]);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color} tabular-nums`}>{display}</p>
      {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
