import {
  type Point, defInt, intCos0, intSin0, intCos1, intSin1, intCos2, intSin2,
  solve2x2, solve3x3, solveAB, evalCurve, speed, minSpeedOnInterval
} from './curve';

export interface ABC { a: number; b: number; c: number; }
export interface ABCWithStar extends ABC { tStar: number; }

// Smoothest: s(tBound) = 0 → 3×3 linear system
export function solveSmooth(t1: number, t2: number, p1: Point, p2: Point, tBound: number): ABC | null {
  const delta = { x: p2.x - p1.x, y: p2.y - p1.y };
  const IC0 = defInt(intCos0, t1, t2), IS0 = defInt(intSin0, t1, t2);
  const IC1 = defInt(intCos1, t1, t2), IS1 = defInt(intSin1, t1, t2);
  const IC2 = defInt(intCos2, t1, t2), IS2 = defInt(intSin2, t1, t2);
  const M = [
    [IC2, IC1, IC0],
    [IS2, IS1, IS0],
    [tBound*tBound, tBound, 1]
  ];
  return solve3x3(M, [delta.x, delta.y, 0]);
}

// Pointiest: s(t) = α(t - t*)², solve for t* then α
export function solvePointy(t1: number, t2: number, p1: Point, p2: Point): ABC | null {
  const delta = { x: p2.x - p1.x, y: p2.y - p1.y };
  function residual(ts: number) {
    const Fx = defInt(intCos2, t1, t2) - 2*ts*defInt(intCos1, t1, t2) + ts*ts*defInt(intCos0, t1, t2);
    const Fy = defInt(intSin2, t1, t2) - 2*ts*defInt(intSin1, t1, t2) + ts*ts*defInt(intSin0, t1, t2);
    return delta.x * Fy - delta.y * Fx;
  }
  const N = 50;
  let bestTs: number | null = null;
  for (let i = 0; i < N; i++) {
    const ta = t1 + (t2 - t1) * i / N;
    const tb = t1 + (t2 - t1) * (i + 1) / N;
    if (residual(ta) * residual(tb) <= 0) {
      let lo = ta, hi = tb;
      for (let j = 0; j < 50; j++) {
        const mid = (lo + hi) / 2;
        if (residual(mid) * residual(lo) <= 0) hi = mid; else lo = mid;
      }
      bestTs = (lo + hi) / 2;
      break;
    }
  }
  if (bestTs == null) return null;
  const ts = bestTs;
  const Fx = defInt(intCos2, t1, t2) - 2*ts*defInt(intCos1, t1, t2) + ts*ts*defInt(intCos0, t1, t2);
  const Fy = defInt(intSin2, t1, t2) - 2*ts*defInt(intSin1, t1, t2) + ts*ts*defInt(intSin0, t1, t2);
  const alpha = Math.abs(Fx) > Math.abs(Fy) ? delta.x / Fx : delta.y / Fy;
  if (alpha <= 0) return null;
  return { a: alpha, b: -2*alpha*ts, c: alpha*ts*ts };
}

