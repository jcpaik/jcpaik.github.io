---
title: "The difference between Riemann-Stieltjes and Lebesgue-Stieltjes
integral"
date: 2023-03-03T11:47:57-06:00
draft: true
---

The [Lebesgue-Stieltjes integral](https://en.wikipedia.org/wiki/Lebesgue%E2%80%93Stieltjes_integration) is a generalization of the [Riemann-Stieltjes integral](https://en.wikipedia.org/wiki/Riemann%E2%80%93Stieltjes_integral). Here we illustrate their difference by using a simple example. Let \(f = \alpha = 1_{[1/2, 1]}$ on the interval $[0, 1]\).

The Riemann-Stieltjes integral $\int_{[0, 1]} f(t)\,d \alpha(t)$ do not exist by the following reason. Take the partition $\left\\{ 0, \frac{1}{2m}, \frac{2}{2m}, \dots, \frac{m-1}{2m}, \frac{m+1}{2m}, \dots, 1 \right\\}$ which skips $1/2$. Let $0 = x_0 < x_1 < \dots < x_n = 1$ be the points in this partition. Note that the Riemann-Stieltjes sum for this partition is $\sum_{i=1}^{n} f(c_i) \left( \alpha(x_i) - \alpha(x_{i-1}) \right)$ where $c_i \in [x_i, x_{i-1}]$ is taken arbitrary. The summand is zero except for the unique interval containing the discontinuity $\frac{1}{2}$, and for that interval we have the term $f(c_i) (1 - 0)$ with the freedom of $c_i \in [(m-1)/2m, (m+1)/2m]$ to choose from. Choosing $c_i$ smaller or larger than $1/2$ wiggles the sum from 0 to 1, no matter how fine the partition is. So the RS integral do not exist. By the very same reason, the RS integral do not exist when $f$ and $g$ share a discontinuous point.

On the other hand, the Lebesgue-Stieltjes integral $\int_{[0, 1]} f(t)\,d \alpha(t)$ is 1. Simply, the Lebesgue–Stieltjes measure $d \alpha$ is the Dirac ("point") measure of weight 1 concentrated at the point $1/2$. So $\int_{[0, 1]} f(t)\,d \alpha(t) = f(1/2)$ for any measurable $f$. Informally, we can say that the LS integral can capture the jump of $\alpha$ at $1/2$ by reading the value of $f$ at exactly $1/2$, no matter whether $f$ and $g$ share the same discontinuity or not. One caveat is that the LS integral can change even if the values of $f$ are fixed almost everywhere. For example, if $f = 1_{(1/2, 1]}$ then $\int_{[0, 1]} f(t)\,d \alpha(t)$ becomes 0. So we should keep track of all the discontinuities with care.
