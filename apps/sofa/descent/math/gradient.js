// Gradient computation — per-hallway force = Σ |edge| × outward_normal
//
// Translating L_i by δ moves all its boundaries by δ, changing area by Σ |edge| · (δ · n̂).
// So the gradient of area w.r.t. (p_i, q_i) is the sum of |edge| × outward_normal
// over all edges owned by L_i.

import { edgeLength, outwardNormal } from './polygon.js';
import { classifyAllEdges } from './ownership.js';
import { GEOM_EPS } from './constants.js';

export function computeGradients(poly, hallways) {
  const edges = classifyAllEdges(poly, hallways);

  // Initialize force accumulators per hallway index
  const forces = new Map();
  for (const hw of hallways) {
    forces.set(hw.i, { fx: 0, fy: 0 });
  }

  for (const edge of edges) {
    if (edge.hallwayIndex < 0) continue; // H boundary — not movable
    if (!forces.has(edge.hallwayIndex)) continue;

    const len = edgeLength(edge.a, edge.b);
    if (len < GEOM_EPS) continue;

    const n = outwardNormal(edge.a, edge.b);
    const f = forces.get(edge.hallwayIndex);
    f.fx += len * n.x;
    f.fy += len * n.y;
  }

  return forces;
}
