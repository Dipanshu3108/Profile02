import type { Mode } from '../types';

const MODE_KEY = 'dipanshu-portfolio-mode';

export interface ViewState {
  mode: Mode;
  nodeId: string | null;
}

export function readViewState(): ViewState {
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get('mode');
  const nodeId = params.get('node');
  let storedMode: Mode | null = null;
  try {
    const value = window.localStorage.getItem(MODE_KEY);
    if (value === 'classic' || value === 'graph') storedMode = value;
  } catch {
    // Storage can be unavailable in private browsing; the URL still works.
  }

  const mode: Mode = urlMode === 'graph' || urlMode === 'classic'
    ? urlMode
    : nodeId
      ? 'graph'
      : storedMode ?? 'classic';
  return { mode, nodeId: mode === 'graph' ? nodeId : null };
}

/**
 * Mirrors the view into the URL. `push` adds a history entry (used when the mode changes, so the
 * browser's Back button returns to the previous view instead of leaving the site); otherwise the
 * current entry is replaced, so node-by-node browsing does not flood the history.
 */
export function writeViewState({ mode, nodeId }: ViewState, push = false): void {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Ignore storage failures; URL state remains authoritative.
  }
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('mode', mode);
  if (mode === 'graph' && nodeId) url.searchParams.set('node', nodeId);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (push && next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.pushState({}, '', next);
  } else {
    window.history.replaceState({}, '', next);
  }
}

export function subscribeToViewState(callback: (state: ViewState) => void): () => void {
  const listener = () => callback(readViewState());
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
