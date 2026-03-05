import { type Point, type CurvePoint, normAngles, sampleCurvePoints, closestOnCurve, evalCurve, minSpeedOnInterval } from './curve';
import { type ABC, solveSmooth, solvePointy, solveSmoothInterior, solveFromLambda, computeLambda, solveWithPassthrough } from './solver';
import { drawCircle, drawLine, drawCurveVis, drawGhostCurve, drawSpeedGraph, drawGrid } from './render';

// --- Canvas ---
const canvas = document.getElementById('view') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const info = document.getElementById('info')!;
const stateEl = document.getElementById('state')!;
const stateInput = document.getElementById('state-input') as HTMLInputElement;

let W: number, H: number;
function resize() {
  const dpr = devicePixelRatio;
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
addEventListener('resize', resize);

// --- Camera ---
let camX = 0, camY = 0, camScale = 150;

function toScreen(p: Point): Point {
  return { x: W / 2 + (p.x - camX) * camScale, y: H / 2 - (p.y - camY) * camScale };
}
function toWorld(sx: number, sy: number): Point {
  return { x: camX + (sx - W / 2) / camScale, y: camY - (sy - H / 2) / camScale };
}

// --- State ---
let p1: Point = { x: 0, y: 0 };
let p2: Point = { x: 1, y: 1 };
let t1 = 0;
let t2 = Math.PI / 2;
let lambda = 0.5;

const HANDLE_LEN = 0.6;
function tangentHandle(p: Point, angle: number): Point {
  return { x: p.x + HANDLE_LEN * Math.cos(angle), y: p.y + HANDLE_LEN * Math.sin(angle) };
}

// Dragging
let dragging: string | null = null;
let dragStart: { x: number; y: number; camX: number; camY: number } | null = null;

// Passthrough state (only while dragging curve)
let pStar: Point | null = null;
let tStarHint: number | null = null;
let lastSolveC: number | null = null;

// Cached curve for rendering and hit-testing
let curSolution: (ABC & { tStar?: number }) | null = null;
let curCurvePts: CurvePoint[] = [];

const HANDLE_R = 8;
const CURVE_HIT_DIST = 12;

function hitTest(sx: number, sy: number): string | null {
  const h1 = toScreen(tangentHandle(p1, t1));
  if (Math.hypot(sx - h1.x, sy - h1.y) < HANDLE_R + 4) return 'handle1';
  const h2 = toScreen(tangentHandle(p2, t2));
  if (Math.hypot(sx - h2.x, sy - h2.y) < HANDLE_R + 4) return 'handle2';
  const s1 = toScreen(p1);
  if (Math.hypot(sx - s1.x, sy - s1.y) < HANDLE_R + 4) return 'p1';
  const s2 = toScreen(p2);
  if (Math.hypot(sx - s2.x, sy - s2.y) < HANDLE_R + 4) return 'p2';
  if (curCurvePts.length > 0) {
    const hit = closestOnCurve(sx, sy, curCurvePts, toScreen);
    if (hit.dist < CURVE_HIT_DIST) return 'curve';
  }
  return null;
}

// --- Events ---
canvas.addEventListener('pointerdown', e => {
  const sx = e.offsetX, sy = e.offsetY;
  const hit = hitTest(sx, sy);

  if (hit === 'handle1' || hit === 'handle2' || hit === 'p1' || hit === 'p2') {
    dragging = hit;
  } else if (hit === 'curve') {
    const [at1, at2] = normAngles(t1, t2);
    const candidatePStar = toWorld(sx, sy);
    const closest = closestOnCurve(sx, sy, curCurvePts, toScreen);
    const candidateC = curSolution ? curSolution.c : 1.0;
    const result = solveWithPassthrough(at1, at2, p1, p2, candidatePStar, closest.t, candidateC);
    if (result && minSpeedOnInterval(at1, at2, result.a, result.b, result.c) >= 0) {
      dragging = 'curve';
      pStar = candidatePStar;
      tStarHint = result.tStar;
      lastSolveC = result.c;
    }
  } else {
    dragging = 'pan';
    dragStart = { x: sx, y: sy, camX, camY };
  }
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', e => {
  if (!dragging) {
    const hit = hitTest(e.offsetX, e.offsetY);
    canvas.style.cursor = hit ? 'pointer' : 'default';
    return;
  }
  const sx = e.offsetX, sy = e.offsetY;
  const w = toWorld(sx, sy);

  if (dragging === 'pan') {
    camX = dragStart!.camX - (sx - dragStart!.x) / camScale;
    camY = dragStart!.camY + (sy - dragStart!.y) / camScale;
    return;
  }

  if (dragging === 'curve') {
    const oldPStar = pStar, oldTStarHint = tStarHint, oldLastSolveC = lastSolveC;
    pStar = w;
    const [at1, at2] = normAngles(t1, t2);
    const result = solveWithPassthrough(at1, at2, p1, p2, pStar, tStarHint!, lastSolveC);
    if (result && minSpeedOnInterval(at1, at2, result.a, result.b, result.c) >= 0) {
      tStarHint = result.tStar;
      lastSolveC = result.c;
    } else {
      pStar = oldPStar; tStarHint = oldTStarHint; lastSolveC = oldLastSolveC;
    }
    return;
  }

  if (dragging === 'p1') p1 = w;
  else if (dragging === 'p2') p2 = w;
  else if (dragging === 'handle1') t1 = Math.atan2(w.y - p1.y, w.x - p1.x);
  else if (dragging === 'handle2') t2 = Math.atan2(w.y - p2.y, w.x - p2.x);
});

canvas.addEventListener('pointerup', () => {
  if (dragging === 'curve') {
    if (curSolution) {
      const [at1, at2] = normAngles(t1, t2);
      lambda = computeLambda(at1, at2, p1, p2, curSolution.a, curSolution.b, curSolution.c);
    }
    pStar = null;
    tStarHint = null;
    lastSolveC = null;
  }
  dragging = null;
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camScale *= Math.pow(1.001, -e.deltaY);
  camScale = Math.max(20, Math.min(2000, camScale));
}, { passive: false });

// --- State serialization ---
function serializeState(): string {
  return JSON.stringify({ p1, p2, t1, t2, lambda });
}

stateInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    try {
      const s = JSON.parse(stateInput.value);
      if (s.p1) p1 = s.p1;
      if (s.p2) p2 = s.p2;
      if (s.t1 != null) t1 = s.t1;
      if (s.t2 != null) t2 = s.t2;
      if (s.lambda != null) lambda = s.lambda;
      stateInput.value = '';
      stateInput.blur();
    } catch {
      stateInput.style.borderColor = 'rgba(255,100,100,0.8)';
      setTimeout(() => stateInput.style.borderColor = '', 1000);
    }
  }
});

