import { Component, type ReactNode } from 'react';

interface GraphErrorBoundaryProps {
  onUseClassic: () => void;
  children: ReactNode;
}

interface GraphErrorBoundaryState {
  failed: boolean;
}

let webglSupport: boolean | undefined;

/** True when the browser can create a WebGL context, which the 3D graph needs. Checked once, on first use. */
export function canRenderWebGL(): boolean {
  if (webglSupport !== undefined) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    webglSupport = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

export function GraphUnavailable({ onUseClassic }: { onUseClassic: () => void }) {
  return (
    <div className="graph-layout graph-unavailable" role="alert">
      <div className="graph-unavailable__card">
        <h2>The knowledge graph could not load</h2>
        <p>
          It needs WebGL and a working connection. Everything in the graph is also in the
          Classic view.
        </p>
        <div className="graph-unavailable__actions">
          <button type="button" className="button button--primary" onClick={onUseClassic}>Switch to Classic</button>
          <button type="button" className="button button--ghost" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    </div>
  );
}

/** Catches a failed graph chunk or WebGL setup so the rest of the site keeps working. */
export default class GraphErrorBoundary extends Component<GraphErrorBoundaryProps, GraphErrorBoundaryState> {
  state: GraphErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): GraphErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Knowledge graph failed to load', error);
  }

  render() {
    if (this.state.failed) return <GraphUnavailable onUseClassic={this.props.onUseClassic} />;
    return this.props.children;
  }
}
