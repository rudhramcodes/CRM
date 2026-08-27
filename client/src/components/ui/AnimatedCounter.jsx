import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

export default function AnimatedCounter({ value, duration = 1.5, prefix = '', suffix = '', decimals = 0, className = '' }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const startRef = useRef(0);

  useEffect(() => {
    if (!isInView) return;

    const target = typeof value === 'number' ? value : parseFloat(value) || 0;
    const start = startRef.current;
    const diff = target - start;
    const startTime = performance.now();
    const dur = duration * 1000;

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / dur, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + diff * eased;
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        startRef.current = target;
      }
    }

    requestAnimationFrame(step);
  }, [value, duration, isInView]);

  const formatted = typeof display === 'number'
    ? display.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : display;

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      {prefix}{formatted}{suffix}
    </motion.span>
  );
}
