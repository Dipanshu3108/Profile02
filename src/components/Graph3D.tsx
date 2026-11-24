import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MutableRefObject } from 'react';
import ForceGraph3D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ThinkingOrb } from 'thinking-orbs';
import type { EdgeKind, GraphData, GraphNode, NodeType } from '../lib/graph';
import type { VisibleTypes } from './FilterChips';
import { FOCUS_COLOR, TYPE_COLOR } from './graphColors';

type GNode = NodeObject<GraphNode>;
type GLink = LinkObject<GraphNode, { kind: EdgeKind; id: string; faint: boolean }>;

const MINT = '#8bf5c8';
const BG = '#05070d';
const DIM_LINK = '#131a29';
const FAINT_LINK = '#1b2231';
const KIND_COLOR: Record<EdgeKind, string> = {
  structural: '#4f6a9a',
  'worked-at': '#6ea8ff',
  'part-of': '#8b78c9',
  'studied-in': '#8b78c9',
  'used-in': '#3a4458',
  related: '#4a5a52',
  certified: '#8a6a9a',
};
const KIND_LIT: Record<EdgeKind, string> = {
  structural: '#9cc2ff',
  'worked-at': '#b3d1ff',
  'part-of': '#d4c4ff',
  'studied-in': '#d4c4ff',
  'used-in': '#8bf5c8',
  related: '#c8f5df',
  certified: '#f3c4ff',
};
const LINK_DISTANCE: Record<EdgeKind, number> = {
  structural: 80,
  'worked-at': 55,
  'part-of': 45,
  'studied-in': 32,
  'used-in': 42,
  related: 28,
  certified: 40,
};
/** Skill and certification labels appear only on hover or selection, to keep the canvas calm. */
const hoverOnlyLabel = (node: GraphNode) => (node.type === 'skill' || node.type === 'certification') && !node.focus;
const DEFAULT_CAMERA = { x: 0, y: 60, z: 700 };
/** Furthest the camera may orbit from its target. The owner wants the desktop view no wider than this. */
const MAX_DISTANCE_DESKTOP = 800;
const MAX_DISTANCE_NARROW = 1400;
/**
 * Labels are sized in world units, so the zoomed-out overview (and nodes deep in the scene) shrank
 * them to ~8px. Past this distance from the camera each label grows with its own distance (up to
 * LABEL_ZOOM_MAX times), keeping its on-screen size readable. Close up nothing changes.
 */
const LABEL_ZOOM_REF = 420;
/** The canvas height LABEL_ZOOM_REF was tuned at. */
const LABEL_ZOOM_HEIGHT = 900;
const LABEL_ZOOM_MAX = 3.5;
type Vec3 = { x: number; y: number; z: number };

interface Visual {
  group: THREE.Group;
  core: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
  extras: { obj: THREE.Mesh; mat: THREE.MeshBasicMaterial; base: number }[];
  label: SpriteText;
  /** The label's own scale and offset at zoom factor 1, and the factor applied now. */
  labelBase: { scale: THREE.Vector3; y: number };
  labelZoom: number;
  node: GraphNode;
}

/** Grows a label about its top edge, so it stays clear of the node above it. */
function applyLabelZoom(visual: Visual, factor: number) {
  visual.labelZoom = factor;
  const { scale, y } = visual.labelBase;
  visual.label.scale.set(scale.x * factor, scale.y * factor, scale.z);
  visual.label.position.y = y - (scale.y * (factor - 1)) / 2;
}

let hasSettledOnce = false;

function idOf(end: GLink['source']): string {
  return typeof end === 'object' && end !== null ? String((end as GNode).id) : String(end);
}

/** Gentle self-illumination; kept low so the bloom pass only catches highlights. */
function baseGlow(node: GraphNode): number {
  if (node.focus) return 0.55;
  if (node.type === 'profile') return 0.05;
  if (node.type === 'skill') return 0.12;
  return 0.2;
}

