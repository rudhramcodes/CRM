import { useState, useRef, useEffect, useCallback } from 'react';

export default function RefreshCwIcon({
  color = 'currentColor',
  size = 24,
  strokeWidth = 2,
  className = '',
  onClick,
  ...props
}) {
  const [hovered, setHovered] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const clickTimer = useRef(null);

  const hasSpinClass = className.includes('animate-spin');
  const cleanClassName = className.replace(/animate-spin/g, '').trim();

  useEffect(() => {
    if (hasSpinClass) {
      setSpinKey((k) => k + 1);
    }
  }, [hasSpinClass]);

  const handleClick = useCallback((e) => {
    setSpinKey((k) => k + 1);
    onClick?.(e);
  }, [onClick]);

  return (
    <svg
      key={spinKey}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      className={`transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-visible cursor-pointer ${
        hasSpinClass || spinKey > 0 ? 'animate-[spin_1s_linear_1]' : hovered ? 'scale-110 rotate-[50deg]' : ''
      } ${cleanClassName}`}
      {...props}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}
