import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function ProgressRing({
  value = 0,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = 'var(--chart-1)',
  bgColor = '#e4e4e7',
  label = '',
  sublabel = '',
  className = '',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div ref={ref} className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={isInView ? { strokeDashoffset: offset } : {}}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold text-zinc-900">{Math.round(pct * 100)}%</span>
        </div>
      </div>
      {label && <span className="text-xs font-medium text-zinc-600">{label}</span>}
      {sublabel && <span className="text-[10px] text-zinc-400">{sublabel}</span>}
    </div>
  );
}
