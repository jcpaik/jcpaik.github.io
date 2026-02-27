// Compute the sofa polygon S = H ∩ ∩L_i
//
// H = R × [0,1] (horizontal strip)
// Each L_i contributes outer wall half-planes + inner corner notch

import { halfPlane } from './halfplane.js';
import { clipByHalfPlanes } from './clip.js';
import { outerWallHalfPlanes } from './hallway.js';
import { notch } from './notch.js';

const BOUND = 10;

export function computeSofa(hallways) {
  // Start with H as a large rectangle: [-BOUND, BOUND] × [0, 1]
  let poly = [
    { x: -BOUND, y: 0, owner: null },
    { x: BOUND, y: 0, owner: null },
    { x: BOUND, y: 1, owner: null },
    { x: -BOUND, y: 1, owner: null },
  ];

  // Clip by H boundaries: y ≥ 0 and y ≤ 1
  const hPlanes = [
    halfPlane(0, -1, 0, 'H_y0'),   // -y ≤ 0  →  y ≥ 0
    halfPlane(0, 1, 1, 'H_y1'),    //  y ≤ 1
  ];
  poly = clipByHalfPlanes(poly, hPlanes);

  // For each hallway, clip by outer walls then notch
  for (const hw of hallways) {
    const outerHPs = outerWallHalfPlanes(hw);
    poly = clipByHalfPlanes(poly, outerHPs);
    if (poly.length === 0) return [];
    poly = notch(poly, hw);
    if (poly.length === 0) return [];
  }

  return poly;
}
