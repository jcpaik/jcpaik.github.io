// Granular unit tests for each math module
// Run: node --input-type=module math/test.js

import { vec, add, sub, scale, dot, cross, len, lerp } from './vec2.js';
import { area, edgeLength, outwardNormal } from './polygon.js';
import { halfPlane, signedDist, isInside } from './halfplane.js';
import { clipByHalfPlane, clipByHalfPlanes } from './clip.js';
import { makeHallway, toLocal, toWorld, outerWallHalfPlanes } from './hallway.js';
import { notch } from './notch.js';
import { classifyEdge, classifyAllEdges } from './ownership.js';
import { computeGradients } from './gradient.js';
import { computeSofa } from './sofa.js';
import { createInitialHallways } from './initial.js';

const EPS = 1e-6;
let pass = 0, fail = 0;

function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', msg); }
}

function near(a, b, msg, eps = EPS) {
  assert(Math.abs(a - b) < eps, `${msg}: expected ${b}, got ${a}`);
}

// ─── vec2 ───
console.log('--- vec2 ---');
near(dot(vec(1, 0), vec(0, 1)), 0, 'dot orthogonal');
near(dot(vec(3, 4), vec(3, 4)), 25, 'dot self');
near(cross(vec(1, 0), vec(0, 1)), 1, 'cross i×j');
near(cross(vec(0, 1), vec(1, 0)), -1, 'cross j×i');
near(len(vec(3, 4)), 5, 'len 3-4-5');
{
  const p = lerp(vec(0, 0), vec(10, 10), 0.3);
  near(p.x, 3, 'lerp x'); near(p.y, 3, 'lerp y');
}

// ─── polygon (area, normals) ───
console.log('--- polygon ---');
{
  // CCW unit square: (0,0),(1,0),(1,1),(0,1)
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  near(area(sq), 1, 'unit square area');

  // CW square gives negative area
  near(area(sq.slice().reverse()), -1, 'CW square area');

  // 2×3 rectangle
  const rect = [vec(0,0), vec(2,0), vec(2,3), vec(0,3)];
  near(area(rect), 6, '2×3 rect area');
}
{
  // Outward normal of bottom edge (0,0)→(1,0) should point down (0,-1) for CCW polygon
  const n = outwardNormal(vec(0, 0), vec(1, 0));
  near(n.x, 0, 'bottom normal x'); near(n.y, -1, 'bottom normal y');

  // Right edge (1,0)→(1,1) should point right (1,0)
  const n2 = outwardNormal(vec(1, 0), vec(1, 1));
  near(n2.x, 1, 'right normal x'); near(n2.y, 0, 'right normal y');
}

// ─── halfplane ───
console.log('--- halfplane ---');
{
  // x ≤ 1
  const hp = halfPlane(1, 0, 1, 'test');
  near(signedDist(hp, vec(0, 0)), -1, 'dist origin to x≤1');
  near(signedDist(hp, vec(1, 0)), 0, 'dist (1,0) to x≤1');
  near(signedDist(hp, vec(2, 0)), 1, 'dist (2,0) to x≤1');
  assert(isInside(hp, vec(0, 0)), 'origin inside x≤1');
  assert(isInside(hp, vec(1, 0)), 'boundary inside x≤1');
  assert(!isInside(hp, vec(2, 0)), '(2,0) outside x≤1');
}

