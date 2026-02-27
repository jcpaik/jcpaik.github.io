# Moving Sofa Optimizer — Math Module

Fix the sofa's reference frame, rotate/translate L-shaped hallways around it.
The sofa S = H ∩ ∩L_i is the intersection of a horizontal strip with n-1 rotated hallways.
Gradient descent on hallway translations maximizes area, converging toward Gerver's sofa (~2.2195).

## Setup

- **H** = R × [0, 1] — fixed horizontal strip
- **L** = {(x,y) : x ≤ 1, y ≤ 1} \ {(x,y) : x > 0, y > 0} — L-shaped hallway
- **L_i** = L rotated CCW by θ_i = iπ/(2n), translated by (p_i, q_i)
- **S** = H ∩ ∩L_i — the sofa polygon

## Files

### `vec2.js`
2D vector arithmetic on `{x, y}` objects.
- `vec(x, y)` — construct
- `add`, `sub`, `scale` — vector algebra
- `dot`, `cross` — inner product, 2D cross product (scalar)
- `len` — Euclidean norm
- `lerp(a, b, t)` — linear interpolation

### `polygon.js`
Polygon utilities. A polygon is `{x, y}[]` in CCW winding.
- `area(poly)` — signed area via shoelace formula (positive for CCW)
- `edgeLength(a, b)` — Euclidean distance
- `outwardNormal(a, b)` — unit normal pointing outside the CCW polygon

### `halfplane.js`
Half-plane `{nx, ny, d, owner}` representing nx·x + ny·y ≤ d.
- `halfPlane(nx, ny, d, owner)` — construct
- `signedDist(hp, p)` — nx·px + ny·py - d (negative = inside)
- `isInside(hp, p)` — true if signedDist ≤ ε

### `clip.js`
Sutherland-Hodgman polygon clipping. New vertices inherit `owner` from the half-plane.
- `clipByHalfPlane(poly, hp)` — clip by one half-plane
- `clipByHalfPlanes(poly, hps)` — chain multiple (convex intersection)

### `hallway.js`
Hallway L_i: rotation by θ_i, translation by (p_i, q_i). Local coords: u_i = cos θ(x-p) + sin θ(y-q), v_i = -sin θ(x-p) + cos θ(y-q).
- `makeHallway(i, n, p, q)` — construct `{i, theta, c, s, p, q}`
- `toLocal(hw, x, y)` — world → `{u, v}`
- `toWorld(hw, u, v)` — local → `{x, y}`
- `outerWallHalfPlanes(hw)` — half-planes for u ≤ 1, v ≤ 1
- `innerWallHalfPlanes(hw)` — half-planes for u = 0, v = 0 boundaries

### `initial.js`
- `createInitialHallways(n)` — place n-1 hallway corners on semicircle: p = sin θ, q = 1 - cos θ

### `notch.js`
Cuts away the inner corner quadrant {u > 0 AND v > 0} from the polygon. This is the non-convex part of L_i that Sutherland-Hodgman cannot handle.

Algorithm: for each edge A→B, compute the forbidden t-interval where both u(t) > 0 and v(t) > 0. Classify by endpoint status (strictly inside forbidden, or not). Cases:
1. No forbidden interval → pass through
2. Both endpoints outside, interval exists → **through-corner**: emit entry clip, maybe corner vertex (p_i, q_i), exit clip
3. A outside, B inside → emit entry clip, begin corner state
4. A inside, B outside → close corner state, emit exit clip
5. Both inside → skip edge

- `notch(poly, hw)` — returns notched polygon

### `sofa.js`
- `computeSofa(hallways)` — S = H ∩ ∩L_i. Starts from rectangle [-10,10]×[0,1], clips by H, then for each hallway clips outer walls and notches inner corner.

### `ownership.js`
Determines which hallway wall each sofa edge lies on.
- `classifyEdge(a, b, hallways)` → `{hallwayIndex, wallType}`. Tests midpoint against all boundaries (y=0, y=1, u_i=0, v_i=0, u_i=1, v_i=1) with ε=1e-7. Falls back to propagated `owner` label.
- `classifyAllEdges(poly, hallways)` → array of classified edges

### `gradient.js`
- `computeGradients(poly, hallways)` → `Map<i, {fx, fy}>`. For each hallway, sums |edge| × outward_normal over its owned edges. This is ∂area/∂(p_i, q_i).

### `optimizer.js`
- `createOptimizer(n, alpha)` → `{step, toggle, getState, setAlpha, reset}`. Each `step()` computes gradient and updates (p_i, q_i) += α · F_i.

### `main.js`
Entry point. Creates optimizer (n=18, α=0.001), runs `requestAnimationFrame` loop, toggles with Space.

## Tests

`node math/test.js` — 59 tests covering vec2, polygon, halfplane, clip, hallway, notch (including through-corner), ownership, gradient, sofa integration, and optimizer convergence direction.

## Status

**Done:**
- All 10 math modules implemented and wired together
- 59 unit tests passing
- Fixed notch boundary bug: edges with endpoints exactly on forbidden boundary (u=0 or v=0) were incorrectly skipped; now classified by strict endpoint test

**Known bug:**
- Optimizer area diverges past ~2.2 (reaches ~4.3 at 10k steps) instead of converging to Gerver's ~2.2195
- Root cause likely in gradient.js or ownership.js: either edges are misattributed to wrong hallways, or outward normal sign is flipped for some wall types, causing hallways to be pushed apart indefinitely

## Next Steps

1. **Fix gradient divergence** — add a test that checks gradient sign for a single hallway with known geometry. Verify that translating a hallway by +gradient actually increases area by a finite-difference check: area(p + εF) > area(p).
2. **Render the polygon** — canvas 2D drawing of the sofa polygon, colored by edge ownership. Visual inspection will immediately surface geometry bugs.
3. **Adaptive step size** — once gradient is correct, add line search or decaying α to ensure convergence.
4. **UI** — display area, step count, and hallway count. Controls for n, α, reset.
