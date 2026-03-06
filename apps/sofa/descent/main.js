// Canvas viewer + optimizer loop.
// One optimization step is applied each animation frame while running.

import { createOptimizer } from './math/optimizer.js';

const DEFAULT_N = 18;
const DEFAULT_ALPHA = 0.002;
const DEFAULT_ALPHA_MIN = 0.001;
const DEFAULT_ALPHA_MAX = 0.01;
const TARGET_FPS = 60;

const optimizer = createOptimizer(DEFAULT_N, DEFAULT_ALPHA);
optimizer.toggle(); // start running immediately

let currentN = DEFAULT_N;
let currentAlpha = DEFAULT_ALPHA;
let alphaMin = DEFAULT_ALPHA_MIN;
let alphaMax = DEFAULT_ALPHA_MAX;

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');

const statusEl = document.getElementById('status');
const areaEl = document.getElementById('area');
const stepEl = document.getElementById('step');
const fpsEl = document.getElementById('fps');
const cfgEl = document.getElementById('cfg');
const toggleBtn = document.getElementById('toggle');
const resetBtn = document.getElementById('reset');

const nSlider = document.getElementById('n-slider');
const alphaSlider = document.getElementById('alpha-slider');
const nValueEl = document.getElementById('n-value');
const alphaValueEl = document.getElementById('alpha-value');
const alphaMinBoundEl = document.getElementById('alpha-min-bound');
const alphaMaxBoundEl = document.getElementById('alpha-max-bound');

let cssWidth = 0;
let cssHeight = 0;

let lastFrameTs = 0;
let fpsSmoothed = TARGET_FPS;

// Fixed viewpoint; user can pan/zoom it manually.
const camera = {
  cx: 0,
  cy: 0.5,
  worldHeight: 4,
};

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

function formatAlpha(v) {
  return Number(v).toFixed(4);
}

function formatBound(v) {
  if (v >= 0.001 && v < 1) return Number(v).toFixed(4);
  if (v >= 1) return Number(v).toFixed(3);
  return Number(v).toExponential(2);
}

function normalizeBoundValue(v) {
  if (!Number.isFinite(v) || v <= 0) return 1e-6;
  return clamp(v, 1e-8, 1e4);
}

function normalizeAlphaBounds(changed = null) {
  alphaMin = normalizeBoundValue(alphaMin);
  alphaMax = normalizeBoundValue(alphaMax);

  if (alphaMax <= alphaMin) {
    if (changed === 'max') alphaMin = alphaMax / 10;
    else alphaMax = alphaMin * 10;
  }

  alphaMin = normalizeBoundValue(alphaMin);
  alphaMax = normalizeBoundValue(alphaMax);
  if (alphaMax <= alphaMin) alphaMax = alphaMin * 10;
}

function computeAlphaStep(min, max) {
  const span = Math.max(max - min, 1e-8);
  const power = Math.floor(Math.log10(span)) - 3;
  return Math.max(1e-8, Math.pow(10, power));
}

function syncAlphaSlider() {
  normalizeAlphaBounds();
  currentAlpha = clamp(currentAlpha, alphaMin, alphaMax);

  alphaSlider.min = String(alphaMin);
  alphaSlider.max = String(alphaMax);
  alphaSlider.step = String(computeAlphaStep(alphaMin, alphaMax));
  alphaSlider.value = String(currentAlpha);

  alphaMinBoundEl.textContent = formatBound(alphaMin);
  alphaMaxBoundEl.textContent = formatBound(alphaMax);
  alphaValueEl.textContent = formatAlpha(currentAlpha);

  optimizer.setAlpha(currentAlpha);
}

function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  cssWidth = window.innerWidth;
  cssHeight = window.innerHeight;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getScale() {
  return cssHeight / camera.worldHeight;
}

function worldToScreen(x, y) {
  const scale = getScale();
  return {
    x: (x - camera.cx) * scale + cssWidth / 2,
    y: cssHeight / 2 - (y - camera.cy) * scale,
  };
}

function screenToWorld(screenX, screenY) {
  const scale = getScale();
  return {
    x: camera.cx + (screenX - cssWidth / 2) / scale,
    y: camera.cy - (screenY - cssHeight / 2) / scale,
  };
}

