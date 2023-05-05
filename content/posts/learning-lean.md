---
title: "Learning Lean"
date: 2023-05-05T14:43:44-04:00
draft: false
---

# Proof assistant

- Verifies the correctness of a proof to its axiomatic level
  - e.g. Lean, Coq, Isabelle, HOL-Light, etc.
- Usage in CS
  - Correctness of softwares, algorithms, language designs, etc.

# Usage in Math

- Correctness of proofs
  - ...that are too big or complicated for humans to check
  - ...that holds high importance in its 100% correctness.
- Digitalization of mathematics
  - ...like `.jpg` is for pictures.

## Examples
  - [Four-color Theorem](https://www.ams.org/notices/200811/tx081101382p.pdf)
    - 1976: Need to trust a program customized for the problem.
    - 2005: Proved in Coq, so only need to trust the Coq kernel.
  - [Flyspeck Project](https://github.com/flyspeck/flyspeck)
    - 1998: Heavily computer-assisted, _Annals_ reviewers were "99% certain" of correctness.
    - 2014: All proof details including assisted parts were formalized in HOL-Light.
  - [Liquid tensor project](https://xenaproject.wordpress.com/2020/12/05/liquid-tensor-experiment/)
    - Verifying an important proof that Peter Scholtze himself was unsure of its 100% correctness in its all details.
    - Minor mistakes were fixed and the proof was simplified upon completion.
  - [Sphere eversion](https://leanprover-community.github.io/sphere-eversion/)
  - I used this myself to verify the main proof of a [manuscript](https://github.com/jcpaik/erdos-tuza-valtr), and prove a polynomial version of [FLT](https://github.com/seewoo5/lean-poly-abc) with my friend Seewoo Lee.

# Current Status

It's not a rose garden.
- You should know all the details of the proof beforehand to formalize.
- It is underdocumented for beginners and technology is still changing.
- Expect at least ten times the time learning yourself the theorem to formalizing it.

Still, I encourage you to use it a bit.

- The _de facto_ way of how computers and AI understand mathematics.
- Ensures the highest standard of the correctness of your proofs.
- I expect more _interaction_ between human and computers/AI for studying math together in future.
  - Search engine for definition and theorems.
  - AIs completing more 'boring' part of the proof for us.

# Lean 3 vs. Lean 4

- Lean 3
  - Going to be obsolete in a year or two
  - But has best user experience
- Lean 4
  - The updated version and math library still in development
  - Expect rough edges
    - When I wanted to use `mathlib` I had to build it for hours in my laptop

# Natural Number Game

Enjoy 100% FREE experience of Lean with NO installation RIGHT NOW!!!! Just Click one of the LINKS below and you WON'T REGRET EVER!!!!!
- [Lean 3](https://www.ma.imperial.ac.uk/~buzzard/xena/natural_number_game/)
- [Lean 4](https://adam.math.hhu.de/)

# Installing Lean

NNG is fun, but with full Lean installation you can
- define new concepts
  - polynomials, schemes, ODEs, function spaces, you name it
- declare and prove your own theorems
- and have access to the large collection `mathlib` of known mathematics

UNLOCK the FULL power by DOWNLOADING lean from this [FREE link](https://leanprover-community.github.io/get_started.html)!!!! ZERO virus detected!!!!!
~~by following the procedure you agree to be a part of the hive mind with crazy people from Imperial College~~

Checklists:

- `git`, `python3` and `vscode`
- `elan` package manager
- (Lean 3) `leanprover` via `https://leanprover-community.github.io/install/linux.html`
- VSCode plugin for Lean3 / Lean4

# Resources

- Theorem Proving in Lean ([Lean 3](https://leanprover.github.io/theorem_proving_in_lean/), [Lean 4](https://leanprover.github.io/theorem_proving_in_lean4/))
- [Mathematics in Lean](https://leanprover-community.github.io/mathematics_in_lean)
  - Only in Lean 3
