# Moving Sofa Optimizer

This app keeps the sofa fixed and moves/rotates L-shaped hallway constraints around it.
At each step, it computes the sofa polygon

`S = H ∩ L1 ∩ ... ∩ L(n-1)`

and performs gradient ascent on hallway translations to increase area.

## Run

- Open `/Users/jcpaik/Documents/homepage/apps/sofa/index.html` in a browser.
- Run tests with `node math/test.js`.

## File Map

- `index.html`: canvas + HUD controls (including alpha-bound drag UX).
- `main.js`: render loop, camera controls, UI wiring.
- `math/vec2.js`: vector helpers.
- `math/polygon.js`: area, edge length, outward normal.
- `math/constants.js`: shared numeric tolerances.
- `math/halfplane.js`: half-plane representation and point tests.
- `math/clip.js`: Sutherland-Hodgman clipping.
- `math/hallway.js`: hallway transform and outer wall constraints.
- `math/notch.js`: removes hallway inner-corner forbidden quadrant.
- `math/sofa.js`: computes the final sofa polygon from all constraints.
- `math/ownership.js`: classifies sofa edges by active boundary.
- `math/gradient.js`: aggregates per-hallway area gradients.
- `math/initial.js`: initial hallway placement (all corners at origin).
- `math/optimizer.js`: stateful optimizer API (`step`, `toggle`, `getState`, `setAlpha`, `reset`).
- `math/test.js`: unit/integration tests.

## Notes

- Default UI config: `n=18`, `alpha=0.002`.
- `optimizer.getState()` returns an immutable snapshot object.