// ─── clip ───
console.log('--- clip ---');
{
  // Clip unit square by x ≤ 0.5 → rectangle [0,0.5]×[0,1], area = 0.5
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  const hp = halfPlane(1, 0, 0.5, 'x_half');
  const clipped = clipByHalfPlane(sq, hp);
  near(area(clipped), 0.5, 'clip x≤0.5 area');
  assert(clipped.length === 4, `clip x≤0.5 verts: expected 4, got ${clipped.length}`);
}
{
  // Clip unit square by x+y ≤ 1 → triangle, area = 0.5
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  const hp = halfPlane(1, 1, 1, 'diag');
  const clipped = clipByHalfPlane(sq, hp);
  near(area(clipped), 0.5, 'clip diagonal area');
  // May have duplicate vertices at boundary; that's acceptable
  assert(clipped.length >= 3, `clip diagonal verts: expected ≥3, got ${clipped.length}`);
}
{
  // Clip unit square by two half-planes: x ≤ 0.5, y ≤ 0.5 → [0,0.5]², area = 0.25
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  const hps = [halfPlane(1, 0, 0.5, 'x'), halfPlane(0, 1, 0.5, 'y')];
  const clipped = clipByHalfPlanes(sq, hps);
  near(area(clipped), 0.25, 'clip two planes area');
  assert(clipped.length === 4, `clip two planes verts: expected 4, got ${clipped.length}`);
}
{
  // Clip: polygon entirely inside → unchanged
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  const hp = halfPlane(1, 0, 10, 'far');
  const clipped = clipByHalfPlane(sq, hp);
  near(area(clipped), 1, 'clip no-op area');
  assert(clipped.length === 4, 'clip no-op verts');
}
{
  // Clip: polygon entirely outside → empty
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  const hp = halfPlane(1, 0, -1, 'none');
  const clipped = clipByHalfPlane(sq, hp);
  assert(clipped.length === 0, 'clip fully outside → empty');
}

// ─── hallway (local↔world, halfplanes) ───
console.log('--- hallway ---');
{
  // θ=0 hallway at origin: local = world
  const hw = makeHallway(0, 4, 0, 0);  // i=0, but we override theta
  // Actually makeHallway uses i*π/(2n), so i=0 gives θ=0
  const loc = toLocal(hw, 3, 4);
  near(loc.u, 3, 'θ=0 toLocal u'); near(loc.v, 4, 'θ=0 toLocal v');
  const w = toWorld(hw, 3, 4);
  near(w.x, 3, 'θ=0 toWorld x'); near(w.y, 4, 'θ=0 toWorld y');
}
{
  // 45° hallway at (1, 1): check roundtrip
  const hw = makeHallway(2, 4, 1, 1); // θ = 2π/8 = π/4 = 45°
  const w = toWorld(hw, 0, 0);
  near(w.x, 1, '45° corner x'); near(w.y, 1, '45° corner y');
  const loc = toLocal(hw, 1, 1);
  near(loc.u, 0, '45° corner u'); near(loc.v, 0, '45° corner v');

  // Roundtrip: toWorld(toLocal(p)) == p
  const px = 2.5, py = -0.3;
  const l = toLocal(hw, px, py);
  const w2 = toWorld(hw, l.u, l.v);
  near(w2.x, px, '45° roundtrip x'); near(w2.y, py, '45° roundtrip y');
}
{
  // Outer wall half-planes: corner at origin, θ=0
  // u ≤ 1 → x ≤ 1, v ≤ 1 → y ≤ 1
  const hw = makeHallway(0, 4, 0, 0);
  const hps = outerWallHalfPlanes(hw);
  assert(isInside(hps[0], vec(0.5, 0.5)), 'outer u: (0.5,0.5) inside');
  assert(!isInside(hps[0], vec(1.5, 0.5)), 'outer u: (1.5,0.5) outside');
  assert(isInside(hps[1], vec(0.5, 0.5)), 'outer v: (0.5,0.5) inside');
  assert(!isInside(hps[1], vec(0.5, 1.5)), 'outer v: (0.5,1.5) outside');
}