function makeVisual(node: GraphNode): Visual {
  const s = node.size;
  const color = new THREE.Color(node.focus ? FOCUS_COLOR : TYPE_COLOR[node.type]);
  let geometry: THREE.BufferGeometry;
  switch (node.type) {
    case 'profile': geometry = new THREE.IcosahedronGeometry(s, 1); break;
    case 'experience': geometry = new THREE.BoxGeometry(s * 1.4, s * 1.4, s * 1.4); break;
    case 'education': geometry = new THREE.BoxGeometry(s * 1.3, s * 1.3, s * 1.3); break;
    case 'project': geometry = new THREE.CylinderGeometry(s, s, s * 0.7, 6); break;
    case 'contact': geometry = new THREE.OctahedronGeometry(s); break;
    case 'course': geometry = new THREE.TetrahedronGeometry(s * 1.3); break;
    case 'certification': geometry = new THREE.DodecahedronGeometry(s); break;
    default: geometry = new THREE.SphereGeometry(s, 24, 16);
  }
  const coreMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: baseGlow(node),
    roughness: 0.3,
    metalness: 0.2,
    transparent: true,
    flatShading: node.type !== 'skill',
  });
  const core = new THREE.Mesh(geometry, coreMat);
  if (node.type === 'project') core.rotation.x = Math.PI / 2;
  if (node.type === 'education') core.rotation.set(Math.PI / 4, Math.PI / 4, 0);

  const group = new THREE.Group();
  group.add(core);
  const extras: Visual['extras'] = [];
  const addExtra = (obj: THREE.Mesh, mat: THREE.MeshBasicMaterial) => {
    extras.push({ obj, mat, base: mat.opacity });
    group.add(obj);
  };

  if (node.type === 'profile') {
    const mat = new THREE.MeshBasicMaterial({ color: MINT, wireframe: true, transparent: true, opacity: 0.35 });
    addExtra(new THREE.Mesh(new THREE.IcosahedronGeometry(s * 1.55, 1), mat), mat);
  }
  if (node.type === 'profile' || node.focus) {
    const mat = new THREE.MeshBasicMaterial({ color: node.focus ? FOCUS_COLOR : MINT, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(s * 2, Math.max(0.3, s * 0.05), 8, 80), mat);
    ring.rotation.x = Math.PI / 2.4;
    addExtra(ring, mat);
    if (node.focus) {
      const mat2 = new THREE.MeshBasicMaterial({ color: FOCUS_COLOR, transparent: true, opacity: 0.45 });
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(s * 2.6, 0.2, 8, 80), mat2);
      ring2.rotation.y = Math.PI / 2.4;
      addExtra(ring2, mat2);
    }
  }
  if (node.poc) {
    // Proofs of concept get an outlined shell so they read as lighter-weight than shipped projects.
    coreMat.opacity = 0.7;
    const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5 });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(s * 1.5, s * 1.5, s, 6), mat);
    shell.rotation.x = Math.PI / 2;
    addExtra(shell, mat);
  }
  if (node.type === 'experience' || node.type === 'education') {
    const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.25 });
    addExtra(new THREE.Mesh(new THREE.BoxGeometry(s * 2, s * 2, s * 2), mat), mat);
  }

  const label = new SpriteText(
    node.focus ? `✦ ${node.label}` : node.label,
    node.type === 'profile' ? 6.5 : node.type === 'skill' || node.type === 'certification' ? (node.focus ? 4.4 : 3.2) : node.type === 'course' ? 3.4 : 4.2,
    node.focus ? '#e8b65f' : '#c9d0dc',
  );
  label.fontFace = 'Inter Variable, Inter, system-ui, sans-serif';
  label.fontWeight = '600';
  label.backgroundColor = 'rgba(5,7,13,0.55)';
  label.padding = [3, 1.6];
  label.borderRadius = 2.5;
  (label.material as THREE.SpriteMaterial).depthWrite = false;
  label.position.y = -(s * (node.focus || node.type === 'profile' ? 2.4 : 1.6) + 5);
  label.renderOrder = 10;
  label.visible = !hoverOnlyLabel(node);
  group.add(label);

  return { group, core, coreMat, extras, label, labelBase: { scale: label.scale.clone(), y: label.position.y }, labelZoom: 1, node };
}

