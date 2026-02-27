// Non-convex wedge removal — cuts away the inner corner quadrant {u < 0 AND v < 0}
//
// For each edge A→B, parameterize as P(t) = A + t(B-A), t ∈ [0,1].
// Compute the forbidden interval where u(t) < 0 AND v(t) < 0.
// The two inner walls (u=0 and v=0) meet at the corner point (p_i, q_i).

import { toLocal } from './hallway.js';
import { vec, lerp } from './vec2.js';

const EPS = 1e-9;

// Compute interval {t ∈ [0,1] : f(t) > 0} where f(t) = f0 + (f1-f0)*t is linear
function positiveInterval(f0, f1) {
  if (f0 > EPS && f1 > EPS) return [0, 1];
  if (f0 <= EPS && f1 <= EPS) return null;
  const tCross = f0 / (f0 - f1);
  if (f0 > EPS) {
    return [0, tCross];
  } else {
    return [tCross, 1];
  }
}

// Intersect two intervals, each a [lo, hi] or null
function intersectIntervals(a, b) {
  if (!a || !b) return null;
  const lo = Math.max(a[0], b[0]);
  const hi = Math.min(a[1], b[1]);
  if (lo >= hi - EPS) return null;
  return [lo, hi];
}

// Determine which wall a point lies on (the coordinate closer to 0)
function wallAt(hw, x, y) {
  const loc = toLocal(hw, x, y);
  return Math.abs(loc.u) <= Math.abs(loc.v) ? 'u' : 'v';
}

// Cut away the inner corner quadrant of hallway hw from polygon.
export function notch(poly, hw) {
  if (poly.length === 0) return [];

  const out = [];
  const corner = vec(hw.p, hw.q);
  let entryWall = null; // 'u' or 'v' — which wall we entered the corner through
  const n = poly.length;

  // Start from an outside→inside crossing when available to avoid
  // carrying an open corner-state across the cyclic seam.
  let startIdx = 0;
  for (let idx = 0; idx < n; idx++) {
    const a = poly[idx];
    const b = poly[(idx + 1) % n];
    const locA = toLocal(hw, a.x, a.y);
    const locB = toLocal(hw, b.x, b.y);
    const aIn = locA.u < -EPS && locA.v < -EPS;
    const bIn = locB.u < -EPS && locB.v < -EPS;
    if (!aIn && bIn) {
      startIdx = idx;
      break;
    }
  }

  for (let k = 0; k < n; k++) {
    const idx = (startIdx + k) % n;
    const a = poly[idx];
    const b = poly[(idx + 1) % n];

    const locA = toLocal(hw, a.x, a.y);
    const locB = toLocal(hw, b.x, b.y);

    // Classify endpoints: strictly inside the forbidden quadrant?
    const aIn = locA.u < -EPS && locA.v < -EPS;
    const bIn = locB.u < -EPS && locB.v < -EPS;

    // Reuse positiveInterval by applying it to (-u) and (-v).
    const iu = positiveInterval(-locA.u, -locB.u);
    const iv = positiveInterval(-locA.v, -locB.v);
    const forbidden = intersectIntervals(iu, iv);

    if (!forbidden) {
      // No forbidden interval — edge is fully inside L_i
      if (entryWall !== null) {
        // Exiting corner state at point A
        const exitWall = wallAt(hw, a.x, a.y);
        if (entryWall !== exitWall) {
          out.push({ ...corner, owner: `L${hw.i}_corner` });
        }
        out.push({ ...a, owner: `L${hw.i}_${exitWall}0` });
        entryWall = null;
      }
      out.push(b);
      continue;
    }

    const [tLo, tHi] = forbidden;

    if (!aIn && !bIn) {
      // THROUGH-CORNER: both endpoints outside forbidden, segment passes through
      // Handle pending entry state first
      if (entryWall !== null) {
        const exitWall = wallAt(hw, a.x, a.y);
        if (entryWall !== exitWall) {
          out.push({ ...corner, owner: `L${hw.i}_corner` });
        }
        out.push({ ...a, owner: `L${hw.i}_${exitWall}0` });
        entryWall = null;
      }

      const entryPt = tLo > EPS ? lerp(a, b, tLo) : a;
      const exitPt = tHi < 1 - EPS ? lerp(a, b, tHi) : b;
      const eWall = wallAt(hw, entryPt.x, entryPt.y);
      const xWall = wallAt(hw, exitPt.x, exitPt.y);

      out.push({ ...entryPt, owner: `L${hw.i}_${eWall}0` });
      if (eWall !== xWall) {
        out.push({ ...corner, owner: `L${hw.i}_corner` });
      }
      out.push({ ...exitPt, owner: `L${hw.i}_${xWall}0` });
      if (tHi < 1 - EPS) {
        out.push(b);
      }
      continue;
    }

    if (!aIn && bIn) {
      // A outside forbidden, B inside → emit entry clip, begin corner state
      if (entryWall !== null) {
        const exitWall = wallAt(hw, a.x, a.y);
        if (entryWall !== exitWall) {
          out.push({ ...corner, owner: `L${hw.i}_corner` });
        }
        out.push({ ...a, owner: `L${hw.i}_${exitWall}0` });
        entryWall = null;
      }

      const entryPt = tLo > EPS ? lerp(a, b, tLo) : a;
      const eWall = wallAt(hw, entryPt.x, entryPt.y);
      out.push({ ...entryPt, owner: `L${hw.i}_${eWall}0` });
      entryWall = eWall;
      continue;
    }

    if (aIn && !bIn) {
      // A inside forbidden, B outside → emit corner + exit clip + B
      const exitPt = tHi < 1 - EPS ? lerp(a, b, tHi) : b;
      const xWall = wallAt(hw, exitPt.x, exitPt.y);

      if (entryWall !== null && entryWall !== xWall) {
        out.push({ ...corner, owner: `L${hw.i}_corner` });
      }
      out.push({ ...exitPt, owner: `L${hw.i}_${xWall}0` });
      if (tHi < 1 - EPS) {
        out.push(b);
      }
      entryWall = null;
      continue;
    }

    // Both A and B in forbidden region — skip edge entirely
    // entryWall state carries over
  }

  return out;
}
