import { flushSync } from 'react-dom';

export type Origin = { x: number; y: number };

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

export function canReveal(): boolean {
  return typeof (document as TransitionDocument).startViewTransition === 'function';
}

/**
 * Runs `update` inside a View Transition and grows the new page out of `origin` as a circle.
 * Used by the Classic/Graph switch and the light/dark switch. Returns false (without running
 * `update`) when the browser has no View Transitions, so the caller can fall back.
 */
export function circularReveal(update: () => void, origin: Origin, duration = 750): boolean {
  const doc = document as TransitionDocument;
  if (!doc.startViewTransition) return false;
  const { x, y } = origin;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = doc.startViewTransition(() => flushSync(update));
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => undefined);
  return true;
}
