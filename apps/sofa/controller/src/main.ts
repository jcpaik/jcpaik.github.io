import { type Point, type CurvePoint, TAU, normAngles, sampleCurvePoints, closestOnCurve, evalCurve } from './curve';
import { type ABC, computeLambda, solveFromLambda, solveWithPassthrough } from './solver';
import { getGerverCapInitialization } from './gerver';
import { drawLine, drawCurveVis, drawGrid, drawSquare } from './render';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

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

let camX = 0;
let camY = 0.55;
let camScale = 185;

function toScreen(p: Point): Point {
  return { x: W / 2 + (p.x - camX) * camScale, y: H / 2 - (p.y - camY) * camScale };
}

function toWorld(sx: number, sy: number): Point {
  return { x: camX + (sx - W / 2) / camScale, y: camY - (sy - H / 2) / camScale };
}

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

const HANDLE_HALF_LEN = 0.12;
const HANDLE_R = 7;
const POINT_R = 7;
const SELECTED_POINT_R = 10;
const CURVE_HIT_DIST = 12;
const X_GAP = 0.04;
const Y_GAP = 0.04;
const ANGLE_GAP = 0.04;

const CURVE_INACTIVE = 'rgba(10, 10, 10, 0.68)';
const CURVE_ACTIVE = 'rgba(10, 10, 10, 0.96)';
const CURVE_HALO = 'rgba(255, 255, 255, 0.88)';
const CONTROL_FILL = 'rgba(22, 22, 22, 0.96)';
const CONTROL_STROKE = 'rgba(255, 255, 255, 0.92)';

const gerverCap = getGerverCapInitialization();

let controls: ControlNode[] = gerverCap.controls.map(control => ({
  point: { ...control.point },
  angle: control.angle
}));

let lambdas = [...gerverCap.lambdas];

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
let focusedArcSegment: number | null = null;
let selectedNodeIndex: number | null = null;
let arcRenderStates = new Map<number, ArcRenderState>();

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function wrapTau(angle: number) {
  let value = angle % TAU;
  if (value < 0) value += TAU;
  return value;
}

function tangentSegmentEndpoints(p: Point, angle: number) {
  const dx = HANDLE_HALF_LEN * Math.cos(angle);
  const dy = HANDLE_HALF_LEN * Math.sin(angle);
  return {
    negative: { x: p.x - dx, y: p.y - dy },
    positive: { x: p.x + dx, y: p.y + dy }
  };
}

function mirroredAngle(angle: number) {
  return angle === Math.PI ? Math.PI : TAU - angle;
}

function buildVisibleNodes(controlState: ControlNode[] = controls): VisibleNode[] {
  return [
    { index: 0, point: controlState[0].point, angle: controlState[0].angle, sourceIndex: 0, mirrored: false, pinnedY: 0, handleLocked: false },
    { index: 1, point: controlState[1].point, angle: controlState[1].angle, sourceIndex: 1, mirrored: false, pinnedY: null, handleLocked: false },
    { index: 2, point: controlState[2].point, angle: controlState[2].angle, sourceIndex: 2, mirrored: false, pinnedY: null, handleLocked: false },
    { index: 3, point: controlState[3].point, angle: controlState[3].angle, sourceIndex: 3, mirrored: false, pinnedY: null, handleLocked: false },
    { index: 4, point: controlState[4].point, angle: Math.PI, sourceIndex: 4, mirrored: false, pinnedY: 1, handleLocked: true },
    { index: 5, point: { x: -controlState[4].point.x, y: controlState[4].point.y }, angle: Math.PI, sourceIndex: 4, mirrored: true, pinnedY: 1, handleLocked: true },
    { index: 6, point: { x: -controlState[3].point.x, y: controlState[3].point.y }, angle: mirroredAngle(controlState[3].angle), sourceIndex: 3, mirrored: true, pinnedY: null, handleLocked: false },
    { index: 7, point: { x: -controlState[2].point.x, y: controlState[2].point.y }, angle: mirroredAngle(controlState[2].angle), sourceIndex: 2, mirrored: true, pinnedY: null, handleLocked: false },
    { index: 8, point: { x: -controlState[1].point.x, y: controlState[1].point.y }, angle: mirroredAngle(controlState[1].angle), sourceIndex: 1, mirrored: true, pinnedY: null, handleLocked: false },
    { index: 9, point: { x: -controlState[0].point.x, y: controlState[0].point.y }, angle: mirroredAngle(controlState[0].angle), sourceIndex: 0, mirrored: true, pinnedY: 0, handleLocked: false }
  ];
}