// ─── notch ───
console.log('--- notch ---');
{
  // θ=0 hallway at (0.5, 0.5): forbidden = {x<0.5, y<0.5}
  // Notch a unit square [0,1]² → should remove lower-left quarter, area = 0.75
  const hw = makeHallway(0, 4, 0.5, 0.5);
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  const result = notch(sq, hw);
  near(area(result), 0.75, 'notch θ=0 unit square');
  // Should be an L-shape with 6 vertices
  assert(result.length === 6, `notch θ=0 verts: expected 6, got ${result.length}`);
}
{
  // θ=0 hallway at (2, 2): forbidden is {x<2,y<2}, covering the whole square
  const hw = makeHallway(0, 4, 2, 2);
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  const result = notch(sq, hw);
  near(area(result), 0, 'notch covers square → empty');
}
{
  // θ=0 hallway at (0, 0): forbidden = {x<0, y<0}, disjoint from unit square interior
  // So notch should leave the square unchanged.
  const hw = makeHallway(0, 4, 0, 0);
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  const result = notch(sq, hw);
  near(area(result), 1, `notch at origin: area should stay 1, got ${area(result).toFixed(4)}`);
}
{
  // 45° hallway at center of unit square
  // θ = π/4, corner at (0.5, 0.5)
  // In local coords, u = cos45°(x-0.5) + sin45°(y-0.5), v = -sin45°(x-0.5) + cos45°(y-0.5)
  // Forbidden: u<0 AND v<0
  const hw = makeHallway(2, 4, 0.5, 0.5);
  const sq = [vec(0,0), vec(1,0), vec(1,1), vec(0,1)];
  const result = notch(sq, hw);
  // The forbidden region is a rotated quadrant centered at (0.5, 0.5)
  // It should remove roughly a quarter of the square
  const a = area(result);
  assert(a > 0.5 && a < 1.0, `notch 45° area should be ~0.75, got ${a.toFixed(4)}`);
  console.log(`  notch 45° area = ${a.toFixed(6)}, verts = ${result.length}`);
}
{
  // Crucial case: edge passes THROUGH the corner
  // Rectangle [-1, 1] × [-1, 1], θ=0 hallway at (0, 0)
  // Edge from (-1, -0.5) to (0.5, -1) goes through forbidden region near u=0,v=0
  // Actually let's use a polygon that forces the "both endpoints inside but segment crosses corner" case
  // Triangle (CCW): A=(-0.5, -0.5), B=(1, -0.5), C=(-0.5, 1)
  // For θ=0 at origin: B has u=1>0, v=-0.5<0 → in L (v≤0)
  //                     C has u=-0.5<0, v=1>0 → in L (u≤0)
  //                     Edge B→C crosses near the corner while forbidden is {x<0,y<0}
  const hw = makeHallway(0, 4, 0, 0);
  const tri = [vec(-0.5, -0.5), vec(1, -0.5), vec(-0.5, 1)];
  const result = notch(tri, hw);
  const a = area(result);
  const origA = area(tri); // 1.125
  // Forbidden part removed is triangle (-0.5,-0.5),(0,-0.5),(-0.5,0) with area 0.25
  near(a, 0.875, `through-corner: area expected 0.875, got ${a.toFixed(4)}`);
  console.log(`  through-corner: orig=${origA.toFixed(4)} notched=${a.toFixed(4)} verts=${result.length}`);
  // Corner point (0,0) should appear in result
  const hasCorner = result.some(v => Math.abs(v.x) < EPS && Math.abs(v.y) < EPS);
  assert(hasCorner, 'through-corner: corner vertex present');
}
{
  // Intersect H = R × [0,1] with hallway:
  //   (-inf,1]^2 \ (-inf,0)^2
  // rotated by 45° about origin, then shifted up by 1/2.
  //
  // In the 45° local frame (u45, v45):
  //   outer walls: u45 ≤ 1, v45 ≤ 1
  //   removed notch: u45 < 0 AND v45 < 0
  //
  // The removed set inside the strip is the open triangle with corners
  // (-1/2,0), (0,1/2), (1/2,0), so the resulting polygon is:
  // (-1/2-√2,0), (-1/2,0), (0,1/2), (1/2,0), (1/2+√2,0), (√2-1/2,1), (1/2-√2,1)
  const strip = [vec(-10,0), vec(10,0), vec(10,1), vec(-10,1)];
  const c = Math.SQRT1_2; // cos(45°) = sin(45°)
  const p = 0, q = 0.5;
  const outer45 = [
    halfPlane(c, c, 1 + c * p + c * q, 'u1_45'),
    halfPlane(-c, c, 1 - c * p + c * q, 'v1_45'),
  ];
  let poly = clipByHalfPlanes(strip, outer45);

  // notch() now removes {u<0 AND v<0} directly in the same 45° frame.
  const notchFrame = makeHallway(1, 2, p, q); // θ = π/4
  poly = notch(poly, notchFrame);

  const s = Math.SQRT2;
  const expected = [
    vec(-0.5 - s, 0),
    vec(-0.5, 0),
    vec(0, 0.5),
    vec(0.5, 0),
    vec(0.5 + s, 0),
    vec(s - 0.5, 1),
    vec(0.5 - s, 1),
  ];

  near(area(poly), 2 * s - 0.25, '45° shifted hallway notch area');
  assert(poly.length === 7, `45° shifted hallway notch verts: expected 7, got ${poly.length}`);

  for (const e of expected) {
    const found = poly.some(v => Math.abs(v.x - e.x) < 1e-6 && Math.abs(v.y - e.y) < 1e-6);
    assert(found, `45° shifted hallway notch contains vertex (${e.x.toFixed(6)}, ${e.y.toFixed(6)})`);
  }
}

