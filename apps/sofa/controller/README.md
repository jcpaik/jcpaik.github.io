# Gerver Hull Controller

**INTENT:** This project controls the upper convex-hull boundary of Gerver's sofa rather than a single free curve.

The hull model is:

- four right-side quadratic-angle arcs,
- one horizontal top segment on `y = 1`,
- four left-side quadratic-angle arcs obtained by reflection across `x = 0`.

A **quadratic-angle arc** is the curve type used for each non-horizontal hull piece. It is parametrized by the tangent angle `t`, with derivative

`x'(t) = s(t) (cos t, sin t)`

where `s(t)` is a quadratic polynomial. This matches the special arc pieces that arise in Gerver-style moving-sofa constructions more naturally than Bezier splines.

The default scene is initialized from Gerver's exact cap data using MathWorld's constants `A`, `B`, `φ`, `θ` and the piecewise function `r(α)` for the right cap boundary.
