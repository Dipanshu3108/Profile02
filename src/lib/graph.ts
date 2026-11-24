import type { Content } from '../types';

export type NodeType = 'profile' | 'experience' | 'education' | 'course' | 'project' | 'skill' | 'certification' | 'contact';
export type EdgeKind =
  | 'structural' // profile to role, degree, contact
  | 'worked-at' // project to role
  | 'part-of' // course to degree, or project to degree when it has no course
  | 'studied-in' // project to course
  | 'used-in' // skill to project or role
  | 'related' // skill to skill
  | 'certified'; // certification to profile or skill

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  fullLabel: string;
  /** World-space size used by the 3D renderer. */
  size: number;
  connections: number;
  focus: boolean;
  /** Generic tool skill: drawn faintly and pulls weakly on the layout. */
  generic: boolean;
  /** Proof of concept (projects only). */
  poc: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  faint: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeById: Map<string, GraphNode>;
  neighbors: Map<string, Set<string>>;
}

function compactLabel(value: string, max = 22): string {
  const withoutSubtitle = value.split(':')[0].split(' (')[0];
  if (withoutSubtitle.length <= max) return withoutSubtitle;
  const words = withoutSubtitle.split(' ');
  let label = words[0];
  for (const word of words.slice(1)) {
    if (`${label} ${word}`.length > max - 1) break;
    label += ` ${word}`;
  }
  return `${label}…`;
}

function educationLabel(degree: string): string {
  return degree
    .replace('Master of Science in ', 'MS ')
    .replace('Bachelor of Science in ', 'BS ')
    .replace('Computer Science', 'CS');
}

export function buildGraph(content: Content): GraphData {
  const focus = new Set(content.profile.focusSkills ?? []);
  const base = { connections: 0, focus: false, generic: false, poc: false };
  const nodes: GraphNode[] = [
    { ...base, id: 'profile', type: 'profile', label: content.profile.name, fullLabel: content.profile.name, size: 15 },
    { ...base, id: 'contact', type: 'contact', label: 'Contact', fullLabel: 'Contact', size: 6 },
    ...content.experience.map((item) => ({
      ...base,
      id: item.id,
      type: 'experience' as const,
      label: `${item.role} · ${item.organization}`,
      fullLabel: `${item.role}, ${item.organization}`,
      size: 10,
    })),
    ...content.education.map((item) => ({
      ...base,
      id: item.id,
      type: 'education' as const,
      label: educationLabel(item.degree),
      fullLabel: item.degree,
      size: 8,
    })),
    ...(content.courses ?? []).map((item) => ({
      ...base,
      id: item.id,
      type: 'course' as const,
      label: item.code,
      fullLabel: `${item.code}: ${item.name}`,
      size: 4,
    })),
    ...content.projects.map((item) => ({
      ...base,
      id: item.id,
      type: 'project' as const,
      label: compactLabel(item.title),
      fullLabel: item.title,
      size: item.kind === 'poc' ? 5.5 : 7,
      poc: item.kind === 'poc',
    })),
    ...(content.certifications ?? []).map((item) => ({
      ...base,
      id: item.id,
      type: 'certification' as const,
      label: item.name,
      fullLabel: item.name,
      size: 3,
    })),
    ...content.skills.map((item) => ({
      ...base,
      id: item.id,
      type: 'skill' as const,
      label: item.label,
      fullLabel: item.label,
      size: 2,
      focus: focus.has(item.id),
      generic: Boolean(item.generic),
    })),
  ];

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();
  const neighbors = new Map<string, Set<string>>();

  const addEdge = (source: string, target: string, kind: EdgeKind) => {
    if (!nodeById.has(source) || !nodeById.has(target) || source === target) return;
    const key = [source, target].sort().join('|');
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    const faint = Boolean(nodeById.get(source)?.generic || nodeById.get(target)?.generic);
    edges.push({ id: `${source}|${target}|${kind}`, source, target, kind, faint });
    if (!neighbors.has(source)) neighbors.set(source, new Set());
    if (!neighbors.has(target)) neighbors.set(target, new Set());
    neighbors.get(source)?.add(target);
    neighbors.get(target)?.add(source);
  };

  for (const item of content.experience) addEdge('profile', item.id, 'structural');
  for (const item of content.education) addEdge('profile', item.id, 'structural');
  addEdge('profile', 'contact', 'structural');

  for (const project of content.projects) {
    if (project.experienceId) addEdge(project.id, project.experienceId, 'worked-at');
    if (project.courseId) {
      addEdge(project.id, project.courseId, 'studied-in');
      if (project.educationId) addEdge(project.courseId, project.educationId, 'part-of');
    } else if (project.educationId) {
      addEdge(project.id, project.educationId, 'part-of');
    }
    for (const skillId of project.skills) addEdge(skillId, project.id, 'used-in');
  }
  for (const role of content.experience) {
    for (const skillId of role.skills) addEdge(skillId, role.id, 'used-in');
  }
  for (const [a, b] of content.skillRelations ?? []) addEdge(a, b, 'related');
  for (const cert of content.certifications ?? []) {
    addEdge(cert.id, 'profile', 'certified');
    for (const skillId of cert.skills) addEdge(cert.id, skillId, 'certified');
  }

  for (const node of nodes) {
    node.connections = neighbors.get(node.id)?.size ?? 0;
    if (node.type === 'skill') {
      node.size = Math.min(6, 1.8 + node.connections * 0.6);
      if (node.generic) node.size = Math.min(node.size, 3);
      if (node.focus) node.size = Math.max(node.size, 6.5);
    }
  }

  return { nodes, edges, nodeById, neighbors };
}
