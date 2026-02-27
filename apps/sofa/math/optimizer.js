// Optimizer — manages hallway state, stepping, and convergence

import { makeHallway } from './hallway.js';
import { createInitialHallways } from './initial.js';
import { computeSofa } from './sofa.js';
import { computeGradients } from './gradient.js';
import { area } from './polygon.js';

export function createOptimizer(n = 18, alpha = 0.001) {
  let hallways = createInitialHallways(n);
  let poly = computeSofa(hallways);
  let currentArea = area(poly);
  let stepCount = 0;
  let running = false;

  function step() {
    const gradients = computeGradients(poly, hallways);

    hallways = hallways.map(hw => {
      const f = gradients.get(hw.i);
      if (!f) return hw;
      return makeHallway(hw.i, n, hw.p + alpha * f.fx, hw.q + alpha * f.fy);
    });

    poly = computeSofa(hallways);
    currentArea = area(poly);
    stepCount++;
  }

  function toggle() {
    running = !running;
  }

  function getState() {
    return {
      poly,
      hallways,
      area: currentArea,
      stepCount,
      running,
      n,
      alpha,
    };
  }

  function setAlpha(newAlpha) {
    alpha = newAlpha;
  }

  function reset(newN, newAlpha) {
    n = newN ?? n;
    alpha = newAlpha ?? alpha;
    hallways = createInitialHallways(n);
    poly = computeSofa(hallways);
    currentArea = area(poly);
    stepCount = 0;
  }

  return { step, toggle, getState, setAlpha, reset, get running() { return running; } };
}