// Smooth extreme where speed touches zero at interior vertex: b² = 4ac
// This is a nonlinear constraint. We parametrize by tVertex = -b/(2a),
// which gives b = -2a*tv, c = a*tv². Then solve for (a, tv) from the
// two position constraints using Newton's method.
export function solveSmoothInterior(t1: number, t2: number, p1: Point, p2: Point): ABC | null {
  const delta = { x: p2.x - p1.x, y: p2.y - p1.y };
  const IC0 = defInt(intCos0, t1, t2), IS0 = defInt(intSin0, t1, t2);
  const IC1 = defInt(intCos1, t1, t2), IS1 = defInt(intSin1, t1, t2);
  const IC2 = defInt(intCos2, t1, t2), IS2 = defInt(intSin2, t1, t2);

  // Residual: position(a, tv) - delta = 0
  // s(t) = a*(t - tv)², so a_coeff = a, b_coeff = -2a*tv, c_coeff = a*tv²
  // pos_x = a*(IC2 - 2*tv*IC1 + tv²*IC0) = delta.x
  // pos_y = a*(IS2 - 2*tv*IS1 + tv²*IS0) = delta.y
  // This means: delta.x * (IS2 - 2*tv*IS1 + tv²*IS0) = delta.y * (IC2 - 2*tv*IC1 + tv²*IC0)
  // which is a scalar equation in tv alone (same as solvePointy's residual).
  // But here we want the root where a > 0 AND tv is in (t1, t2).
  // solvePointy already does this! The difference is that solvePointy allows tv outside [t1,t2].
  // We need tv strictly inside (t1, t2) for this to be the "interior smooth" extreme.

  function residual(tv: number) {
    const Fx = IC2 - 2*tv*IC1 + tv*tv*IC0;
    const Fy = IS2 - 2*tv*IS1 + tv*tv*IS0;
    return delta.x * Fy - delta.y * Fx;
  }

  // Scan for ALL roots in (t1, t2), pick the one with largest a (smoothest)
  const N = 50;
  let bestResult: ABC | null = null;
  let bestA = Infinity;

  for (let i = 0; i < N; i++) {
    const ta = t1 + (t2 - t1) * i / N;
    const tb = t1 + (t2 - t1) * (i + 1) / N;
    if (residual(ta) * residual(tb) <= 0) {
      let lo = ta, hi = tb;
      for (let j = 0; j < 50; j++) {
        const mid = (lo + hi) / 2;
        if (residual(mid) * residual(lo) <= 0) hi = mid; else lo = mid;
      }
      const tv = (lo + hi) / 2;
      // Ensure tv is strictly interior
      if (tv <= t1 + 1e-10 || tv >= t2 - 1e-10) continue;

      const Fx = IC2 - 2*tv*IC1 + tv*tv*IC0;
      const Fy = IS2 - 2*tv*IS1 + tv*tv*IS0;
      const a = Math.abs(Fx) > Math.abs(Fy) ? delta.x / Fx : delta.y / Fy;
      if (a <= 0) continue;

      // This is valid by construction: s(t) = a*(t-tv)² >= 0 everywhere
      if (a < bestA) {
        bestA = a;
        bestResult = { a, b: -2*a*tv, c: a*tv*tv };
      }
    }
  }
  return bestResult;
}

// Collect ALL valid boundary solutions of the feasible set s(t) >= 0
export function findExtremes(at1: number, at2: number, p1: Point, p2: Point): { smooth: ABC; pointy: ABC } | null {
  const candidates: ABC[] = [];

  // Case 1: s(t1) = 0
  const s1 = solveSmooth(at1, at2, p1, p2, at1);
  if (s1 && minSpeedOnInterval(at1, at2, s1.a, s1.b, s1.c) >= -1e-9) candidates.push(s1);

  // Case 2: s(t2) = 0
  const s2 = solveSmooth(at1, at2, p1, p2, at2);
  if (s2 && minSpeedOnInterval(at1, at2, s2.a, s2.b, s2.c) >= -1e-9) candidates.push(s2);

  // Case 3: interior double roots s(t) = α(t - tv)²
  const delta = { x: p2.x - p1.x, y: p2.y - p1.y };
  const IC0 = defInt(intCos0, at1, at2), IS0 = defInt(intSin0, at1, at2);
  const IC1 = defInt(intCos1, at1, at2), IS1 = defInt(intSin1, at1, at2);
  const IC2 = defInt(intCos2, at1, at2), IS2 = defInt(intSin2, at1, at2);

  function residual(tv: number) {
    const Fx = IC2 - 2 * tv * IC1 + tv * tv * IC0;
    const Fy = IS2 - 2 * tv * IS1 + tv * tv * IS0;
    return delta.x * Fy - delta.y * Fx;
  }

  const N = 50;
  for (let i = 0; i < N; i++) {
    const ta = at1 + (at2 - at1) * i / N;
    const tb = at1 + (at2 - at1) * (i + 1) / N;
    if (residual(ta) * residual(tb) <= 0) {
      let lo = ta, hi = tb;
      for (let j = 0; j < 50; j++) {
        const mid = (lo + hi) / 2;
        if (residual(mid) * residual(lo) <= 0) hi = mid; else lo = mid;
      }
      const tv = (lo + hi) / 2;
      if (tv <= at1 + 1e-10 || tv >= at2 - 1e-10) continue;
      const Fx = IC2 - 2 * tv * IC1 + tv * tv * IC0;
      const Fy = IS2 - 2 * tv * IS1 + tv * tv * IS0;
      const alpha = Math.abs(Fx) > Math.abs(Fy) ? delta.x / Fx : delta.y / Fy;
      if (alpha <= 0) continue;
      candidates.push({ a: alpha, b: -2 * alpha * tv, c: alpha * tv * tv });
    }
  }

  if (candidates.length === 0) return null;

  // Pick extremes by coefficient a: smallest a = smoothest, largest a = pointiest
  let smooth = candidates[0], pointy = candidates[0];
  for (const c of candidates) {
    if (c.a < smooth.a) smooth = c;
    if (c.a > pointy.a) pointy = c;
  }
  return { smooth, pointy };
}

