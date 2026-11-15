import { useEffect, useRef, useState } from 'react';

/**
 * How many rows of a long list to draw. A page opens with its first screenful, so the push starts at once,
 * and the rest follow a batch per frame while the page slides in. Once every row has been drawn the list
 * stays whole (Infinity), whatever it later holds.
 */
export default function useProgressiveCount(total, { initial = 8, step = 16 } = {}) {
  const [count, setCount] = useState(initial);
  const whole = useRef(false);
  if (count >= total) whole.current = true;
  const done = whole.current;

  useEffect(() => {
    if (done) return undefined;
    const frame = requestAnimationFrame(() => setCount(current => current + step));
    return () => cancelAnimationFrame(frame);
  }, [done, count, step]);

  return done ? Infinity : count;
}