function preferredArcForNode(index: number) {
  const outgoing = ARC_SEGMENTS.find(segment => segment.from === index);
  if (outgoing) return outgoing.index;
  const incoming = ARC_SEGMENTS.find(segment => segment.to === index);
  return incoming ? incoming.index : null;
}

function sourcePointFromVisible(node: VisibleNode, world: Point): Point {
  return node.mirrored ? { x: -world.x, y: world.y } : world;
}

function constrainPoint(sourceIndex: number, target: Point, controlState: ControlNode[] = controls): Point {
  const minX = sourceIndex === controlState.length - 1 ? X_GAP : controlState[sourceIndex + 1].point.x + X_GAP;
  const maxX = sourceIndex === 0 ? Number.POSITIVE_INFINITY : controlState[sourceIndex - 1].point.x - X_GAP;
  const x = clamp(Math.max(X_GAP, target.x), minX, maxX);

  if (sourceIndex === 0) return { x, y: 0 };
  if (sourceIndex === controlState.length - 1) return { x, y: 1 };

  const minY = controlState[sourceIndex - 1].point.y + Y_GAP;
  const maxY = controlState[sourceIndex + 1].point.y - Y_GAP;
  return { x, y: clamp(target.y, minY, maxY) };
}

function constrainAngle(sourceIndex: number, rawAngle: number, controlState: ControlNode[] = controls) {
  if (sourceIndex === controlState.length - 1) return Math.PI;
  const minAngle = sourceIndex === 0 ? Math.PI / 2 + ANGLE_GAP : controlState[sourceIndex - 1].angle + ANGLE_GAP;
  const maxAngle = sourceIndex === controlState.length - 2 ? Math.PI - ANGLE_GAP : controlState[sourceIndex + 1].angle - ANGLE_GAP;
  return clamp(wrapTau(rawAngle), minAngle, maxAngle);
}

function nodeColor(node: VisibleNode) {
  return node.index === 4 || node.index === 5 ? 'rgba(22, 22, 22, 0.96)' : CONTROL_FILL;
}

function angleDistance(a: number, b: number) {
  const diff = Math.abs(wrapTau(a - b));
  return Math.min(diff, TAU - diff);
}

function resolveHandleAngle(node: VisibleNode, visibleAngle: number) {
  const visibleCandidates = [wrapTau(visibleAngle), wrapTau(visibleAngle + Math.PI)];
  const sourceCandidates = visibleCandidates.map(candidate =>
    node.mirrored ? wrapTau(TAU - candidate) : candidate
  );

  let best = sourceCandidates[0];
  let bestDist = angleDistance(sourceCandidates[0], controls[node.sourceIndex].angle);
  for (let i = 1; i < sourceCandidates.length; i++) {
    const dist = angleDistance(sourceCandidates[i], controls[node.sourceIndex].angle);
    if (dist < bestDist) {
      best = sourceCandidates[i];
      bestDist = dist;
    }
  }
  return best;
}

function solveArc(
  def: ArcSegmentDef,
  nodes: VisibleNode[],
  lambdaState: number[] = lambdas,
  drag: Extract<DragState, { kind: 'arc' }> | null = null
): ArcRenderState {
  const from = nodes[def.from];
  const to = nodes[def.to];
  const [at1, at2] = normAngles(from.angle, to.angle);

  const solution = drag && drag.segmentIndex === def.index
    ? solveWithPassthrough(at1, at2, from.point, to.point, drag.pStar, drag.tStarHint, drag.lastSolveC)
    : solveFromLambda(at1, at2, from.point, to.point, lambdaState[def.lambdaIndex]);

  return {
    def,
    from,
    to,
    at1,
    at2,
    solution,
    curvePts: solution ? sampleCurvePoints(at1, at2, solution.a, solution.b, solution.c, from.point, 160) : []
  };
}