// Prevent canvas interactions while typing in the input
stateInput.addEventListener('pointerdown', e => e.stopPropagation());

// --- Frame loop ---
function frame() {
  resize();
  ctx.clearRect(0, 0, W, H);
  drawGrid(ctx, toScreen, W, H, camX, camY, camScale);

  const [at1, at2] = normAngles(t1, t2);

  // Solve
  let result: (ABC & { tStar?: number }) | null;
  if (pStar) {
    result = solveWithPassthrough(at1, at2, p1, p2, pStar, tStarHint!, lastSolveC);
  } else {
    result = solveFromLambda(at1, at2, p1, p2, lambda);
  }
  curSolution = result;

  // Draw extreme ghosts
  const smooth1 = solveSmooth(at1, at2, p1, p2, at1);
  const smooth2 = solveSmooth(at1, at2, p1, p2, at2);
  const smoothInt = solveSmoothInterior(at1, at2, p1, p2);
  const pointy = solvePointy(at1, at2, p1, p2);

  if (smooth1 && minSpeedOnInterval(at1, at2, smooth1.a, smooth1.b, smooth1.c) >= -1e-9) {
    drawGhostCurve(ctx, toScreen, at1, at2, smooth1.a, smooth1.b, smooth1.c, p1, 'rgba(100,255,100,0.35)');
  }
  if (smooth2 && minSpeedOnInterval(at1, at2, smooth2.a, smooth2.b, smooth2.c) >= -1e-9) {
    drawGhostCurve(ctx, toScreen, at1, at2, smooth2.a, smooth2.b, smooth2.c, p1, 'rgba(100,200,255,0.35)');
  }
  if (smoothInt && minSpeedOnInterval(at1, at2, smoothInt.a, smoothInt.b, smoothInt.c) >= -1e-9) {
    drawGhostCurve(ctx, toScreen, at1, at2, smoothInt.a, smoothInt.b, smoothInt.c, p1, 'rgba(200,100,255,0.35)');
  }
  if (pointy) {
    drawGhostCurve(ctx, toScreen, at1, at2, pointy.a, pointy.b, pointy.c, p1, 'rgba(255,100,100,0.35)');
  }

  if (result) {
    const { a, b, c } = result;
    curCurvePts = sampleCurvePoints(at1, at2, a, b, c, p1, 200);
    const { minS, maxS } = drawCurveVis(ctx, toScreen, at1, at2, a, b, c, p1);

    if (pStar && result.tStar != null) {
      const ptStar = evalCurve(at1, result.tStar, a, b, c, p1);
      drawCircle(ctx, toScreen, ptStar, 5, '#ff0', true);
    }

    drawSpeedGraph(ctx, W, at1, at2, a, b, c, result.tStar != null ? result.tStar : null);
    info.textContent = `\u03BB=${lambda.toFixed(2)}  s(t)=${a.toFixed(3)}t\u00B2+${b.toFixed(3)}t+${c.toFixed(3)}  speed:[${minS.toFixed(2)},${maxS.toFixed(2)}]`;
  } else {
    curCurvePts = [];
    info.textContent = 'No solution';
  }

  stateEl.textContent = serializeState();

  // Tangent handles
  const h1 = tangentHandle(p1, at1);
  const h2 = tangentHandle(p2, at2);
  drawLine(ctx, toScreen, p1, h1, 'rgba(68,204,255,0.4)', 1.5, [4, 4]);
  drawLine(ctx, toScreen, p2, h2, 'rgba(255,136,68,0.4)', 1.5, [4, 4]);
  drawCircle(ctx, toScreen, h1, 6, '#4cf', true);
  drawCircle(ctx, toScreen, h2, 6, '#f84', true);

  // Endpoints
  drawCircle(ctx, toScreen, p1, HANDLE_R, '#4cf', true);
  drawCircle(ctx, toScreen, p2, HANDLE_R, '#f84', true);

  const s1 = toScreen(p1), s2 = toScreen(p2);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#4cf'; ctx.fillText('p1', s1.x + 12, s1.y - 8);
  ctx.fillStyle = '#f84'; ctx.fillText('p2', s2.x + 12, s2.y - 8);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
