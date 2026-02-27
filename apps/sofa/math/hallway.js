// Hallway construction — L_i rotated by θ_i, translated by (p_i, q_i)
//
// Local coordinates (u_i, v_i) relative to hallway i:
//   u_i =  cos(θ)(x - p) + sin(θ)(y - q)
//   v_i = -sin(θ)(x - p) + cos(θ)(y - q)
//
// L_i constraints:
//   Outer walls: u_i ≤ 1, v_i ≤ 1
//   Inner corner removal: NOT (u_i < 0 AND v_i < 0)

import { halfPlane } from './halfplane.js';

export function makeHallway(i, n, p, q) {
  const theta = (i * Math.PI) / (2 * n);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { i, theta, c, s, p, q };
}

// World → local coordinates
export function toLocal(hw, x, y) {
  const dx = x - hw.p;
  const dy = y - hw.q;
  return {
    u: hw.c * dx + hw.s * dy,
    v: -hw.s * dx + hw.c * dy,
  };
}

// Local → world coordinates
export function toWorld(hw, u, v) {
  return {
    x: hw.c * u - hw.s * v + hw.p,
    y: hw.s * u + hw.c * v + hw.q,
  };
}

// Outer wall half-planes for L_i: u_i ≤ 1 and v_i ≤ 1
// u_i = cos(θ)(x-p) + sin(θ)(y-q) ≤ 1
//   → cos(θ)·x + sin(θ)·y ≤ 1 + cos(θ)·p + sin(θ)·q
// v_i = -sin(θ)(x-p) + cos(θ)(y-q) ≤ 1
//   → -sin(θ)·x + cos(θ)·y ≤ 1 - sin(θ)·p + cos(θ)·q
export function outerWallHalfPlanes(hw) {
  const { c, s, p, q, i } = hw;
  return [
    halfPlane(c, s, 1 + c * p + s * q, `L${i}_u1`),
    halfPlane(-s, c, 1 - s * p + c * q, `L${i}_v1`),
  ];
}

// Inner wall half-planes (for notch — boundaries of the forbidden quadrant)
// u_i = 0: cos(θ)·x + sin(θ)·y = cos(θ)·p + sin(θ)·q
// v_i = 0: -sin(θ)·x + cos(θ)·y = -sin(θ)·p + cos(θ)·q
export function innerWallHalfPlanes(hw) {
  const { c, s, p, q, i } = hw;
  return {
    uWall: halfPlane(c, s, c * p + s * q, `L${i}_u0`),
    vWall: halfPlane(-s, c, -s * p + c * q, `L${i}_v0`),
  };
}
