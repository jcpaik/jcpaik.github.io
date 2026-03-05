export const TAU = 2 * Math.PI;

// Antiderivatives: ∫ t^k cos t dt,  ∫ t^k sin t dt
export function intCos0(t: number) { return Math.sin(t); }
export function intSin0(t: number) { return -Math.cos(t); }
export function intCos1(t: number) { return Math.cos(t) + t * Math.sin(t); }
export function intSin1(t: number) { return Math.sin(t) - t * Math.cos(t); }
export function intCos2(t: number) { return 2 * t * Math.cos(t) + (t * t - 2) * Math.sin(t); }
export function intSin2(t: number) { return 2 * t * Math.sin(t) - (t * t - 2) * Math.cos(t); }

export function defInt(F: (t: number) => number, t1: number, t2: number) { return F(t2) - F(t1); }

export function solve2x2(r0: number[], r1: number[], d: number[]): number[] | null {
  const det = r0[0] * r1[1] - r0[1] * r1[0];
  if (Math.abs(det) < 1e-14) return null;
  return [(d[0] * r1[1] - d[1] * r0[1]) / det,
          (r0[0] * d[1] - r1[0] * d[0]) / det];
}

export function solve3x3(M: number[][], d: number[]): { a: number; b: number; c: number } | null {
  function det3(m: number[][]) {
    return m[0][0]*(m[1][1]*m[2][2] - m[1][2]*m[2][1])
         - m[0][1]*(m[1][0]*m[2][2] - m[1][2]*m[2][0])
         + m[0][2]*(m[1][0]*m[2][1] - m[1][1]*m[2][0]);
  }
  const D = det3(M);
  if (Math.abs(D) < 1e-14) return null;
  function replaceCol(col: number, v: number[]) {
    return M.map((row, i) => row.map((val, j) => j === col ? v[i] : val));
  }
  return {
    a: det3(replaceCol(0, d)) / D,
    b: det3(replaceCol(1, d)) / D,
    c: det3(replaceCol(2, d)) / D
  };
}

export interface Point { x: number; y: number; }

export function solveAB(t1: number, t2: number, c: number, delta: Point) {
  const IC0 = defInt(intCos0, t1, t2), IS0 = defInt(intSin0, t1, t2);
  const IC1 = defInt(intCos1, t1, t2), IS1 = defInt(intSin1, t1, t2);
  const IC2 = defInt(intCos2, t1, t2), IS2 = defInt(intSin2, t1, t2);
  return solve2x2([IC2, IC1], [IS2, IS1], [delta.x - c * IC0, delta.y - c * IS0]);
}

export function evalCurve(t1: number, t: number, a: number, b: number, c: number, p1: Point): Point {
  const dx = a * defInt(intCos2, t1, t) + b * defInt(intCos1, t1, t) + c * defInt(intCos0, t1, t);
  const dy = a * defInt(intSin2, t1, t) + b * defInt(intSin1, t1, t) + c * defInt(intSin0, t1, t);
  return { x: p1.x + dx, y: p1.y + dy };
}

export function speed(t: number, a: number, b: number, c: number) { return a * t * t + b * t + c; }

export function minSpeedOnInterval(t1: number, t2: number, a: number, b: number, c: number) {
  let m = Math.min(speed(t1, a, b, c), speed(t2, a, b, c));
  if (a !== 0) {
    const tv = -b / (2 * a);
    if (tv > t1 && tv < t2) m = Math.min(m, speed(tv, a, b, c));
  }
  return m;
}

export function normAngles(t1: number, t2: number): [number, number] {
  let at2 = t2;
  while (at2 <= t1) at2 += TAU;
  while (at2 - t1 > TAU) at2 -= TAU;
  return [t1, at2];
}

export interface CurvePoint extends Point { t: number; }

export function sampleCurvePoints(at1: number, at2: number, a: number, b: number, c: number, p1: Point, N: number): CurvePoint[] {
  const pts: CurvePoint[] = [];
  for (let i = 0; i <= N; i++) {
    const t = at1 + (at2 - at1) * i / N;
    const pt = evalCurve(at1, t, a, b, c, p1);
    pts.push({ x: pt.x, y: pt.y, t });
  }
  return pts;
}

export function closestOnCurve(sx: number, sy: number, curvePts: Point[], toScreen: (p: Point) => Point): { dist: number; t: number } {
  let best = { dist: Infinity, t: 0 };
  for (const cp of curvePts as CurvePoint[]) {
    const s = toScreen(cp);
    const d = Math.hypot(sx - s.x, sy - s.y);
    if (d < best.dist) best = { dist: d, t: cp.t };
  }
  return best;
}
