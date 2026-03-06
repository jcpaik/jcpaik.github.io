// Optimizer — manages hallway state, stepping, and convergence

import { makeHallway } from './hallway.js';
import { createInitialHallways } from './initial.js';
import { computeSofa } from './sofa.js';
import { computeGradients } from './gradient.js';
import { area } from './polygon.js';

function freezeHallway(hw) {
  return Object.freeze({
    i: hw.i,
    theta: hw.theta,
    c: hw.c,
    s: hw.s,
    p: hw.p,
    q: hw.q,
  });
}

function freezeHallways(hallways) {
  return Object.freeze(hallways.map(freezeHallway));
}

function freezePoint(p) {
  return Object.freeze({
    x: p.x,
    y: p.y,
    owner: p.owner ?? null,
  });
}

function freezePoly(poly) {
  return Object.freeze(poly.map(freezePoint));
}

export function createOptimizer(n = 18, alpha = 0.002) {
  let hallways = freezeHallways(createInitialHallways(n));
  let poly = freezePoly(computeSofa(hallways));
  let currentArea = area(poly);
  let stepCount = 0;
  let running = false;

  function step() {
    const gradients = computeGradients(poly, hallways);

    hallways = freezeHallways(hallways.map(hw => {
      const f = gradients.get(hw.i);
      if (!f) return hw;
      return makeHallway(hw.i, n, hw.p + alpha * f.fx, hw.q + alpha * f.fy);
    }));

    poly = freezePoly(computeSofa(hallways));
    currentArea = area(poly);
    stepCount++;
  }

  function toggle() {
    running = !running;
  }

  function getState() {
    return Object.freeze({
      poly,
      hallways,
      area: currentArea,
      stepCount,
      running,
      n,
      alpha,
    });
  }

  function setAlpha(newAlpha) {
    const value = Number(newAlpha);
    if (!Number.isFinite(value) || value <= 0) return;
    alpha = value;
  }

  function reset(newN, newAlpha) {
    n = newN ?? n;
    if (newAlpha !== undefined) setAlpha(newAlpha);
    hallways = freezeHallways(createInitialHallways(n));
    poly = freezePoly(computeSofa(hallways));
    currentArea = area(poly);
    stepCount = 0;
  }

  return { step, toggle, getState, setAlpha, reset };
}
