import type { GraphData, NodeType } from '../lib/graph';
import type { VisibleTypes } from './FilterChips';

interface GraphListProps {
  graph: GraphData;
  visibleTypes: VisibleTypes;
  onJump: (id: string) => void;
}

const groups: { type: NodeType; label: string }[] = [
  { type: 'profile', label: 'Profile' },
  { type: 'experience', label: 'Experience' },
  { type: 'education', label: 'Education' },
  { type: 'course', label: 'Courses' },
  { type: 'project', label: 'Projects' },
  { type: 'skill', label: 'Skills' },
  { type: 'certification', label: 'Certifications' },
  { type: 'contact', label: 'Contact' },
];

export default function GraphList({ graph, visibleTypes, onJump }: GraphListProps) {
  const isVisible = (type: NodeType) => type === 'profile' || type === 'contact' || visibleTypes[type === 'course' ? 'education' : type];
  return (
    <div className="graph-list">
      <h2>All nodes and connections</h2>
      {groups.map(({ type, label }) => {
        const nodes = graph.nodes.filter((node) => node.type === type && isVisible(type));
        if (nodes.length === 0) return null;
        return (
          <section key={type} className="graph-list__group">
            <h3>{label}</h3>
            <ul>
              {nodes.map((node) => {
                const connections = [...(graph.neighbors.get(node.id) ?? [])]
                  .map((id) => graph.nodeById.get(id))
                  .filter((connected) => connected && isVisible(connected.type));
                return (
                  <li key={node.id} className="graph-list__item">
                    <button type="button" tabIndex={-1} className="connection-link" onClick={() => onJump(node.id)}>
                      {node.fullLabel}
                    </button>
                    {connections.length > 0 && (
                      <span className="graph-list__connections">
                        <span>Connected to </span>
                        {connections.map((connected, index) => connected && (
                          <span key={connected.id}>
                            {index > 0 && ', '}
                            <button type="button" tabIndex={-1} className="connection-link" onClick={() => onJump(connected.id)}>
                              {connected.fullLabel}
                            </button>
                          </span>
                        ))}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
