// 2D vector operations — all functions take/return {x, y} objects

export function vec(x, y) {
  return { x, y };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a, s) {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

export function len(a) {
  return Math.hypot(a.x, a.y);
}

export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
