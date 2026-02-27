// Initial hallway positions — all inner corners at the origin.

import { makeHallway } from './hallway.js';

export function createInitialHallways(n) {
  const hallways = [];
  for (let i = 1; i < n; i++) {
    hallways.push(makeHallway(i, n, 0, 0));
  }
  return hallways;
}
