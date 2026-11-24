import { useCallback, useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

const PAUSE_KEY = 'dipanshu-portfolio-motion-paused';

/**
 * The visitor's own switch for the looping background motion (marquee, grain, aurora, hero canvas,
 * graph auto-rotate). Remembered across visits. Separate from the OS reduced-motion setting.
 */
export function useMotionPaused(): [boolean, () => void] {
  const [paused, setPaused] = useState(() => {
    try {
      return window.localStorage.getItem(PAUSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.motion = paused ? 'paused' : 'on';
    try {
      window.localStorage.setItem(PAUSE_KEY, paused ? '1' : '0');
    } catch {
      // Storage can be unavailable in private browsing; the switch still works for this visit.
    }
  }, [paused]);

  const toggle = useCallback(() => setPaused((value) => !value), []);
  return [paused, toggle];
}