// ─── ownership ───
console.log('--- ownership ---');
{
  // Single θ=0 hallway at (0.5, 0.5), sofa is the L-shaped notch of unit square
  const hw = makeHallway(0, 4, 0.5, 0.5);
  const hws = [hw];
  // Build the sofa manually: clip strip then notch
  const strip = [vec(-2, 0), vec(2, 0), vec(2, 1), vec(-2, 1)];
  const hps = outerWallHalfPlanes(hw);
  let poly = clipByHalfPlanes(strip, hps);
  poly = notch(poly, hw);

  const edges = classifyAllEdges(poly, hws);
  const types = edges.map(e => e.wallType);
  console.log(`  ownership types: [${types.join(', ')}]`);
  // Should have edges on y=0, y=1, u0, v0, u1, v1
  assert(types.includes('y0') || types.includes('u0') || types.includes('v0'),
    'ownership: has inner wall edges');
}

// ─── gradient ───
console.log('--- gradient ---');
{
  // For a symmetric setup, gradients should push outward (increasing area)
  const n = 4;
  const hws = createInitialHallways(n);
  const poly = computeSofa(hws);
  const grads = computeGradients(poly, hws);

  console.log('  n=4 gradients:');
  let anyNonzero = false;
  for (const [i, f] of grads) {
    const mag = Math.hypot(f.fx, f.fy);
    console.log(`    L${i}: (${f.fx.toFixed(4)}, ${f.fy.toFixed(4)}) |f|=${mag.toFixed(4)}`);
    if (mag > 1e-6) anyNonzero = true;
  }
  // At least some gradients should be nonzero (polygon can grow)
  assert(anyNonzero, 'at least one gradient nonzero');
}

// ─── sofa (integration) ───
console.log('--- sofa ---');
{
  // n=2: single hallway at 45°
  const hws = createInitialHallways(2);
  assert(hws.length === 1, 'n=2 has 1 hallway');
  const poly = computeSofa(hws);
  const a = area(poly);
  console.log(`  n=2: area=${a.toFixed(6)}, verts=${poly.length}`);
  assert(poly.length >= 3, 'n=2 non-degenerate');
  assert(a > 0, 'n=2 positive area');
}
{
  // n=4: 3 hallways
  const hws = createInitialHallways(4);
  const poly = computeSofa(hws);
  const a = area(poly);
  console.log(`  n=4: area=${a.toFixed(6)}, verts=${poly.length}`);
  assert(poly.length >= 5, 'n=4 enough vertices');
  assert(a > 0.1, 'n=4 reasonable area');
}

// ─── optimizer (10k-step benchmark) ───
console.log('--- optimizer ---');
{
  const { createOptimizer } = await import('./optimizer.js');
  const opt = createOptimizer(18, 0.002);
  const a0 = opt.getState().area;
  for (let i = 0; i < 10000; i++) opt.step();
  const a10000 = opt.getState().area;
  console.log(`  n=18, alpha=0.002, step 0: ${a0.toFixed(6)}, step 10000: ${a10000.toFixed(6)}`);
  assert(a10000 > a0, `optimizer increases area: ${a0.toFixed(6)} → ${a10000.toFixed(6)}`);
  assert(a10000 > 2.2195, `optimizer area should exceed 2.2195, got ${a10000.toFixed(6)}`);
  assert(a10000 < 2.30, `optimizer area should be only slightly above 2.2195, got ${a10000.toFixed(6)}`);
}

// ─── summary ───
console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