interface Graph3DProps {
  graph: GraphData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  visibleTypes: VisibleTypes;
  reducedMotion: boolean;
  /** The visitor paused the looping motion: no auto-rotate, everything else unchanged. */
  motionPaused?: boolean;
  resetSignal: number;
}

export default function Graph3D({ graph, selectedId, onSelect, visibleTypes, reducedMotion, motionPaused = false, resetSignal }: Graph3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<GNode, GLink>>(undefined);
  const [api, setApi] = useState<ForceGraphMethods<GNode, GLink> | null>(null);
  const attach = useCallback((instance: ForceGraphMethods<GNode, GLink> | null) => {
    fgRef.current = instance ?? undefined;
    setApi(instance);
  }, []);
  const visuals = useRef(new Map<string, Visual>());
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);
  const [settling, setSettling] = useState(() => !hasSettledOnce && !reducedMotion);
  const [announcement, setAnnouncement] = useState('');
  // Fit the whole graph into view once the first layout settles (unless a node is already selected).
  const fittedRef = useRef(false);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  // Read by the orbit listeners, which are attached once per scene setup.
  const autoRotateRef = useRef(!reducedMotion && !motionPaused);
  autoRotateRef.current = !reducedMotion && !motionPaused;
  // Where the root (profile) node sat once the first layout settled. Reset slides the whole graph so the
  // root is back here; no other positions are kept, so the graph's shape is free to change.
  const rootHomeRef = useRef<Vec3 | null>(null);
  const tweenRef = useRef(0);
  // Fit from the default viewing angle, not the current one: after orbiting, the graph can be much taller
  // on screen, and the zoom-out cap would then crop it. Same maths as zoomToFit, with a fixed direction.
  const fitAll = useCallback((ms: number) => {
    const fg = fgRef.current;
    if (!fg) return;
    const box = fg.getGraphBbox((node) => (node as GNode).type !== 'skill' || (node as GNode).connections > 1);
    if (!box) return;
    const camera = fg.camera() as THREE.PerspectiveCamera;
    const center = new THREE.Vector3((box.x[0] + box.x[1]) / 2, (box.y[0] + box.y[1]) / 2, (box.z[0] + box.z[1]) / 2);
    const back = new THREE.Vector3(DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z).normalize();
    const forward = back.clone().negate();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    const height = Math.max(200, fg.renderer().domElement.clientHeight);
    const vHalf = ((1 - 80 / height) * camera.fov) / 2 * (Math.PI / 180);
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    let distance = 0;
    for (const x of box.x) for (const y of box.y) for (const z of box.z) {
      const local = new THREE.Vector3(x, y, z).sub(center);
      distance = Math.max(distance, Math.max(Math.abs(local.dot(up)) / Math.tan(vHalf), Math.abs(local.dot(right)) / Math.tan(hHalf)) - local.dot(forward));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxDistance = (fg.controls() as any)?.maxDistance ?? Infinity;
    distance = Math.min(distance, maxDistance);
    const position = center.clone().addScaledVector(back, distance);
    fg.cameraPosition({ x: position.x, y: position.y, z: position.z }, { x: center.x, y: center.y, z: center.z }, ms);
  }, []);

  const data = useMemo(() => ({
    nodes: graph.nodes.map((node) => ({ ...node, ...(node.type === 'profile' ? { fx: 0, fy: 0, fz: 0 } : {}) })) as GNode[],
    links: graph.edges.map((edge) => ({ ...edge })) as GLink[],
  }), [graph]);

  const isTypeVisible = useCallback(
    (type: NodeType) => {
      if (type === 'profile' || type === 'contact') return true;
      if (type === 'course') return visibleTypes.education;
      return visibleTypes[type];
    },
    [visibleTypes],
  );

  const activeId = hoverId ?? cursorId ?? selectedId;
  const lit = useMemo(() => {
    if (!activeId) return null;
    return new Set([activeId, ...(graph.neighbors.get(activeId) ?? [])]);
  }, [activeId, graph]);

  // Resize with the container.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // One-time scene setup: forces, bloom, starfield, fog, camera, auto-rotate.
  const ready = size.width > 0;
  useEffect(() => {
    const fg = api;
    if (!fg) return;
    const scene = fg.scene();
    if (scene.userData.portfolioSetup) return;
    scene.userData.portfolioSetup = true;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    (fg.d3Force('charge') as any)
      ?.strength((node: GNode) => (node.type === 'skill' ? -45 : node.type === 'profile' ? -400 : -220))
      // Cap repulsion range so loosely tied nodes aren't pushed out into space.
      .distanceMax(260);
    const degree = (end: GLink['source']) => graph.neighbors.get(idOf(end))?.size ?? 1;
    (fg.d3Force('link') as any)
      ?.distance((link: GLink) => LINK_DISTANCE[link.kind])
      // Generic tools (Git, Python, Docker...) pull at a third of normal strength: enough to keep them
      // close to what uses them, too weak to drag unrelated projects together.
      .strength((link: GLink) => (link.faint ? 0.35 : 1) / Math.min(degree(link.source), degree(link.target)));
    fg.d3ReheatSimulation();

    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.0011);
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1600;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const r = 700 + Math.random() * 1600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x8fa3c9, size: 2, sizeAttenuation: true, transparent: true, opacity: 0.55, fog: false }));
    stars.name = 'stars';
    scene.add(stars);

    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.35, 0.35, 0.82);
    fg.postProcessingComposer().addPass(bloom);
    fg.postProcessingComposer().addPass(new OutputPass());

    fg.cameraPosition(DEFAULT_CAMERA, { x: 0, y: 0, z: 0 }, 0);

    const controls = fg.controls() as any;
    if (controls) {
      controls.autoRotate = autoRotateRef.current;
      controls.autoRotateSpeed = 0.35;
      // Lower speeds + softer damping: the orbit glides instead of snapping to every mouse twitch.
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.rotateSpeed = 0.45;
      controls.zoomSpeed = 0.5;
      controls.panSpeed = 0.5;
      controls.minDistance = 40;
      let resume = 0;
      controls.addEventListener('start', () => {
        controls.autoRotate = false;
        window.clearTimeout(resume);
      });
      controls.addEventListener('end', () => {
        window.clearTimeout(resume);
        if (autoRotateRef.current) resume = window.setTimeout(() => { controls.autoRotate = autoRotateRef.current; }, 5000);
      });
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, [api, reducedMotion, size.width, size.height]);

  // The pause switch can flip while the scene is live.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controls = api?.controls() as any;
    if (controls) controls.autoRotate = !reducedMotion && !motionPaused;
  }, [api, motionPaused, reducedMotion]);

  // Keep the graph centred in the visible area, not under the info card.
  useEffect(() => {
    const fg = api;
    if (!fg) return;
    const desktop = size.width > 860;
    // Zoom-out limit: OrbitControls clamps every update, so fits and scroll-zoom both stop here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controls = fg.controls() as any;
    if (controls) controls.maxDistance = desktop ? MAX_DISTANCE_DESKTOP : MAX_DISTANCE_NARROW;
    const cardWidth = Math.min(420, size.width * 0.34) + 32;
    const apply = () => {
      const camera = fg.camera() as THREE.PerspectiveCamera;
      camera.setViewOffset(
        size.width,
        size.height,
        desktop ? cardWidth / 2 : 0,
        desktop ? 0 : size.height * 0.22,
        size.width,
        size.height,
      );
      camera.updateProjectionMatrix();
    };
    apply();
    // The renderer clears view offsets on its first deferred update, so apply again after it.
    const timer = window.setTimeout(apply, 120);
    return () => window.clearTimeout(timer);
  }, [api, size.width, size.height]);

  // Hide the loading orb once the layout has mostly settled.
  useEffect(() => {
    if (!settling) return;
    const timer = window.setTimeout(() => {
      hasSettledOnce = true;
      setSettling(false);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [settling]);

  // Idle life: spinning shells, rings and a pulsing selection.
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      visuals.current.forEach((visual) => {
        const { node, core, extras, group } = visual;
        if (node.type === 'profile') {
          core.rotation.y = t * 0.3;
          core.rotation.x = t * 0.12;
          extras.forEach((extra, i) => { extra.obj.rotation.z = (i % 2 ? -1 : 1) * t * 0.25; extra.obj.rotation.y = t * 0.15; });
        } else if (node.type === 'project') {
          core.rotation.z = t * 0.5;
        } else if (node.type === 'experience' || node.type === 'education') {
          core.rotation.y = t * 0.35;
          extras.forEach((extra) => { extra.obj.rotation.x = t * 0.2; extra.obj.rotation.y = -t * 0.25; });
        } else if (node.type === 'contact') {
          core.rotation.y = t * 0.8;
        }
        if (node.focus) {
          extras.forEach((extra, i) => { extra.obj.rotation.z = (i ? -1 : 1) * t * 0.6; });
          core.scale.setScalar(1 + Math.sin(t * 2.2) * 0.08);
        }
        const target = node.id === selectedId ? 1.15 + Math.sin(t * 4) * 0.05 : 1;
        group.scale.setScalar(group.scale.x + (target - group.scale.x) * 0.15);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, selectedId]);

  // Hover/selection dimming on node materials and labels.
  useEffect(() => {
    visuals.current.forEach((visual) => {
      const on = !lit || lit.has(visual.node.id);
      const opacity = on ? 1 : 0.1;
      visual.coreMat.opacity = opacity;
      const glow = baseGlow(visual.node);
      visual.coreMat.emissiveIntensity = !on ? glow * 0.3 : lit && visual.node.type === 'skill' ? glow + 0.25 : glow;
      visual.extras.forEach((extra) => { extra.mat.opacity = extra.base * (on ? 1 : 0.15); });
      const labelMat = visual.label.material as THREE.SpriteMaterial;
      labelMat.opacity = on ? 1 : 0.12;
      visual.label.visible = !hoverOnlyLabel(visual.node) || Boolean(lit && on);
    });
    if (reducedMotion) {
      visuals.current.forEach((visual) => visual.group.scale.setScalar(visual.node.id === selectedId ? 1.15 : 1));
    }
  }, [lit, reducedMotion, selectedId]);

  // Fly the camera to the selected node.
  useEffect(() => {
    const fg = api;
    if (!fg || !selectedId) return;
    let attempts = 0;
    let timer = 0;
    const fly = () => {
      const node = data.nodes.find((item) => item.id === selectedId);
      if (!node) return;
      if (!Number.isFinite(node.x) && attempts < 10) {
        attempts += 1;
        timer = window.setTimeout(fly, 250);
        return;
      }
      const { x = 0, y = 0, z = 0 } = node;
      const camera = fg.camera().position;
      const dx = camera.x - x;
      const dy = camera.y - y;
      const dz = camera.z - z;
      const len = Math.hypot(dx, dy, dz) || 1;
      const narrow = size.width < 860;
      const distance = (70 + node.size * 9) * (narrow ? 1.9 : 1);
      fg.cameraPosition(
        { x: x + (dx / len) * distance, y: y + (dy / len) * distance, z: z + (dz / len) * distance },
        { x, y, z },
        reducedMotion ? 0 : 1200,
      );
    };
    timer = window.setTimeout(fly, hasSettledOnce ? 0 : 600);
    return () => window.clearTimeout(timer);
  }, [api, data, reducedMotion, selectedId, size.width]);

  const unpinAll = useCallback(() => {
    for (const node of data.nodes) {
      node.fx = undefined;
      node.fy = undefined;
      node.fz = undefined;
    }
  }, [data]);

  // Reset: slide the whole graph, shape unchanged, until the root is back at its saved spot, then refit.
  useEffect(() => {
    if (!resetSignal) return;
    setCursorId(null);
    const fg = fgRef.current;
    const rootHome = rootHomeRef.current;
    const root = data.nodes.find((node) => node.type === 'profile');
    if (!fg || !rootHome || !root) {
      fitAll(reducedMotion ? 0 : 1000);
      return;
    }
    cancelAnimationFrame(tweenRef.current);
    const shift = { x: rootHome.x - (root.x ?? 0), y: rootHome.y - (root.y ?? 0), z: rootHome.z - (root.z ?? 0) };
    const moves = data.nodes.map((node) => ({ node, from: { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 } }));
    const place = (t: number) => {
      for (const { node, from } of moves) {
        node.fx = from.x + shift.x * t;
        node.fy = from.y + shift.y * t;
        node.fz = from.z + shift.z * t;
      }
    };
    // Pinned only for the slide; then every node is released again.
    const release = () => {
      tweenRef.current = 0;
      for (const { node } of moves) {
        node.vx = 0;
        node.vy = 0;
        node.vz = 0;
      }
      unpinAll();
      fitAll(reducedMotion ? 0 : 900);
    };
    // Pinned nodes follow fx/fy/fz on every tick, so keep the engine ticking while they travel.
    fg.d3ReheatSimulation();
    if (reducedMotion) {
      place(1);
      window.setTimeout(release, 50);
      return;
    }
    const duration = 900;
    const start = performance.now();
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      place(ease(t));
      if (t < 1) tweenRef.current = requestAnimationFrame(step);
      else release();
    };
    tweenRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(tweenRef.current);
  }, [data, fitAll, reducedMotion, resetSignal, unpinAll]);

  const nodeThreeObject = useCallback((node: GNode) => {
    const existing = visuals.current.get(String(node.id));
    if (existing) return existing.group;
    const visual = makeVisual(node as GraphNode);
    visuals.current.set(String(node.id), visual);
    return visual.group;
  }, []);

  // Keep labels readable from far away: each frame, size every visible label by its own distance
  // from the camera, touching only the ones whose factor actually changed.
  useEffect(() => {
    const fg = api;
    if (!fg) return;
    const camera = fg.camera();
    const at = new THREE.Vector3();
    // Perspective size follows the canvas height, so the reference distance does too: a label then
    // holds roughly the same pixel height (~13px) on a short phone canvas and a tall desktop one.
    const reference = LABEL_ZOOM_REF * Math.max(0.5, (size.height || LABEL_ZOOM_HEIGHT) / LABEL_ZOOM_HEIGHT);
    let frame = 0;
    const tick = () => {
      visuals.current.forEach((visual) => {
        if (!visual.label.visible) return;
        visual.group.getWorldPosition(at);
        const factor = Math.min(LABEL_ZOOM_MAX, Math.max(1, camera.position.distanceTo(at) / reference));
        if (Math.abs(factor - visual.labelZoom) > 0.02) applyLabelZoom(visual, factor);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [api, size.height]);

  const linkLit = useCallback((link: GLink) => {
    if (!lit || !activeId) return false;
    const s = idOf(link.source);
    const t = idOf(link.target);
    return (s === activeId || t === activeId) && lit.has(s) && lit.has(t);
  }, [activeId, lit]);

  // Keyboard: arrows walk the neighbours of the current anchor, Enter opens, Escape clears.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const anchor = selectedId ?? 'profile';
    const ring = [...(graph.neighbors.get(anchor) ?? [])]
      .map((id) => graph.nodeById.get(id))
      .filter((node): node is GraphNode => Boolean(node && isTypeVisible(node.type)));
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      if (ring.length === 0) return;
      const index = ring.findIndex((node) => node.id === cursorId);
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = ring[(index + step + ring.length) % ring.length] ?? ring[0];
      setCursorId(next.id);
      setAnnouncement(`${next.fullLabel}, ${next.type}. Press Enter to open.`);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const target = cursorId ?? anchor;
      onSelect(target);
      setCursorId(null);
      setAnnouncement(`Opened ${graph.nodeById.get(target)?.fullLabel ?? target}.`);
    } else if (event.key === 'Escape') {
      setCursorId(null);
      onSelect(null);
      setAnnouncement('Selection cleared.');
    }
  };

  return (
    <div
      ref={wrapRef}
      className="graph3d"
      tabIndex={0}
      role="application"
      aria-roledescription="3D knowledge graph"
      aria-label="Knowledge graph. Use arrow keys to move between connected nodes, Enter to open, Escape to clear."
      onKeyDown={onKeyDown}
      onBlur={() => setCursorId(null)}
    >
      {ready && (
        <ForceGraph3D<GraphNode, { kind: EdgeKind; id: string; faint: boolean }>
          ref={attach as unknown as MutableRefObject<ForceGraphMethods<GNode, GLink> | undefined>}
          width={size.width}
          height={size.height}
          graphData={data}
          backgroundColor={BG}
          showNavInfo={false}
          controlType="orbit"
          rendererConfig={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          nodeId="id"
          nodeLabel={() => ''}
          nodeThreeObject={nodeThreeObject}
          nodeVisibility={(node) => isTypeVisible((node as GNode).type)}
          linkVisibility={(link) => {
            const s = graph.nodeById.get(idOf((link as GLink).source));
            const t = graph.nodeById.get(idOf((link as GLink).target));
            return Boolean(s && t && isTypeVisible(s.type) && isTypeVisible(t.type));
          }}
          linkColor={(link) => {
            const l = link as GLink;
            if (linkLit(l)) return KIND_LIT[l.kind];
            if (lit) return DIM_LINK;
            return l.faint ? FAINT_LINK : KIND_COLOR[l.kind];
          }}
          linkOpacity={0.55}
          linkWidth={(link) => (linkLit(link as GLink) ? 0.9 : 0)}
          linkCurvature={0.18}
          linkCurveRotation={(link) => ((idOf((link as GLink).source).length * 7) % 6) / 6 * Math.PI}
          linkDirectionalParticles={(link) => {
            if (reducedMotion) return 0;
            if (linkLit(link as GLink)) return 4;
            return lit || (link as GLink).faint ? 0 : 1;
          }}
          linkDirectionalParticleSpeed={(link) => (linkLit(link as GLink) ? 0.012 : 0.004)}
          linkDirectionalParticleWidth={(link) => (linkLit(link as GLink) ? 1.8 : 1)}
          linkDirectionalParticleColor={(link) => (linkLit(link as GLink) ? '#ffffff' : KIND_LIT[(link as GLink).kind])}
          warmupTicks={reducedMotion || hasSettledOnce ? 300 : 30}
          cooldownTime={reducedMotion ? 0 : 4000}
          d3VelocityDecay={0.55}
          onNodeHover={(node) => setHoverId(node ? String(node.id) : null)}
          onNodeClick={(node) => onSelect(String(node.id))}
          onBackgroundClick={() => onSelect(null)}
          onEngineStop={() => {
            if (fittedRef.current) return;
            fittedRef.current = true;
            const root = data.nodes.find((node) => node.type === 'profile');
            if (root) rootHomeRef.current = { x: root.x ?? 0, y: root.y ?? 0, z: root.z ?? 0 };
            // From here the graph is free: nothing is pinned and dropped nodes stay where physics settles them.
            // The built-in centring force is removed too: it snaps the graph's average position to the origin
            // every tick, which would undo Reset's slide back to the root. The links keep the graph together.
            fgRef.current?.d3Force('center', null);
            unpinAll();
            if (!selectedRef.current) fitAll(reducedMotion ? 0 : 900);
          }}
          onNodeDrag={() => {
            // Grabbing a node mid-reset stops the glide and frees the rest of the graph.
            if (!tweenRef.current) return;
            cancelAnimationFrame(tweenRef.current);
            tweenRef.current = 0;
            unpinAll();
          }}
          onNodeDragEnd={(node) => {
            // Never leave the dropped node pinned (it can be, if it was grabbed mid-reset).
            node.fx = undefined;
            node.fy = undefined;
            node.fz = undefined;
          }}
        />
      )}
      {settling && (
        <div className="graph3d__loading">
          <ThinkingOrb state="connecting" size={64} theme="auto" />
        </div>
      )}
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {cursorId && (
        <div className="graph3d__cursor" aria-hidden="true">
          {graph.nodeById.get(cursorId)?.fullLabel} <kbd>Enter</kbd>
        </div>
      )}
    </div>
  );
}