function cloneControls(controlState: ControlNode[] = controls) {
  return controlState.map(control => ({
    point: { ...control.point },
    angle: control.angle
  }));
}

function interpolateControls(fromControls: ControlNode[], toControls: ControlNode[], alpha: number) {
  return fromControls.map((control, index) => ({
    point: {
      x: control.point.x + (toControls[index].point.x - control.point.x) * alpha,
      y: control.point.y + (toControls[index].point.y - control.point.y) * alpha
    },
    angle: control.angle + (toControls[index].angle - control.angle) * alpha
  }));
}

function areAllArcsSolvable(controlState: ControlNode[]) {
  const nodes = buildVisibleNodes(controlState);
  for (const segment of ARC_SEGMENTS) {
    if (!solveArc(segment, nodes, lambdas).solution) return false;
  }
  return true;
}

function tryCommitControlUpdate(mutator: (nextControls: ControlNode[]) => void) {
  const startControls = cloneControls();
  const nextControls = cloneControls();
  mutator(nextControls);

  if (areAllArcsSolvable(nextControls)) {
    controls = nextControls;
    return true;
  }

  let lo = 0;
  let hi = 1;
  let bestControls = startControls;

  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const midControls = interpolateControls(startControls, nextControls, mid);
    if (areAllArcsSolvable(midControls)) {
      lo = mid;
      bestControls = midControls;
    } else {
      hi = mid;
    }
  }

  controls = bestControls;
  return lo > 0;
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
  const selectedNode = selectedNodeIndex != null ? nodes[selectedNodeIndex] : null;

  if (selectedNode && !selectedNode.handleLocked) {
    const { negative, positive } = tangentSegmentEndpoints(selectedNode.point, selectedNode.angle);
    const positiveScreen = toScreen(positive);
    const negativeScreen = toScreen(negative);
    if (
      Math.hypot(sx - positiveScreen.x, sy - positiveScreen.y) < HANDLE_R + 4 ||
      Math.hypot(sx - negativeScreen.x, sy - negativeScreen.y) < HANDLE_R + 4
    ) {
      return { kind: 'handle', index: selectedNode.index };
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

canvas.addEventListener('pointerdown', e => {
  const hit = hitTest(e.offsetX, e.offsetY);
  dragging = null;

  if (hit?.kind === 'point') {
    selectedNodeIndex = hit.index;
    focusedArcSegment = preferredArcForNode(hit.index);
    dragging = { kind: 'point', index: hit.index };
  } else if (hit?.kind === 'handle') {
    selectedNodeIndex = hit.index;
    focusedArcSegment = preferredArcForNode(hit.index);
    dragging = { kind: 'handle', index: hit.index };
  } else if (hit?.kind === 'arc') {
    selectedNodeIndex = null;
    focusedArcSegment = hit.segmentIndex;
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
    }
  } else {
    selectedNodeIndex = null;
    focusedArcSegment = null;
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
    canvas.style.cursor = hit?.kind === 'handle' ? 'crosshair' : hit ? 'pointer' : 'default';
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
    tryCommitControlUpdate(nextControls => {
      nextControls[node.sourceIndex].point = constrainPoint(node.sourceIndex, target, nextControls);
    });
    return;
  }

  if (dragging.kind === 'handle') {
    const node = nodes[dragging.index];
    const center = node.point;
    const visibleAngle = Math.atan2(world.y - center.y, world.x - center.x);
    const sourceAngle = resolveHandleAngle(node, visibleAngle);
    tryCommitControlUpdate(nextControls => {
      nextControls[node.sourceIndex].angle = constrainAngle(node.sourceIndex, sourceAngle, nextControls);
    });
    return;
  }

  const def = ARC_SEGMENT_MAP.get(dragging.segmentIndex);
  if (!def) return;

  const candidate = world;
  const state = solveArc(def, nodes, lambdas, { ...dragging, pStar: candidate });
  if (state.solution) {
    dragging.pStar = candidate;
    dragging.tStarHint = state.solution.tStar ?? dragging.tStarHint;
    dragging.lastSolveC = state.solution.c;
  }
});

function finishDrag() {
  if (dragging?.kind === 'arc') {
    const def = ARC_SEGMENT_MAP.get(dragging.segmentIndex);
    if (def) {
      const nodes = buildVisibleNodes();
      const state = solveArc(def, nodes, lambdas, dragging);
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
}

canvas.addEventListener('pointerup', finishDrag);
canvas.addEventListener('pointercancel', finishDrag);
canvas.addEventListener('pointerleave', () => {
  if (dragging) return;
  hoveredArcSegment = null;
  canvas.style.cursor = 'default';
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camScale *= Math.pow(1.001, -e.deltaY);
  camScale = Math.max(20, Math.min(2000, camScale));
}, { passive: false });

function frame() {
  resize();
  ctx.clearRect(0, 0, W, H);
  drawGrid(ctx, toScreen, W, H, camX, camY, camScale);

  drawLine(ctx, toScreen, { x: 0, y: -0.1 }, { x: 0, y: 1.12 }, 'rgba(62, 89, 138, 0.18)', 1, [6, 8]);

  const nodes = buildVisibleNodes();
  const activeSegmentIndex = dragging?.kind === 'arc' ? dragging.segmentIndex : hoveredArcSegment ?? focusedArcSegment;
  const activeDrag = dragging?.kind === 'arc' ? dragging : null;

  arcRenderStates = new Map();

  for (const segment of SEGMENTS) {
    if (segment.kind === 'line') {
      const from = nodes[segment.from];
      const to = nodes[segment.to];
      drawLine(ctx, toScreen, from.point, to.point, CURVE_ACTIVE, 2.8);
      continue;
    }

    const state = solveArc(segment, nodes, lambdas, activeDrag && activeDrag.segmentIndex === segment.index ? activeDrag : null);
    arcRenderStates.set(segment.index, state);

    if (!state.solution) {
      drawLine(ctx, toScreen, state.from.point, state.to.point, 'rgba(228, 94, 84, 0.55)', 1.5, [6, 5]);
      continue;
    }

    const active = segment.index === activeSegmentIndex;

    drawCurveVis(ctx, toScreen, state.at1, state.at2, state.solution.a, state.solution.b, state.solution.c, state.from.point, {
      lineColor: active ? CURVE_HALO : 'rgba(255, 255, 255, 0.52)',
      lineWidth: active ? 6.2 : 3.4,
      showSpeed: false,
      shadowColor: active ? 'rgba(255, 255, 255, 0.52)' : 'transparent',
      shadowBlur: active ? 6 : 0
    });

    drawCurveVis(ctx, toScreen, state.at1, state.at2, state.solution.a, state.solution.b, state.solution.c, state.from.point, {
      lineColor: active ? CURVE_ACTIVE : CURVE_INACTIVE,
      lineWidth: active ? 2.4 : 1.8,
      showSpeed: false,
      shadowColor: 'transparent',
      shadowBlur: 0
    });

    if (activeDrag && activeDrag.segmentIndex === segment.index && state.solution.tStar != null) {
      const pStar = evalCurve(state.at1, state.solution.tStar, state.solution.a, state.solution.b, state.solution.c, state.from.point);
      drawSquare(ctx, toScreen, pStar, 8, CONTROL_STROKE, true);
      drawSquare(ctx, toScreen, pStar, 6, CONTROL_FILL, true);
    }
  }

  for (const node of nodes) {
    const color = nodeColor(node);
    const selected = node.index === selectedNodeIndex;
    drawSquare(ctx, toScreen, node.point, selected ? SELECTED_POINT_R + 4 : POINT_R + 3, CONTROL_STROKE, true);
    drawSquare(ctx, toScreen, node.point, selected ? SELECTED_POINT_R : POINT_R, color, true);

    if (selected && !node.handleLocked) {
      const { negative, positive } = tangentSegmentEndpoints(node.point, node.angle);
      drawLine(ctx, toScreen, negative, node.point, 'rgba(40, 40, 40, 0.46)', 1.1);
      drawLine(ctx, toScreen, node.point, positive, 'rgba(40, 40, 40, 0.46)', 1.1);
      drawSquare(ctx, toScreen, negative, 8, CONTROL_STROKE, true);
      drawSquare(ctx, toScreen, positive, 8, CONTROL_STROKE, true);
      drawSquare(ctx, toScreen, negative, 6, color, true);
      drawSquare(ctx, toScreen, positive, 6, color, true);
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
