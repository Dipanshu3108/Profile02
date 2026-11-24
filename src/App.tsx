import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import type { Mode } from './types';
import { content } from './lib/content';
import { buildGraph } from './lib/graph';
import { usePrefersReducedMotion } from './lib/motion';
import { readViewState, subscribeToViewState, writeViewState, type ViewState } from './lib/urlState';
import { useTheme, type Theme } from './lib/theme';
import { circularReveal, type Origin } from './lib/reveal';
import Header from './components/Header';
import ClassicView from './components/ClassicView';
import GraphErrorBoundary, { canRenderWebGL, GraphUnavailable } from './components/GraphErrorBoundary';

const loadGraph = () => import('./components/GraphView');
const GraphView = lazy(loadGraph);

export default function App() {
  const [view, setView] = useState<ViewState>(readViewState);
  const [isFading, setIsFading] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const [theme, setTheme] = useTheme();
  const graph = useMemo(() => buildGraph(content), []);
  const role = content.experience[0];
  // Set when a user action changes the mode, so that change gets its own history entry.
  const pushNext = useRef(false);

  useEffect(() => {
    writeViewState(view, pushNext.current);
    pushNext.current = false;
  }, [view]);

  useEffect(() => subscribeToViewState(setView), []);

  const changeMode = useCallback((mode: Mode, origin?: Origin, nodeId: string | null = null) => {
    if (mode === view.mode && nodeId === view.nodeId) return;
    const update = () => {
      if (mode !== view.mode) pushNext.current = true;
      setView({ mode, nodeId: mode === 'graph' ? nodeId : null });
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    if (mode === view.mode) {
      update();
      return;
    }

    if (!reducedMotion && circularReveal(update, origin ?? { x: window.innerWidth - 80, y: 40 })) return;

    setIsFading(true);
    window.setTimeout(() => {
      update();
      window.setTimeout(() => setIsFading(false), 40);
    }, reducedMotion ? 0 : 170);
  }, [reducedMotion, view.mode, view.nodeId]);

  // The new theme grows out of the switch as a circle, like the mode switch but quicker.
  const changeTheme = useCallback((next: Theme, origin?: Origin) => {
    if (next === theme) return;
    const update = () => setTheme(next);
    if (!reducedMotion && circularReveal(update, origin ?? { x: window.innerWidth - 40, y: 40 }, 520)) return;
    update();
  }, [reducedMotion, setTheme, theme]);

  const openInGraph = useCallback((nodeId: string | null, origin?: Origin) => {
    // If the chunk fails to load, still switch: the error boundary then explains what happened.
    loadGraph().catch(() => undefined).then(() => changeMode('graph', origin, nodeId));
  }, [changeMode]);

  const switchToClassic = useCallback(() => changeMode('classic'), [changeMode]);

  const selectNode = useCallback((nodeId: string | null) => {
    setView((current) => ({ ...current, nodeId }));
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`app app--${view.mode}${isFading ? ' is-fading' : ''}`}>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Header
          name={content.profile.name}
          status={content.profile.status ?? (role ? `${role.role} at ${role.organization}` : content.profile.headline)}
          mode={view.mode}
          onModeChange={(mode, origin) => (mode === 'graph' ? openInGraph(null, origin) : changeMode(mode, origin))}
          onPreloadGraph={() => { loadGraph().catch(() => undefined); }}
          theme={theme}
          onThemeChange={changeTheme}
        />
        <main id="main-content">
          {view.mode === 'classic' ? (
            <ClassicView content={content} theme={theme} reducedMotion={reducedMotion} onOpenInGraph={openInGraph} />
          ) : canRenderWebGL() ? (
            <GraphErrorBoundary onUseClassic={switchToClassic}>
              <Suspense fallback={<div className="graph-layout" />}>
                <GraphView
                  content={content}
                  graph={graph}
                  selectedId={view.nodeId}
                  onSelect={selectNode}
                  reducedMotion={reducedMotion}
                  theme={theme}
                />
              </Suspense>
            </GraphErrorBoundary>
          ) : (
            <GraphUnavailable onUseClassic={switchToClassic} />
          )}
        </main>
        <footer className="site-footer">
          <span>© {content.profile.name}</span>
          <span>
            Loading orbs by{' '}
            <a href="https://www.npmjs.com/package/thinking-orbs" target="_blank" rel="noopener noreferrer">thinking-orbs</a>, bots by{' '}
            <a href="https://www.npmjs.com/package/bot-avatars" target="_blank" rel="noopener noreferrer">bot-avatars</a>, MIT
          </span>
        </footer>
      </div>
    </MotionConfig>
  );
}