function drawFrame(state) {
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const p0 = worldToScreen(0, 0);
  const p1 = worldToScreen(0, 1);
  const stripTop = Math.min(p0.y, p1.y);
  const stripH = Math.abs(p1.y - p0.y);

  // Horizontal strip y in [0,1]
  ctx.fillStyle = 'rgba(95, 157, 255, 0.17)';
  ctx.fillRect(0, stripTop, cssWidth, stripH);

  // Axes
  const axisX = worldToScreen(0, 0).x;
  const axisY = worldToScreen(0, 0).y;
  ctx.strokeStyle = 'rgba(187, 203, 233, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, axisY);
  ctx.lineTo(cssWidth, axisY);
  ctx.moveTo(axisX, 0);
  ctx.lineTo(axisX, cssHeight);
  ctx.stroke();

  // Sofa polygon
  if (state.poly.length > 0) {
    const start = worldToScreen(state.poly[0].x, state.poly[0].y);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < state.poly.length; i++) {
      const p = worldToScreen(state.poly[i].x, state.poly[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 176, 46, 0.75)';
    ctx.strokeStyle = 'rgba(246, 131, 11, 0.95)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

  // Hallway corner points
  ctx.fillStyle = 'rgba(220, 230, 255, 0.75)';
  for (const hw of state.hallways) {
    const p = worldToScreen(hw.p, hw.q);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.9, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function updateHud(state) {
  statusEl.textContent = `status: ${state.running ? 'running' : 'paused'}`;
  areaEl.textContent = `area: ${state.area.toFixed(6)}`;
  stepEl.textContent = `step: ${state.stepCount}`;
  fpsEl.textContent = `render fps: ${fpsSmoothed.toFixed(1)} (target ${TARGET_FPS})`;
  cfgEl.textContent = `n=${state.n}, alpha=${formatAlpha(state.alpha)} [${formatBound(alphaMin)}, ${formatBound(alphaMax)}]`;
  toggleBtn.textContent = state.running ? 'Pause' : 'Run';
  nValueEl.textContent = String(currentN);
  alphaValueEl.textContent = formatAlpha(currentAlpha);
}

function toggleRun() {
  optimizer.toggle();
  updateHud(optimizer.getState());
}

function applyN(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 2) return;
  if (n === currentN) return;

  currentN = n;
  nSlider.value = String(currentN);
  optimizer.reset(currentN, currentAlpha);
  const state = optimizer.getState();
  drawFrame(state);
  updateHud(state);
}

function applyAlpha(value) {
  const alpha = Number(value);
  if (!Number.isFinite(alpha)) return;
  currentAlpha = clamp(alpha, alphaMin, alphaMax);
  optimizer.setAlpha(currentAlpha);
  alphaSlider.value = String(currentAlpha);
  updateHud(optimizer.getState());
}

function scaleAlphaBound(which, factor) {
  if (which === 'min') alphaMin *= factor;
  else alphaMax *= factor;

  normalizeAlphaBounds(which);
  syncAlphaSlider();
  updateHud(optimizer.getState());
}

function bindBoundDrag(el, which) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let accum = 0;
  const THRESHOLD = 30;

  function stop(pointerId) {
    dragging = false;
    accum = 0;
    try {
      el.releasePointerCapture(pointerId);
    } catch {
      // ignore
    }
  }

  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    accum = 0;
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // Right or up -> positive (x10). Left or down -> negative (/10).
    accum += dx - dy;

    while (accum >= THRESHOLD) {
      scaleAlphaBound(which, 10);
      accum -= THRESHOLD;
    }
    while (accum <= -THRESHOLD) {
      scaleAlphaBound(which, 0.1);
      accum += THRESHOLD;
    }
  });

  el.addEventListener('pointerup', (e) => stop(e.pointerId));
  el.addEventListener('pointercancel', (e) => stop(e.pointerId));
}

toggleBtn.addEventListener('click', toggleRun);

resetBtn.addEventListener('click', () => {
  optimizer.reset(currentN, currentAlpha);
  const state = optimizer.getState();
  drawFrame(state);
  updateHud(state);
});

nSlider.addEventListener('input', (e) => applyN(e.target.value));
alphaSlider.addEventListener('input', (e) => applyAlpha(e.target.value));

bindBoundDrag(alphaMinBoundEl, 'min');
bindBoundDrag(alphaMaxBoundEl, 'max');

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    toggleRun();
  }
});

window.addEventListener('resize', () => {
  resizeCanvas();
  drawFrame(optimizer.getState());
});

let panActive = false;
let panLastX = 0;
let panLastY = 0;

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  panActive = true;
  panLastX = e.clientX;
  panLastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!panActive) return;
  const dx = e.clientX - panLastX;
  const dy = e.clientY - panLastY;
  panLastX = e.clientX;
  panLastY = e.clientY;

  const scale = getScale();
  camera.cx -= dx / scale;
  camera.cy += dy / scale;
});

function stopPan(pointerId) {
  panActive = false;
  try {
    canvas.releasePointerCapture(pointerId);
  } catch {
    // ignore
  }
}

canvas.addEventListener('pointerup', (e) => stopPan(e.pointerId));
canvas.addEventListener('pointercancel', (e) => stopPan(e.pointerId));

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const worldBefore = screenToWorld(mouseX, mouseY);
  const zoomFactor = Math.exp(e.deltaY * 0.0015);
  camera.worldHeight = clamp(camera.worldHeight * zoomFactor, 0.05, 2000);
  const worldAfter = screenToWorld(mouseX, mouseY);

  // Keep point under cursor fixed while zooming.
  camera.cx += worldBefore.x - worldAfter.x;
  camera.cy += worldBefore.y - worldAfter.y;
}, { passive: false });

function frame(ts) {
  if (lastFrameTs > 0) {
    const dt = ts - lastFrameTs;
    const fpsInstant = dt > 0 ? 1000 / dt : TARGET_FPS;
    fpsSmoothed = 0.9 * fpsSmoothed + 0.1 * fpsInstant;
  }
  lastFrameTs = ts;

  const stateBefore = optimizer.getState();
  if (stateBefore.running) optimizer.step();

  const state = optimizer.getState();
  drawFrame(state);
  updateHud(state);
  requestAnimationFrame(frame);
}

resizeCanvas();
nSlider.value = String(currentN);
nValueEl.textContent = String(currentN);
syncAlphaSlider();

const init = optimizer.getState();
drawFrame(init);
updateHud(init);
requestAnimationFrame(frame);
