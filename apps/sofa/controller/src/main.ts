import { type Point, type CurvePoint, TAU, normAngles, sampleCurvePoints, closestOnCurve, evalCurve } from './curve';
import { type ABC, computeLambda, solveFromLambda, solveWithPassthrough } from './solver';
import { drawCircle, drawLine, drawCurveVis, drawSpeedGraph, drawGrid } from './render';

// --- Canvas ---
const canvas = document.getElementById('view') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const info = document.getElementById('info')!;
const stateEl = document.getElementById('state')!;
const stateInput = document.getElementById('state-input') as HTMLInputElement;

let W: number;
let H: number;

function resize() {
  const dpr = devicePixelRatio;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resize();
addEventListener('resize', resize);

// --- Camera ---
let camX = 0;
let camY = 0.55;
let camScale = 185;

function toScreen(p: Point): Point {
  return { x: W / 2 + (p.x - camX) * camScale, y: H / 2 - (p.y - camY) * camScale };
}

function toWorld(sx: number, sy: number): Point {
  return { x: camX + (sx - W / 2) / camScale, y: camY - (sy - H / 2) / camScale };
}

// --- Hull state ---
interface ControlNode {
  point: Point;
  angle: number;
}

interface VisibleNode {
  index: number;
  point: Point;
  angle: number;
  sourceIndex: number;
  mirrored: boolean;
  pinnedY: number | null;
  handleLocked: boolean;
}

interface ArcSegmentDef {
  kind: 'arc';
  index: number;
  from: number;
  to: number;
  lambdaIndex: number;
}

interface LineSegmentDef {
  kind: 'line';
  index: number;
  from: number;
  to: number;
}

type SegmentDef = ArcSegmentDef | LineSegmentDef;

interface ArcRenderState {
  def: ArcSegmentDef;
  from: VisibleNode;
  to: VisibleNode;
  at1: number;
  at2: number;
  solution: (ABC & { tStar?: number }) | null;
  curvePts: CurvePoint[];
  minS: number | null;
  maxS: number | null;
}

type DragState =
  | { kind: 'pan'; start: { x: number; y: number; camX: number; camY: number } }
  | { kind: 'point'; index: number }
  | { kind: 'handle'; index: number }
  | { kind: 'arc'; segmentIndex: number; lambdaIndex: number; pStar: Point; tStarHint: number; lastSolveC: number | null };

type Hit =
  | { kind: 'point'; index: number }
  | { kind: 'handle'; index: number }
  | { kind: 'arc'; segmentIndex: number; t: number }
  | null;

const HANDLE_LEN = 0.46;
const HANDLE_R = 8;
const POINT_R = 8;
const CURVE_HIT_DIST = 12;
const X_GAP = 0.04;
const Y_GAP = 0.04;
const ANGLE_GAP = 0.04;

const ARC_COLORS = ['#72d3ff', '#7ae7c3', '#e2e46e', '#ffcd76'];

let controls: ControlNode[] = [
  { point: { x: 2.08, y: 0 }, angle: 2.2 },
  { point: { x: 1.66512196490524, y: 0.4416042324044667 }, angle: 2.45 },
  { point: { x: 1.1538868476866024, y: 0.7668375901709685 }, angle: 2.7 },
  { point: { x: 0.5780807718056917, y: 0.9554786383557533 }, angle: 2.95 },
  { point: { x: 0.11535373871839627, y: 1 }, angle: Math.PI }
];

let lambdas = [0.5, 0.5, 0.5, 0.5];

const SEGMENTS: SegmentDef[] = [
  { kind: 'arc', index: 0, from: 0, to: 1, lambdaIndex: 0 },
  { kind: 'arc', index: 1, from: 1, to: 2, lambdaIndex: 1 },
  { kind: 'arc', index: 2, from: 2, to: 3, lambdaIndex: 2 },
  { kind: 'arc', index: 3, from: 3, to: 4, lambdaIndex: 3 },
  { kind: 'line', index: 4, from: 4, to: 5 },
  { kind: 'arc', index: 5, from: 5, to: 6, lambdaIndex: 3 },
  { kind: 'arc', index: 6, from: 6, to: 7, lambdaIndex: 2 },
  { kind: 'arc', index: 7, from: 7, to: 8, lambdaIndex: 1 },
  { kind: 'arc', index: 8, from: 8, to: 9, lambdaIndex: 0 }
];

const ARC_SEGMENTS = SEGMENTS.filter((segment): segment is ArcSegmentDef => segment.kind === 'arc');
const ARC_SEGMENT_MAP = new Map(ARC_SEGMENTS.map(segment => [segment.index, segment] as const));

let dragging: DragState | null = null;
let hoveredArcSegment: number | null = null;
let focusedArcSegment = 0;
let arcRenderStates = new Map<number, ArcRenderState>();

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function wrapTau(angle: number) {
  let value = angle % TAU;
  if (value < 0) value += TAU;
  return value;
}

function tangentHandle(p: Point, angle: number): Point {
  return { x: p.x + HANDLE_LEN * Math.cos(angle), y: p.y + HANDLE_LEN * Math.sin(angle) };
}

function mirroredAngle(angle: number) {
  return angle === Math.PI ? Math.PI : TAU - angle;
}

function buildVisibleNodes(): VisibleNode[] {
  return [
    { index: 0, point: controls[0].point, angle: controls[0].angle, sourceIndex: 0, mirrored: false, pinnedY: 0, handleLocked: false },
    { index: 1, point: controls[1].point, angle: controls[1].angle, sourceIndex: 1, mirrored: false, pinnedY: null, handleLocked: false },
    { index: 2, point: controls[2].point, angle: controls[2].angle, sourceIndex: 2, mirrored: false, pinnedY: null, handleLocked: false },
    { index: 3, point: controls[3].point, angle: controls[3].angle, sourceIndex: 3, mirrored: false, pinnedY: null, handleLocked: false },
    { index: 4, point: controls[4].point, angle: Math.PI, sourceIndex: 4, mirrored: false, pinnedY: 1, handleLocked: true },
    { index: 5, point: { x: -controls[4].point.x, y: controls[4].point.y }, angle: Math.PI, sourceIndex: 4, mirrored: true, pinnedY: 1, handleLocked: true },
    { index: 6, point: { x: -controls[3].point.x, y: controls[3].point.y }, angle: mirroredAngle(controls[3].angle), sourceIndex: 3, mirrored: true, pinnedY: null, handleLocked: false },
    { index: 7, point: { x: -controls[2].point.x, y: controls[2].point.y }, angle: mirroredAngle(controls[2].angle), sourceIndex: 2, mirrored: true, pinnedY: null, handleLocked: false },
    { index: 8, point: { x: -controls[1].point.x, y: controls[1].point.y }, angle: mirroredAngle(controls[1].angle), sourceIndex: 1, mirrored: true, pinnedY: null, handleLocked: false },
    { index: 9, point: { x: -controls[0].point.x, y: controls[0].point.y }, angle: mirroredAngle(controls[0].angle), sourceIndex: 0, mirrored: true, pinnedY: 0, handleLocked: false }
  ];
}

function preferredArcForNode(index: number) {
  const outgoing = ARC_SEGMENTS.find(segment => segment.from === index);
  if (outgoing) return outgoing.index;
  const incoming = ARC_SEGMENTS.find(segment => segment.to === index);
  return incoming ? incoming.index : 0;
}

function sourcePointFromVisible(node: VisibleNode, world: Point): Point {
  return node.mirrored ? { x: -world.x, y: world.y } : world;
}

function applyPointConstraints(sourceIndex: number, target: Point): Point {
  const minX = sourceIndex === controls.length - 1 ? X_GAP : controls[sourceIndex + 1].point.x + X_GAP;
  const maxX = sourceIndex === 0 ? Number.POSITIVE_INFINITY : controls[sourceIndex - 1].point.x - X_GAP;
  const x = clamp(Math.max(X_GAP, target.x), minX, maxX);

  if (sourceIndex === 0) return { x, y: 0 };
  if (sourceIndex === controls.length - 1) return { x, y: 1 };

  const minY = controls[sourceIndex - 1].point.y + Y_GAP;
  const maxY = controls[sourceIndex + 1].point.y - Y_GAP;
  return { x, y: clamp(target.y, minY, maxY) };
}

function applyAngleConstraints(sourceIndex: number, rawAngle: number) {
  if (sourceIndex === controls.length - 1) return;
  const minAngle = sourceIndex === 0 ? Math.PI / 2 + ANGLE_GAP : controls[sourceIndex - 1].angle + ANGLE_GAP;
  const maxAngle = sourceIndex === controls.length - 2 ? Math.PI - ANGLE_GAP : controls[sourceIndex + 1].angle - ANGLE_GAP;
  controls[sourceIndex].angle = clamp(wrapTau(rawAngle), minAngle, maxAngle);
}

function nodeColor(node: VisibleNode) {
  if (node.index === 4 || node.index === 5) return '#ffe29a';
  return node.mirrored ? '#ffb08a' : '#79ddff';
}

function solveArc(def: ArcSegmentDef, nodes: VisibleNode[], drag: Extract<DragState, { kind: 'arc' }> | null): ArcRenderState {
  const from = nodes[def.from];
  const to = nodes[def.to];
  const [at1, at2] = normAngles(from.angle, to.angle);

  const solution = drag && drag.segmentIndex === def.index
    ? solveWithPassthrough(at1, at2, from.point, to.point, drag.pStar, drag.tStarHint, drag.lastSolveC)
    : solveFromLambda(at1, at2, from.point, to.point, lambdas[def.lambdaIndex]);

  return {
    def,
    from,
    to,
    at1,
    at2,
    solution,
    curvePts: solution ? sampleCurvePoints(at1, at2, solution.a, solution.b, solution.c, from.point, 160) : [],
    minS: null,
    maxS: null
  };
}

function closestArcHit(sx: number, sy: number): { segmentIndex: number; t: number; dist: number } | null {
  let best: { segmentIndex: number; t: number; dist: number } | null = null;
  for (const state of arcRenderStates.values()) {
    if (state.curvePts.length === 0) continue;
    const hit = closestOnCurve(sx, sy, state.curvePts, toScreen);
    if (hit.dist >= CURVE_HIT_DIST) continue;
    if (!best || hit.dist < best.dist) best = { segmentIndex: state.def.index, t: hit.t, dist: hit.dist };
  }
  return best;
}

function hitTest(sx: number, sy: number): Hit {
  const nodes = buildVisibleNodes();

  for (const node of nodes) {
    if (node.handleLocked) continue;
    const handle = toScreen(tangentHandle(node.point, node.angle));
    if (Math.hypot(sx - handle.x, sy - handle.y) < HANDLE_R + 4) {
      return { kind: 'handle', index: node.index };
    }
  }

  for (const node of nodes) {
    const screenPoint = toScreen(node.point);
    if (Math.hypot(sx - screenPoint.x, sy - screenPoint.y) < POINT_R + 4) {
      return { kind: 'point', index: node.index };
    }
  }

  const arcHit = closestArcHit(sx, sy);
  return arcHit ? { kind: 'arc', segmentIndex: arcHit.segmentIndex, t: arcHit.t } : null;
}

function serializeState() {
  return JSON.stringify({ controls, lambdas });
}

canvas.addEventListener('pointerdown', e => {
  const hit = hitTest(e.offsetX, e.offsetY);

  if (hit?.kind === 'point') {
    dragging = { kind: 'point', index: hit.index };
    focusedArcSegment = preferredArcForNode(hit.index);
  } else if (hit?.kind === 'handle') {
    dragging = { kind: 'handle', index: hit.index };
    focusedArcSegment = preferredArcForNode(hit.index);
  } else if (hit?.kind === 'arc') {
    const state = arcRenderStates.get(hit.segmentIndex);
    if (state?.solution) {
      const onCurve = evalCurve(state.at1, hit.t, state.solution.a, state.solution.b, state.solution.c, state.from.point);
      dragging = {
        kind: 'arc',
        segmentIndex: hit.segmentIndex,
        lambdaIndex: state.def.lambdaIndex,
        pStar: onCurve,
        tStarHint: hit.t,
        lastSolveC: state.solution.c
      };
      focusedArcSegment = hit.segmentIndex;
    }
  }

  if (!dragging) {
    dragging = {
      kind: 'pan',
      start: { x: e.offsetX, y: e.offsetY, camX, camY }
    };
  }

  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', e => {
  if (!dragging) {
    const hit = hitTest(e.offsetX, e.offsetY);
    hoveredArcSegment = hit?.kind === 'arc' ? hit.segmentIndex : null;
    canvas.style.cursor = hit ? 'pointer' : 'default';
    return;
  }

  const sx = e.offsetX;
  const sy = e.offsetY;
  const world = toWorld(sx, sy);

  if (dragging.kind === 'pan') {
    camX = dragging.start.camX - (sx - dragging.start.x) / camScale;
    camY = dragging.start.camY + (sy - dragging.start.y) / camScale;
    return;
  }

  const nodes = buildVisibleNodes();

  if (dragging.kind === 'point') {
    const node = nodes[dragging.index];
    const target = sourcePointFromVisible(node, world);
    controls[node.sourceIndex].point = applyPointConstraints(node.sourceIndex, target);
    return;
  }

  if (dragging.kind === 'handle') {
    const node = nodes[dragging.index];
    const center = node.point;
    const visibleAngle = Math.atan2(world.y - center.y, world.x - center.x);
    const sourceAngle = node.mirrored ? wrapTau(TAU - wrapTau(visibleAngle)) : wrapTau(visibleAngle);
    applyAngleConstraints(node.sourceIndex, sourceAngle);
    return;
  }

  const def = ARC_SEGMENT_MAP.get(dragging.segmentIndex);
  if (!def) return;
  const candidate = world;
  const state = solveArc(def, nodes, { ...dragging, pStar: candidate });
  if (state.solution) {
    dragging.pStar = candidate;
    dragging.tStarHint = state.solution.tStar ?? dragging.tStarHint;
    dragging.lastSolveC = state.solution.c;
  }
});

canvas.addEventListener('pointerup', () => {
  if (dragging?.kind === 'arc') {
    const def = ARC_SEGMENT_MAP.get(dragging.segmentIndex);
    if (def) {
      const nodes = buildVisibleNodes();
      const state = solveArc(def, nodes, dragging);
      if (state.solution) {
        lambdas[dragging.lambdaIndex] = computeLambda(
          state.at1,
          state.at2,
          state.from.point,
          state.to.point,
          state.solution.a,
          state.solution.b,
          state.solution.c
        );
      }
    }
  }

  dragging = null;
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camScale *= Math.pow(1.001, -e.deltaY);
  camScale = Math.max(20, Math.min(2000, camScale));
}, { passive: false });

stateInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  try {
    const parsed = JSON.parse(stateInput.value);
    if (Array.isArray(parsed.controls) && parsed.controls.length === 5) {
      controls = parsed.controls.map((control: ControlNode, index: number) => ({
        point: applyPointConstraints(index, {
          x: Number(control.point?.x ?? controls[index].point.x),
          y: Number(control.point?.y ?? controls[index].point.y)
        }),
        angle: index === 4 ? Math.PI : controls[index].angle
      }));

      for (let i = 0; i < 4; i++) {
        const angle = Number(parsed.controls[i]?.angle ?? controls[i].angle);
        applyAngleConstraints(i, angle);
      }
    }

    if (Array.isArray(parsed.lambdas) && parsed.lambdas.length === 4) {
      lambdas = parsed.lambdas.map((value: number) => clamp(Number(value), 0, 1));
    }

    stateInput.value = '';
    stateInput.blur();
  } catch {
    stateInput.style.borderColor = 'rgba(255,100,100,0.8)';
    setTimeout(() => {
      stateInput.style.borderColor = '';
    }, 1000);
  }
});

