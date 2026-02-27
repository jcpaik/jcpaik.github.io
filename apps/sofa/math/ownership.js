// Edge ownership — determine which constraint boundary each edge of S belongs to
//
// For each edge, test the midpoint against all constraint boundaries.
// Uses the owner label propagated through clipping/notching.

import { toLocal } from './hallway.js';

const EPS_OWNER = 1e-6;

function onLevel(aVal, bVal, target = 0) {
  return Math.abs(aVal - target) < EPS_OWNER && Math.abs(bVal - target) < EPS_OWNER;
}

function parseOwnerLabel(label) {
  if (!label) return null;
  const m = label.match(/^L(\d+)_(u0|v0|u1|v1)$/);
  if (m) return { hallwayIndex: parseInt(m[1], 10), wallType: m[2] };
  if (label === 'H_y0') return { hallwayIndex: -1, wallType: 'y0' };
  if (label === 'H_y1') return { hallwayIndex: -1, wallType: 'y1' };
  return null;
}

// Classify a single edge by testing whether both endpoints lie on each boundary.
// Returns { hallwayIndex, wallType } or { hallwayIndex: -1, wallType }.
// wallType: 'y0', 'y1', 'u0', 'v0', 'u1', 'v1', 'unknown'
export function classifyEdge(a, b, hallways) {
  // An edge belongs to a boundary only when BOTH endpoints lie on it.
  // Midpoint-only checks can falsely classify edges that merely cross a boundary.

  // Check horizontal strip boundaries y=0 and y=1
  if (onLevel(a.y, b.y, 0)) return { hallwayIndex: -1, wallType: 'y0' };
  if (onLevel(a.y, b.y, 1)) return { hallwayIndex: -1, wallType: 'y1' };

  // Check each hallway's walls
  for (const hw of hallways) {
    const locA = toLocal(hw, a.x, a.y);
    const locB = toLocal(hw, b.x, b.y);
    if (onLevel(locA.u, locB.u, 0)) return { hallwayIndex: hw.i, wallType: 'u0' };
    if (onLevel(locA.v, locB.v, 0)) return { hallwayIndex: hw.i, wallType: 'v0' };
    if (onLevel(locA.u, locB.u, 1)) return { hallwayIndex: hw.i, wallType: 'u1' };
    if (onLevel(locA.v, locB.v, 1)) return { hallwayIndex: hw.i, wallType: 'v1' };
  }

  // Fallback: use propagated owner labels.
  // Prefer agreement when both endpoints carry a known boundary label.
  const aLabel = parseOwnerLabel(a.owner);
  const bLabel = parseOwnerLabel(b.owner);
  if (aLabel && bLabel) {
    if (aLabel.hallwayIndex === bLabel.hallwayIndex && aLabel.wallType === bLabel.wallType) {
      return aLabel;
    }
    return { hallwayIndex: -1, wallType: 'unknown' };
  }
  if (aLabel) return aLabel;
  if (bLabel) return bLabel;

  return { hallwayIndex: -1, wallType: 'unknown' };
}

// Classify all edges of the polygon
export function classifyAllEdges(poly, hallways) {
  const edges = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    edges.push({
      a, b,
      ...classifyEdge(a, b, hallways),
    });
  }
  return edges;
}
