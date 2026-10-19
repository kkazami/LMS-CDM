'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './super-user.module.css';

export default function AnimatedCount({ value }: { value: number | null }) {
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (value === null) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) { current.current = value; setDisplay(value); return; }
    const from = current.current;
    let frame = 0;
    const start = performance.now();
    const finish = () => { cancelAnimationFrame(frame); current.current = value; setDisplay(value); };
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 650, 1);
      current.current = Math.round(from + (value - from) * (1 - (1 - progress) ** 3));
      setDisplay(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    preference.addEventListener('change', finish);
    return () => { cancelAnimationFrame(frame); preference.removeEventListener('change', finish); };
  }, [value]);

  return <><span aria-hidden="true">{value === null ? '—' : display.toLocaleString('en-PH')}</span><span className={styles.srOnly}>{value === null ? 'Unavailable' : value.toLocaleString('en-PH')}</span></>;
}
