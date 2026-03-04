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

The endpoint constraint is **linear in $s$**, so any convex combination of valid speed functions also satisfies it. We identify two extreme curves bounding the feasible region $s(t) \geq 0$.

### Pointiest extreme: double zero at interior $t_*$

Set $s(t) = \alpha(t - t_*)^2$ for $t_* \in (t_1, t_2)$. This has $a = \alpha$, $b = -2\alpha t_*$, $c = \alpha t_*^2$. Substituting into the endpoint constraint:

$$\alpha \int_{t_1}^{t_2} (\tau - t_*)^2 \begin{pmatrix} \cos\tau \\ \sin\tau \end{pmatrix} d\tau = \Delta$$

Dividing the two components eliminates $\alpha$:

$$\frac{\int_{t_1}^{t_2}(\tau-t_*)^2 \cos\tau\, d\tau}{\int_{t_1}^{t_2}(\tau-t_*)^2 \sin\tau\, d\tau} = \frac{\Delta_x}{\Delta_y}$$

One equation in one unknown $t_*$. Then $\alpha$ is determined from either component. The curve has a cusp (infinite curvature) at $t_*$.

### Smoothest extreme: zero at endpoint

**Case $s(t_1) = 0$:** The constraint $at_1^2 + bt_1 + c = 0$ is linear. Combined with the 2 integral equations, this gives a $3 \times 3$ linear system for $(a, b, c)$, uniquely determined.

**Case $s(t_2) = 0$:** Similarly, $at_2^2 + bt_2 + c = 0$ yields a $3 \times 3$ linear system.

Pick whichever case gives $s(t) \geq 0$ on the full interval (one or both may be valid).

### Convex combination

Let $s_0(t)$ be the smoothest solution and $s_1(t)$ the pointiest. Define:

$$s_\lambda(t) = (1-\lambda)\, s_0(t) + \lambda\, s_1(t), \quad \lambda \in [0, 1]$$

This satisfies the endpoint constraint for all $\lambda$ (by linearity) and $s_\lambda \geq 0$ (since both extremes are $\geq 0$). The coefficients are:

$$a_\lambda = (1-\lambda)a_0 + \lambda a_1, \quad b_\lambda = (1-\lambda)b_0 + \lambda b_1, \quad c_\lambda = (1-\lambda)c_0 + \lambda c_1$$

- $\lambda = 0$: smoothest (zero speed at endpoint, smooth interior)
- $\lambda = 1$: pointiest (cusp at interior double zero)
