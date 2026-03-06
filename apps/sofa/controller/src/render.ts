import { type Point, TAU, evalCurve, speed } from './curve';

type ToScreen = (p: Point) => Point;

export interface CurveStyle {
  lineColor?: string;
  lineWidth?: number;
  showSpeed?: boolean;
  speedAlpha?: number;
}

export function drawCircle(ctx: CanvasRenderingContext2D, toScreen: ToScreen, p: Point, r: number, color: string, fill = true) {
  const s = toScreen(p);
  ctx.beginPath();
  ctx.arc(s.x, s.y, r, 0, TAU);
  if (fill) { ctx.fillStyle = color; ctx.fill(); }
  else { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
}

export function drawLine(ctx: CanvasRenderingContext2D, toScreen: ToScreen, a: Point, b: Point, color: string, width: number, dash?: number[]) {
  const sa = toScreen(a), sb = toScreen(b);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash || []);
  ctx.beginPath();
  ctx.moveTo(sa.x, sa.y);
  ctx.lineTo(sb.x, sb.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawCurveVis(
  ctx: CanvasRenderingContext2D,
  toScreen: ToScreen,
  at1: number,
  at2: number,
  a: number,
  b: number,
  c: number,
  p1: Point,
  style: CurveStyle = {}
) {
  const N = 200;
  const dt = (at2 - at1) / N;
  let minS = Infinity, maxS = -Infinity;

  const pts: { pt: Point; sp: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = at1 + i * dt;
    const pt = evalCurve(at1, t, a, b, c, p1);
    const sp = speed(t, a, b, c);
    pts.push({ pt, sp });
    minS = Math.min(minS, sp);
    maxS = Math.max(maxS, sp);
  }

  if (style.showSpeed ?? true) {
    const speedAlpha = style.speedAlpha ?? 0.5;
    for (let i = 0; i < N; i++) {
      const sA = toScreen(pts[i].pt), sB = toScreen(pts[i + 1].pt);
      const sp = (pts[i].sp + pts[i + 1].sp) / 2;
      const frac = maxS > minS ? (sp - minS) / (maxS - minS) : 0.5;
      const r = Math.round(255 * (1 - frac));
      const g = Math.round(255 * frac);
      ctx.strokeStyle = `rgba(${r},${g},80,${speedAlpha})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sA.x, sA.y);
      ctx.lineTo(sB.x, sB.y);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = style.lineColor ?? '#8af';
  ctx.lineWidth = style.lineWidth ?? 2.5;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const s = toScreen(pts[i].pt);
    if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();
  return { minS, maxS };
}

export function drawSpeedGraph(ctx: CanvasRenderingContext2D, W: number, at1: number, at2: number, a: number, b: number, c: number, tStar: number | null) {
  const pad = 14;
  const gw = 180, gh = 100;
  const gx = W - gw - pad, gy = pad;

  ctx.fillStyle = 'rgba(5,9,16,0.75)';
  ctx.strokeStyle = 'rgba(173,191,229,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(gx, gy, gw, gh, 6);
  ctx.fill(); ctx.stroke();

  const N = 100;
  let minS = Infinity, maxS = -Infinity;
  for (let i = 0; i <= N; i++) {
    const t = at1 + (at2 - at1) * i / N;
    const s = speed(t, a, b, c);
    minS = Math.min(minS, s); maxS = Math.max(maxS, s);
  }
  const sRange = maxS - minS || 1;
  const sLo = minS - sRange * 0.1;
  const sHi = maxS + sRange * 0.1;

  const ix = pad + 4, iy = pad + 16;
  const iw = gw - 8, ih = gh - 24;

  if (sLo < 0 && sHi > 0) {
    const zy = gy + iy - pad + ih - ih * (0 - sLo) / (sHi - sLo);
    ctx.strokeStyle = 'rgba(255,100,100,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(gx + ix - pad, zy); ctx.lineTo(gx + ix - pad + iw, zy); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = '#8af';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const t = at1 + (at2 - at1) * i / N;
    const s = speed(t, a, b, c);
    const px = gx + ix - pad + iw * i / N;
    const py = gy + iy - pad + ih - ih * (s - sLo) / (sHi - sLo);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (tStar != null) {
    const frac = (tStar - at1) / (at2 - at1);
    const sx = gx + ix - pad + iw * frac;
    const sv = speed(tStar, a, b, c);
    const sy = gy + iy - pad + ih - ih * (sv - sLo) / (sHi - sLo);
    ctx.fillStyle = '#ff0';
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, TAU); ctx.fill();
  }

  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(173,191,229,0.7)';
  ctx.fillText('s(t)', gx + 4, gy + 12);
  ctx.fillText(sHi.toFixed(1), gx + gw - 30, gy + 12);
  ctx.fillText(sLo.toFixed(1), gx + gw - 30, gy + gh - 2);
  ctx.fillText('t\u2081', gx + ix - pad, gy + gh - 2);
  ctx.fillText('t\u2082', gx + ix - pad + iw - 10, gy + gh - 2);
}

export function drawGrid(ctx: CanvasRenderingContext2D, toScreen: ToScreen, W: number, H: number, camX: number, camY: number, camScale: number) {
  ctx.strokeStyle = 'rgba(173,191,229,0.08)';
  ctx.lineWidth = 1;
  const step = Math.pow(10, Math.floor(Math.log10(5 / camScale * 100)));
  const x0 = Math.floor((camX - W / 2 / camScale) / step) * step;
  const x1 = Math.ceil((camX + W / 2 / camScale) / step) * step;
  const y0 = Math.floor((camY - H / 2 / camScale) / step) * step;
  const y1 = Math.ceil((camY + H / 2 / camScale) / step) * step;
  for (let x = x0; x <= x1; x += step) {
    const s = toScreen({ x, y: 0 });
    ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x, H); ctx.stroke();
  }
  for (let y = y0; y <= y1; y += step) {
    const s = toScreen({ x: 0, y });
    ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(W, s.y); ctx.stroke();
  }
}
