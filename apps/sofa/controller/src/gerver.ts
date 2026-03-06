import { type Point, evalCurve, normAngles } from './curve';
import { type ABC, computeLambda } from './solver';

export interface GerverControlNode {
  point: Point;
  angle: number;
}

export interface GerverCapInitialization {
  controls: GerverControlNode[];
  lambdas: number[];
}

export const GERVER_A = 0.094426560843653;
export const GERVER_B = 1.399203727333547;
export const GERVER_PHI = 0.039177364790084;
export const GERVER_THETA = 0.681301509382725;

const HALF_PI = Math.PI / 2;

// MathWorld's r(alpha) has four polynomial pieces on the right cap.
// The hull controller traverses the same boundary in reverse, from p0 to p4.
function exactRightSegmentABC(index: number): ABC {
  if (index === 0) {
    const tau0 = HALF_PI + GERVER_PHI;
    return {
      a: -0.25,
      b: tau0 / 2 - (1 + GERVER_A) / 2,
      c: GERVER_B + ((1 + GERVER_A) * tau0) / 2 - (tau0 * tau0) / 4
    };
  }

  if (index === 1) {
    return {
      a: 0,
      b: -1,
      c: Math.PI + GERVER_A - GERVER_PHI
    };
  }

  if (index === 2) {
    return {
      a: 0,
      b: -0.5,
      c: (1 + GERVER_A + Math.PI - GERVER_PHI) / 2
    };
  }

  return { a: 0, b: 0, c: 0.5 };
}

export function getGerverCapInitialization(): GerverCapInitialization {
  const angles = [
    HALF_PI + GERVER_PHI,
    HALF_PI + GERVER_THETA,
    Math.PI - GERVER_THETA,
    Math.PI - GERVER_PHI,
    Math.PI
  ];

  const controls: GerverControlNode[] = [
    {
      point: { x: 1, y: 0 },
      angle: angles[0]
    }
  ];

  let current = controls[0].point;
  for (let i = 0; i < 4; i++) {
    const abc = exactRightSegmentABC(i);
    current = evalCurve(angles[i], angles[i + 1], abc.a, abc.b, abc.c, current);
    controls.push({
      point: {
        x: current.x,
        y: i === 3 ? 1 : current.y
      },
      angle: angles[i + 1]
    });
  }

  // Shift the exact cap rightward so the mirrored top edge satisfies
  // |p4 - p5| = 2 * (p0.x - p4.x), as requested for the hull normalization.
  const xShift = controls[0].point.x - 2 * controls[4].point.x;
  for (const control of controls) {
    control.point.x += xShift;
  }

  const lambdas = Array.from({ length: 4 }, (_, index) => {
    const from = controls[index];
    const to = controls[index + 1];
    const abc = exactRightSegmentABC(index);
    const [at1, at2] = normAngles(from.angle, to.angle);
    return computeLambda(at1, at2, from.point, to.point, abc.a, abc.b, abc.c);
  });

  return { controls, lambdas };
}
