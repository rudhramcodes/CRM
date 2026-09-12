import { useEffect, useState } from 'react';

export default function CredOdometer({ value, prefix = '', suffix = '', duration = 1000 }) {
  const [count, setCount] = useState(0);
  const target = typeof value === 'number' ? value : parseFloat(value) || 0;

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo curve for snappy CRED feel
      const easeOut = 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.round(start + (target - start) * easeOut);
      setCount(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return (
    <span className="tabular-nums font-semibold">
      {prefix}
      {count.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}
