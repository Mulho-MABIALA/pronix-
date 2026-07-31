import { useEffect, useRef, useState } from 'react';

/**
 * Anime un nombre de 0 (ou de sa valeur précédente) jusqu'à `value` en `duration` ms.
 * Respecte prefers-reduced-motion (retourne directement la valeur finale).
 * Usage : const display = useCountUp(1234); <span>{display.toLocaleString('fr-FR')}</span>
 */
export function useCountUp(value, duration = 700) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplay(target);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}
