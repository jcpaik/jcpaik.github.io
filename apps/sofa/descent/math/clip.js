// Sutherland-Hodgman polygon clipping with label propagation
//
// A labeled vertex is { x, y, owner }
// owner tracks which constraint boundary created this vertex (null for original vertices)

import { signedDist } from './halfplane.js';
import { GEOM_EPS } from './constants.js';

function intersect(a, b, hp) {
  const da = signedDist(hp, a);
  const db = signedDist(hp, b);
  const t = da / (da - db);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    owner: hp.owner,
  };
}

// Clip polygon by a single half-plane. Returns new labeled polygon.
export function clipByHalfPlane(poly, hp) {
  if (poly.length === 0) return [];
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const aIn = signedDist(hp, a) <= GEOM_EPS;
    const bIn = signedDist(hp, b) <= GEOM_EPS;
    if (aIn && bIn) {
      out.push(b);
    } else if (aIn && !bIn) {
      out.push(intersect(a, b, hp));
    } else if (!aIn && bIn) {
      out.push(intersect(a, b, hp));
      out.push(b);
    }
    // both outside: skip
  }
  return out;
}

// Clip polygon by multiple half-planes (convex intersection)
export function clipByHalfPlanes(poly, hps) {
  let result = poly;
  for (const hp of hps) {
    result = clipByHalfPlane(result, hp);
    if (result.length === 0) return [];
  }
  return result;
}
