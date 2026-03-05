# Curve Controller Conversations

## Parametrization and DOF Analysis

**User:** I need a curve controller. I have two nodes p1 and p2 on a plane to control. Each pi have unit direction ui that I can control. The curve should have tangent vector ui at pi. The curve t should be parametrized by angle of the derivative. Like... ui has angular displacement ti say. The curve is parametrized by x(t) for t from t1 to t2, so that x'(t) has angular displacement t, and the speed ||x'(t)|| is a quadratic polynomial of t. Is the system overparametrized or underparametrized?

**Assistant:**

### Degree-of-freedom count

**Setup:** The curve is x(t) with x'(t) = s(t)(cos t, sin t), where s(t) = at² + bt + c is a quadratic. The angles t1, t2 are determined by the given directions u1, u2.

**Parameters:** a, b, c → **3 free parameters**.

**Constraints:** The tangent direction conditions x'(ti) ∥ ui are automatically satisfied by the parametrization. The position constraints give:

x(t1) = p1 (free — just sets the integration constant, 0 equations on s)

x(t2) = p2 ⟹ ∫_{t1}^{t2} s(τ)(cos τ, sin τ) dτ = p2 - p1 (2 equations)

**Result:** 3 parameters − 2 equations = **1 remaining degree of freedom**. The system is **underparametrized** — you have a one-parameter family of solutions (before considering the inequality constraint s(t) > 0).

---

## Candidates for the Extra Parameter

**User:** Candidates for the extra parameter?

**Assistant:**

Natural choices for the extra degree of freedom:

- **Speed at an endpoint:** fix s(t1) or s(t2) (equivalently, curvature κ = 1/s at an endpoint)
- **Total arc length:** fix ∫_{t1}^{t2} s(τ) dτ
- **Optimize something:** e.g. minimize ∫ 1/s dτ (total curvature-weighted cost), or maximize the minimum speed min s(t)

The endpoint speed is probably the most practical — it gives a linear constraint on (a,b,c), making the whole system a simple linear solve.

---

## Passthrough Point Constraint

**User:** How about: I put a point and make sure that the curve passes through it at some s(t), t in [t1, t2].

**Assistant:**

That works out nicely. Passing through a given point p at some unknown t* ∈ (t1, t2):

∫_{t1}^{t*} s(τ)(cos τ, sin τ) dτ = p - p1

This adds **2 equations** but also **1 new unknown** (t*).

Balance: 4 unknowns (a, b, c, t*) − 4 equations = **exactly determined**.

Though the system is nonlinear in t*, so you may get discrete multiple solutions (or none).

---

## Smoothest Extreme Collapsing Bug

**User:** As I move p1 in the negative x direction (from p1.x ≈ −0.45 to −0.65, with p2 = (1,1), t1 = 0, t2 = π/2, λ = 0.5), the two extremal ghost curves suddenly collapse into one curve. Is this a bug?

**Assistant:**

Yes — the issue is in `getValidSmooth`. It only tried speed-zero at the two endpoints:

- `solveSmooth(t1, t2, p1, p2, t1)` — s(t1) = 0
- `solveSmooth(t1, t2, p1, p2, t2)` — s(t2) = 0

Around p1.x ≈ −0.50, the s(t2) = 0 solution develops negative speed in the interior, so both endpoint solutions become infeasible. Then `getValidSmooth` returns null, and `solveFromLambda` collapses to just the pointy extreme (ignoring λ).

But there is still a valid smooth extreme: s(t) = a(t − t_v)² where t_v ∈ (t1, t2) is the vertex of the speed parabola. This speed is non-negative by construction (perfect square). The equation for t_v is the same as for the pointy extreme — but we pick the root with **smallest** α (smoothest) rather than largest (pointiest).

**Fix:** Added `solveSmoothInterior()` to `solver.ts` which finds this interior-vertex solution. `getValidSmooth()` now falls back to it when both endpoint solutions are infeasible. The interior smooth ghost is drawn in purple.
