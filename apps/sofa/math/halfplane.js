// Half-plane representation: nx*x + ny*y <= d
// owner: identifier string for which constraint this came from

const EPS = 1e-9;

export function halfPlane(nx, ny, d, owner) {
  return { nx, ny, d, owner };
}

export function signedDist(hp, p) {
  return hp.nx * p.x + hp.ny * p.y - hp.d;
}

export function isInside(hp, p) {
  return signedDist(hp, p) <= EPS;
}