// Get the valid smooth extreme for the current geometry
export function getValidSmooth(at1: number, at2: number, p1: Point, p2: Point): ABC | null {
  const ex = findExtremes(at1, at2, p1, p2);
  return ex ? ex.smooth : null;
}

// Solve from lambda ∈ [0,1]: interpolate between smooth (λ=0) and pointy (λ=1)
export function solveFromLambda(at1: number, at2: number, p1: Point, p2: Point, lambda: number): ABC | null {
  const ex = findExtremes(at1, at2, p1, p2);
  if (!ex) return null;
  const { smooth, pointy } = ex;
  return {
    a: (1 - lambda) * smooth.a + lambda * pointy.a,
    b: (1 - lambda) * smooth.b + lambda * pointy.b,
    c: (1 - lambda) * smooth.c + lambda * pointy.c
  };
}

// Compute lambda from a given (a,b,c) relative to smooth/pointy extremes
export function computeLambda(at1: number, at2: number, p1: Point, p2: Point, a: number, b: number, c: number): number {
  const ex = findExtremes(at1, at2, p1, p2);
  if (!ex) return 0.5;
  const { smooth, pointy } = ex;
  const da = pointy.a - smooth.a, db = pointy.b - smooth.b, dc = pointy.c - smooth.c;
  let lam: number;
  if (Math.abs(da) >= Math.abs(db) && Math.abs(da) >= Math.abs(dc)) {
    lam = (a - smooth.a) / da;
  } else if (Math.abs(db) >= Math.abs(dc)) {
    lam = (b - smooth.b) / db;
  } else {
    lam = (c - smooth.c) / dc;
  }
  return Math.max(0, Math.min(1, lam));
}

// Solve with passthrough (Newton on (c, tStar))
export function solveWithPassthrough(
  t1: number, t2: number, p1: Point, p2: Point,
  pStar: Point, tStarInit: number, cInit: number | null
): ABCWithStar | null {
  let tStar = tStarInit;
  let c = cInit != null ? cInit : 1.0;
  const delta = { x: p2.x - p1.x, y: p2.y - p1.y };
  const target = { x: pStar.x - p1.x, y: pStar.y - p1.y };

  for (let iter = 0; iter < 50; iter++) {
    const ab = solveAB(t1, t2, c, delta);
    if (!ab) return null;
    const [a, b] = ab;

    const pos = evalCurve(t1, tStar, a, b, c, { x: 0, y: 0 });
    const rx = pos.x - target.x;
    const ry = pos.y - target.y;
    if (Math.hypot(rx, ry) < 1e-10) return { a, b, c, tStar };

    const sStar = speed(tStar, a, b, c);
    const dRdtStar_x = sStar * Math.cos(tStar);
    const dRdtStar_y = sStar * Math.sin(tStar);

    const IC0f = defInt(intCos0, t1, t2), IS0f = defInt(intSin0, t1, t2);
    const IC1f = defInt(intCos1, t1, t2), IS1f = defInt(intSin1, t1, t2);
    const IC2f = defInt(intCos2, t1, t2), IS2f = defInt(intSin2, t1, t2);

    const dadb_dc = solve2x2([IC2f, IC1f], [IS2f, IS1f], [-IC0f, -IS0f]);
    if (!dadb_dc) return null;
    const [da_dc, db_dc] = dadb_dc;

    const IC0s = defInt(intCos0, t1, tStar), IS0s = defInt(intSin0, t1, tStar);
    const IC1s = defInt(intCos1, t1, tStar), IS1s = defInt(intSin1, t1, tStar);
    const IC2s = defInt(intCos2, t1, tStar), IS2s = defInt(intSin2, t1, tStar);

    const dRdc_x = da_dc * IC2s + db_dc * IC1s + IC0s;
    const dRdc_y = da_dc * IS2s + db_dc * IS1s + IS0s;

    const step = solve2x2([dRdc_x, dRdtStar_x], [dRdc_y, dRdtStar_y], [-rx, -ry]);
    if (!step) return null;

    c += step[0];
    tStar += step[1];
    tStar = Math.max(t1 + 0.01, Math.min(t2 - 0.01, tStar));
  }
  return null;
}
