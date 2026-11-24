import type { EdgeKind, NodeType } from '../lib/graph';
import type { Theme } from '../lib/theme';

/** Everything the 3D scene paints, per theme. Dark is the original look; light is warm sand and sage. */
export interface GraphPalette {
  type: Record<NodeType, string>;
  focus: string;
  /** The profile node's wireframe shell and ring. */
  ring: string;
  background: string;
  fogDensity: number;
  stars: { color: string; opacity: number };
  /** Bloom only works on a dark ground: on sand every pixel is past the threshold, so light turns it off. */
  bloom: number;
  /** Multiplier on each node's self-illumination. Light keeps it low so colours stay saturated. */
  glow: number;
  linkOpacity: number;
  link: Record<EdgeKind, string>;
  linkLit: Record<EdgeKind, string>;
  linkDim: string;
  linkFaint: string;
  particleLit: string;
  label: { ink: string; focus: string; background: string };
}

export const GRAPH_PALETTE: Record<Theme, GraphPalette> = {
  dark: {
    type: {
      profile: '#f1e6cf',
      experience: '#6ea8ff',
      education: '#b79cff',
      course: '#d4c4ff',
      project: '#8bf5c8',
      skill: '#7d8db3',
      certification: '#f0a6ff',
      contact: '#ffb3a7',
    },
    focus: '#f5c26b',
    ring: '#8bf5c8',
    background: '#05070d',
    fogDensity: 0.0011,
    stars: { color: '#8fa3c9', opacity: 0.55 },
    bloom: 0.35,
    glow: 1,
    linkOpacity: 0.55,
    link: {
      structural: '#4f6a9a',
      'worked-at': '#6ea8ff',
      'part-of': '#8b78c9',
      'studied-in': '#8b78c9',
      'used-in': '#3a4458',
      related: '#4a5a52',
      certified: '#8a6a9a',
    },
    linkLit: {
      structural: '#9cc2ff',
      'worked-at': '#b3d1ff',
      'part-of': '#d4c4ff',
      'studied-in': '#d4c4ff',
      'used-in': '#8bf5c8',
      related: '#c8f5df',
      certified: '#f3c4ff',
    },
    linkDim: '#131a29',
    linkFaint: '#1b2231',
    particleLit: '#ffffff',
    label: { ink: '#c9d0dc', focus: '#e8b65f', background: 'rgba(5,7,13,0.55)' },
  },
  light: {
    // Deeper, more saturated than the dark set: on sand, pastel nodes read as faded.
    type: {
      profile: '#c75f38',
      experience: '#2f62b3',
      education: '#6a48c2',
      course: '#8b6fd6',
      project: '#17885e',
      skill: '#8c8577',
      certification: '#b23d98',
      contact: '#d9572f',
    },
    focus: '#d48806',
    ring: '#17885e',
    background: '#f4ede2',
    // Fog fades toward the ground colour: harmless on black, but on sand it washes everything out.
    fogDensity: 0.00028,
    stars: { color: '#b3a284', opacity: 0.5 },
    bloom: 0,
    glow: 0.3,
    linkOpacity: 0.8,
    link: {
      structural: '#6d82ab',
      'worked-at': '#4f80cc',
      'part-of': '#8f78cf',
      'studied-in': '#8f78cf',
      'used-in': '#a3957a',
      related: '#7ea58c',
      certified: '#c47cb4',
    },
    linkLit: {
      structural: '#1f4f9c',
      'worked-at': '#1f5bc0',
      'part-of': '#5536b0',
      'studied-in': '#5536b0',
      'used-in': '#0f7a50',
      related: '#2f7553',
      certified: '#8f2f7c',
    },
    linkDim: '#e0d5c3',
    linkFaint: '#d3c7b2',
    particleLit: '#2a251e',
    label: { ink: '#2a251e', focus: '#8a5508', background: 'rgba(250,246,239,0.86)' },
  },
};
