import { useEffect, useState } from 'react';
import type { Content } from '../types';
import type { GraphData } from '../lib/graph';
import type { Theme } from '../lib/theme';
import FilterChips, { type FilterType, type VisibleTypes } from './FilterChips';
import Graph3D from './Graph3D';
import GraphList from './GraphList';
import InfoCard from './InfoCard';

const allVisible: VisibleTypes = {
  experience: true,
  education: true,
  project: true,
  skill: true,
  certification: true,
};

interface GraphViewProps {
  content: Content;
  graph: GraphData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  reducedMotion: boolean;
  theme: Theme;
}

export default function GraphView({ content, graph, selectedId, onSelect, reducedMotion, theme }: GraphViewProps) {
  const [visibleTypes, setVisibleTypes] = useState<VisibleTypes>(allVisible);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    if (!selectedId) return;
    const node = graph.nodeById.get(selectedId);
    const filterType = node?.type === 'course' ? 'education' : node?.type;
    const hidden = node && filterType !== 'profile' && filterType !== 'contact' && !visibleTypes[filterType as FilterType];
    if (!node || hidden) onSelect(null);
  }, [graph, onSelect, selectedId, visibleTypes]);

  const toggleType = (type: FilterType) => {
    setVisibleTypes((current) => ({ ...current, [type]: !current[type] }));
  };

  const reset = () => {
    setVisibleTypes(allVisible);
    setResetSignal((value) => value + 1);
    onSelect(null);
  };

  return (
    <div className="graph-layout">
      <section className="graph-stage" aria-label="Knowledge graph">
        <Graph3D
          graph={graph}
          selectedId={selectedId}
          onSelect={onSelect}
          visibleTypes={visibleTypes}
          reducedMotion={reducedMotion}
          resetSignal={resetSignal}
          theme={theme}
        />
        <div className="graph-toolbar">
          <FilterChips value={visibleTypes} onChange={toggleType} theme={theme} />
          <div className="graph-toolbar__actions">
            <button type="button" className="graph-tool" onClick={reset}>Reset view</button>
          </div>
        </div>
        <p className="graph-hint" aria-hidden="true">Drag to orbit, scroll to zoom, click a node</p>
        {/* Text alternative for screen readers, kept out of the Tab order; keyboard users have arrow-key navigation in the canvas. */}
        <div className="graph-list-a11y">
          <GraphList graph={graph} visibleTypes={visibleTypes} onJump={onSelect} />
        </div>
      </section>
      <InfoCard content={content} graph={graph} nodeId={selectedId} onJump={onSelect} onClear={() => onSelect(null)} />
    </div>
  );
}
