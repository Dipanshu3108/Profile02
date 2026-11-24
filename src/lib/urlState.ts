import type { Mode } from '../types';

export interface ViewState {
  mode: Mode;
  nodeId: string | null;
}

/**
 * Classic is the main view: every visit opens it unless the link asks for the graph
 * (`?mode=graph`, or a `?node=` deep link). The last-used view is deliberately not remembered.
 */
export function readViewState(): ViewState {
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get('mode');
  const nodeId = params.get('node');

  const mode: Mode = urlMode === 'graph' || urlMode === 'classic'
    ? urlMode
    : nodeId
      ? 'graph'
      : 'classic';
  return { mode, nodeId: mode === 'graph' ? nodeId : null };
}

/**
 * Mirrors the view into the URL. `push` adds a history entry (used when the mode changes, so the
 * browser's Back button returns to the previous view instead of leaving the site); otherwise the
 * current entry is replaced, so node-by-node browsing does not flood the history.
 */
export function writeViewState({ mode, nodeId }: ViewState, push = false): void {
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
