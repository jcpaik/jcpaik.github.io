# Curve Controller Equations

## Setup

We have two control nodes $p_1, p_2 \in \mathbb{R}^2$ with unit tangent directions $u_1, u_2$.
Let $t_1, t_2$ be the angular displacements of $u_1, u_2$, so $u_i = (\cos t_i, \sin t_i)$.

## Curve parametrization

The curve $x(t)$ for $t \in [t_1, t_2]$ satisfies:

$$x'(t) = s(t) \begin{pmatrix} \cos t \\ \sin t \end{pmatrix}$$

where $s(t) = at^2 + bt + c$ is a quadratic polynomial (the **speed**).
The parameter $t$ is the angle of the derivative, so the tangent direction constraint at endpoints is automatic.

## Constraints

**Position at $t_1$** (initial condition, free):

$$x(t_1) = p_1$$

**Position at $t_2$** (2 equations on $a, b, c$):

$$\int_{t_1}^{t_2} s(\tau) \begin{pmatrix} \cos\tau \\ \sin\tau \end{pmatrix} d\tau = p_2 - p_1$$

## Degree-of-freedom count

| | Count |
|---|---|
| Parameters ($a, b, c$) | 3 |
| Equations (endpoint position) | 2 |
| **Remaining DOF** | **1** |

The system is **underparametrized** by 1 degree of freedom.

## Resolving the extra DOF: passthrough point

Fix a point $p_* \in \mathbb{R}^2$ that the curve must pass through at some unknown parameter $t_* \in (t_1, t_2)$:

$$\int_{t_1}^{t_*} s(\tau) \begin{pmatrix} \cos\tau \\ \sin\tau \end{pmatrix} d\tau = p_* - p_1$$

This adds 2 equations and 1 unknown ($t_*$).

| | Count |
|---|---|
| Unknowns ($a, b, c, t_*$) | 4 |
| Equations | 4 |
| **DOF** | **0** (exactly determined) |

The system is nonlinear in $t_*$, so there may be multiple discrete solutions or none.

## Integral formulas

The constraint integrals have the form:

$$\int_{t_1}^{t_2} (at^2 + bt + c) \cos t \, dt = \Delta x$$
$$\int_{t_1}^{t_2} (at^2 + bt + c) \sin t \, dt = \Delta y$$

These are linear in $(a, b, c)$. Using integration by parts, the basis integrals are:

$$\int t^k \cos t \, dt, \quad \int t^k \sin t \, dt \quad (k = 0, 1, 2)$$

which have closed-form antiderivatives in terms of $t^j \cos t$ and $t^j \sin t$.

## Pointedness parametrization

The endpoint constraint is **linear in $s$**, so any convex combination of valid speed functions also satisfies it. The feasible region is the set of $(a, b, c)$ satisfying the endpoint constraint and $s(t) \geq 0$ on $[t_1, t_2]$. Since the endpoint constraint fixes a 1D affine subspace, the feasible set is a 1D interval. We find its two boundary extremes.

### Boundary solutions

A boundary solution has $s(t) \geq 0$ on $[t_1, t_2]$ with $s(t) = 0$ for some $t \in [t_1, t_2]$. There are three types:

**Type A: $s(t_1) = 0$ (zero at left endpoint).** The constraint $at_1^2 + bt_1 + c = 0$ is linear. Combined with the 2 integral equations, this gives a $3 \times 3$ linear system for $(a, b, c)$, uniquely determined. Valid if $s(t) \geq 0$ on $[t_1, t_2]$.

**Type B: $s(t_2) = 0$ (zero at right endpoint).** Similarly, $at_2^2 + bt_2 + c = 0$ yields a $3 \times 3$ linear system. Valid if $s(t) \geq 0$ on $[t_1, t_2]$.

**Type C: $s(t_*) = 0$ with double root at interior $t_* \in (t_1, t_2)$.** Set $s(t) = \alpha(t - t_*)^2$, so $a = \alpha$, $b = -2\alpha t_*$, $c = \alpha t_*^2$. Substituting into the endpoint constraint and dividing the two components eliminates $\alpha$:

$$\frac{\int_{t_1}^{t_2}(\tau-t_*)^2 \cos\tau\, d\tau}{\int_{t_1}^{t_2}(\tau-t_*)^2 \sin\tau\, d\tau} = \frac{\Delta_x}{\Delta_y}$$

This is a quadratic equation in $t_*$, yielding 0, 1, or 2 roots in $(t_1, t_2)$. Each root with $\alpha > 0$ gives a valid solution (non-negative by construction as a perfect square). The curve has a cusp (infinite curvature) at $t_*$.

### Finding the two extremes

Collect **all** valid boundary solutions from Types A, B, and C. Order them by the leading coefficient $a$:

- **Smoothest extreme** ($s_0$): the valid boundary solution with the smallest $a$
- **Pointiest extreme** ($s_1$): the valid boundary solution with the largest $a$

Depending on geometry, the two extremes may come from any combination of types. For example:
- Both extremes from Type A and Type B (when no interior double root exists)
- One from Type A or B, one from Type C
- Both from Type C (two interior roots with different $\alpha$)

### Convex combination

Let $s_0(t)$ be the smoothest solution and $s_1(t)$ the pointiest. Define:

$$s_\lambda(t) = (1-\lambda)\, s_0(t) + \lambda\, s_1(t), \quad \lambda \in [0, 1]$$

This satisfies the endpoint constraint for all $\lambda$ (by linearity) and $s_\lambda \geq 0$ (since both extremes are $\geq 0$). The coefficients are:

$$a_\lambda = (1-\lambda)a_0 + \lambda a_1, \quad b_\lambda = (1-\lambda)b_0 + \lambda b_1, \quad c_\lambda = (1-\lambda)c_0 + \lambda c_1$$

- $\lambda = 0$: smoothest extreme
- $\lambda = 1$: pointiest extreme