stateInput.addEventListener('pointerdown', e => e.stopPropagation());

function frame() {
  resize();
  ctx.clearRect(0, 0, W, H);
  drawGrid(ctx, toScreen, W, H, camX, camY, camScale);

  drawLine(ctx, toScreen, { x: 0, y: -0.1 }, { x: 0, y: 1.12 }, 'rgba(255,255,255,0.08)', 1, [6, 6]);

  const nodes = buildVisibleNodes();
  const activeSegmentIndex = dragging?.kind === 'arc' ? dragging.segmentIndex : hoveredArcSegment ?? focusedArcSegment;
  const activeDrag = dragging?.kind === 'arc' ? dragging : null;
  let solvedCount = 0;
  let activeArc: ArcRenderState | null = null;

  arcRenderStates = new Map();

  for (const segment of SEGMENTS) {
    if (segment.kind === 'line') {
      const from = nodes[segment.from];
      const to = nodes[segment.to];
      drawLine(ctx, toScreen, from.point, to.point, 'rgba(255,226,154,0.85)', 4);
      continue;
    }

    const state = solveArc(segment, nodes, activeDrag && activeDrag.segmentIndex === segment.index ? activeDrag : null);
    arcRenderStates.set(segment.index, state);

    if (!state.solution) {
      drawLine(ctx, toScreen, state.from.point, state.to.point, 'rgba(255,110,110,0.45)', 1.5, [6, 4]);
      continue;
    }

    solvedCount += 1;
    const active = segment.index === activeSegmentIndex;
    const stats = drawCurveVis(
      ctx,
      toScreen,
      state.at1,
      state.at2,
      state.solution.a,
      state.solution.b,
      state.solution.c,
      state.from.point,
      {
        lineColor: ARC_COLORS[segment.lambdaIndex],
        lineWidth: active ? 3.2 : 2.1,
        showSpeed: active
      }
    );

    state.minS = stats.minS;
    state.maxS = stats.maxS;

    if (active) activeArc = state;

    if (activeDrag && activeDrag.segmentIndex === segment.index && state.solution.tStar != null) {
      const pStar = evalCurve(state.at1, state.solution.tStar, state.solution.a, state.solution.b, state.solution.c, state.from.point);
      drawCircle(ctx, toScreen, pStar, 5, '#fff199', true);
    }
  }

  for (const node of nodes) {
    const color = nodeColor(node);
    const handle = tangentHandle(node.point, node.angle);
    drawLine(ctx, toScreen, node.point, handle, `${color}55`, 1.5, [4, 4]);
    drawCircle(ctx, toScreen, node.point, POINT_R, color, true);
    if (!node.handleLocked) {
      drawCircle(ctx, toScreen, handle, 6, color, true);
    } else {
      drawCircle(ctx, toScreen, handle, 5, color, false);
    }

    const screen = toScreen(node.point);
    ctx.font = '12px monospace';
    ctx.fillStyle = color;
    ctx.fillText(`p${node.index}`, screen.x + 11, screen.y - 9);
  }

  const lambdaText = lambdas.map((value, index) => `λ${index}=${value.toFixed(2)}`).join('  ');
  if (activeArc?.solution && activeArc.minS != null && activeArc.maxS != null) {
    drawSpeedGraph(
      ctx,
      W,
      activeArc.at1,
      activeArc.at2,
      activeArc.solution.a,
      activeArc.solution.b,
      activeArc.solution.c,
      activeArc.solution.tStar ?? null
    );
    info.textContent =
      `Quadratic-angle arcs  ${lambdaText}  active:p${activeArc.def.from}->p${activeArc.def.to}` +
      `  speed:[${activeArc.minS.toFixed(2)}, ${activeArc.maxS.toFixed(2)}]  solved:${solvedCount}/8`;
  } else {
    info.textContent = `Quadratic-angle arcs  ${lambdaText}  solved:${solvedCount}/8`;
  }

  stateEl.textContent = serializeState();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
