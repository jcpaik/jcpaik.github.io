// Polygon utilities — a polygon is an array of {x, y} vertices (CCW winding)

import { sub, cross, len } from './vec2.js';

export function area(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function edgeLength(a, b) {
  return len(sub(b, a));
}

// Outward normal of edge A→B (assuming CCW winding), unit length
export function outwardNormal(a, b) {
  const d = sub(b, a);
  const l = len(d);
  if (l < 1e-12) return { x: 0, y: 0 };
  return { x: d.y / l, y: -d.x / l };
}
