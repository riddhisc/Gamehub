// Block Blitz: falling-blocks puzzle with ghost piece, hold, next queue, levels and combos.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const COLS = 10, ROWS = 20;

const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};
const COLOR = { I: "#26ffcb", O: "#ffe600", T: "#b074ff", S: "#7dff6b", Z: "#ff4f6b", J: "#5c8bff", L: "#ff8a00" };
const NAMES = Object.keys(SHAPES);
const START = { easy: 1, medium: 1, hard: 5 };

const rotCW = (m) => m[0].map((_, c) => m.map((row) => row[c]).reverse());
const rotCCW = (m) => m[0].map((_, c) => m.map((row) => row[row.length - 1 - c]));

function bag(g) {
  const b = [...NAMES].sort(() => Math.random() - 0.5);
  g.bag.push(...b);
}
function take(g) {
  if (g.bag.length < 8) bag(g);
  return g.bag.shift();
}

export function newGame(level, w, h) {
  const g = {
    w, h, level, t: 0, board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)), bag: [], cur: null, hold: null, canHold: true,
    bgp: [], score: 0, lines: 0, lv: START[level] || 1, acc: 0, lock: 0, locks: 0, soft: 0, clearing: null, combo: -1, state: "play",
    started: false, banner: { text: "", t: 0 }, pt: null, flash: 0,
  };
  bag(g);
  bag(g);
  spawn(g, take(g));
  return g;
}
export function resize(g, w, h) { g.w = w; g.h = h; }
export function idle(g, dt) { g.t += dt; stepBg(g, dt); }
export const result = (g) => [["Lines", g.lines], ["Level", g.lv]];

function spawn(g, name) {
  const m = SHAPES[name].map((r) => [...r]);
  g.cur = { name, m, x: Math.floor((COLS - m[0].length) / 2), y: name === "I" ? -1 : 0 };
  g.canHold = true;
  g.acc = 0; g.lock = 0; g.locks = 0;
  if (collide(g, g.cur.m, g.cur.x, g.cur.y)) g.state = "over";
}

function collide(g, m, x, y) {
  for (let r = 0; r < m.length; r++)
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const bx = x + c, by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && g.board[by][bx]) return true;
    }
  return false;
}

function move(g, dx) {
  const p = g.cur;
  if (!p || g.clearing) return false;
  if (!collide(g, p.m, p.x + dx, p.y)) { p.x += dx; touched(g); return true; }
  return false;
}
function touched(g) {
  if (g.lock > 0 && g.locks < 15) { g.lock = 0; g.locks++; }
}
function rotate(g, cw) {
  const p = g.cur;
  if (!p || g.clearing || p.name === "O") return;
  const m = cw ? rotCW(p.m) : rotCCW(p.m);
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1]]) {
    if (!collide(g, m, p.x + dx, p.y + dy)) { p.m = m; p.x += dx; p.y += dy; touched(g); return; }
  }
}
function ghostY(g) {
  let y = g.cur.y;
  while (!collide(g, g.cur.m, g.cur.x, y + 1)) y++;
  return y;
}
function hardDrop(g) {
  if (!g.cur || g.clearing) return;
  const y = ghostY(g);
  g.score += (y - g.cur.y) * 2;
  g.cur.y = y;
  g.flash = 0.12;
  lockPiece(g);
}
function holdPiece(g) {
  if (!g.canHold || g.clearing) return;
  const name = g.cur.name;
  if (g.hold) spawn(g, g.hold);
  else spawn(g, take(g));
  g.hold = name;
  g.canHold = false;
}

function lockPiece(g) {
  const p = g.cur;
  p.m.forEach((row, r) => row.forEach((v, c) => { if (v && p.y + r >= 0) g.board[p.y + r][p.x + c] = p.name; }));
  const full = [];
  g.board.forEach((row, r) => { if (row.every(Boolean)) full.push(r); });
  g.cur = null;
  if (full.length) {
    g.clearing = { rows: full, t: 0.28 };
  } else {
    g.combo = -1;
    spawn(g, take(g));
  }
}
function finishClear(g) {
  const rows = g.clearing.rows;
  g.board = g.board.filter((_, r) => !rows.includes(r));
  while (g.board.length < ROWS) g.board.unshift(Array(COLS).fill(0));
  const n = rows.length;
  g.combo++;
  g.score += [0, 100, 300, 500, 800][n] * g.lv + (g.combo > 0 ? 50 * g.combo * g.lv : 0);
  g.lines += n;
  const lv = Math.min(15, (START[g.level] || 1) + Math.floor(g.lines / 10));
  if (lv > g.lv) { g.lv = lv; g.banner = { text: `LEVEL ${lv}`, t: 1.5 }; }
  if (n === 4) g.banner = { text: "BLITZ!", t: 1.4 };
  g.clearing = null;
  spawn(g, take(g));
}

export function key(g, k, down, repeat) {
  if (k === "ArrowDown" || k === "s" || k === "S") { g.soft = down ? 1 : 0; return; }
  if (!down) return;
  if (k === "ArrowLeft" || k === "a" || k === "A") move(g, -1);
  else if (k === "ArrowRight" || k === "d" || k === "D") move(g, 1);
  else if (!repeat && (k === "ArrowUp" || k === "w" || k === "W" || k === "x" || k === "X")) rotate(g, true);
  else if (!repeat && (k === "z" || k === "Z" || k === "Control")) rotate(g, false);
  else if (!repeat && k === " ") hardDrop(g);
  else if (!repeat && (k === "c" || k === "C" || k === "Shift")) holdPiece(g);
}

// touch: drag sideways to move, drag down to drop, tap to rotate, flick down to slam
export function pointer(g, x, y, phase) {
  const cell = metrics(g).cell;
  if (phase === "down") g.pt = { x, y, cx: x, cy: y, t: g.t, moved: false };
  else if (phase === "move" && g.pt) {
    while (x - g.pt.cx > cell * 0.9) { move(g, 1); g.pt.cx += cell * 0.9; g.pt.moved = true; }
    while (g.pt.cx - x > cell * 0.9) { move(g, -1); g.pt.cx -= cell * 0.9; g.pt.moved = true; }
    while (y - g.pt.cy > cell * 0.9) { stepDown(g, true); g.pt.cy += cell * 0.9; g.pt.moved = true; }
  } else if (phase === "up" && g.pt) {
    const dt = g.t - g.pt.t;
    if (!g.pt.moved && dt < 0.3) rotate(g, true);
    else if (y - g.pt.y > cell * 4 && dt < 0.35) hardDrop(g);
    g.pt = null;
  }
}

function stepDown(g, scored) {
  const p = g.cur;
  if (!p || g.clearing) return false;
  if (!collide(g, p.m, p.x, p.y + 1)) { p.y++; if (scored) g.score += 1; g.lock = 0; return true; }
  return false;
}

function stepBg(g, dt) {
  while (g.bgp.length < 16) {
    g.bgp.push({ name: NAMES[Math.floor(Math.random() * 7)], x: Math.random() * g.w, y: g.bgp.length < 8 ? Math.random() * g.h : -140, v: 30 + Math.random() * 60, sz: 0.9 + Math.random() * 1.4, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 0.4, a: 0.08 + Math.random() * 0.1 });
  }
  for (const q of g.bgp) { q.y += q.v * dt; q.rot += q.spin * dt; }
  g.bgp = g.bgp.filter((q) => q.y < g.h + 180);
}

export function update(g, dt) {
  g.t += dt;
  stepBg(g, dt);
  g.flash = Math.max(0, g.flash - dt);
  g.banner.t = Math.max(0, g.banner.t - dt);
  if (g.clearing) { g.clearing.t -= dt; if (g.clearing.t <= 0) finishClear(g); return; }
  const p = g.cur;
  if (!p) return;
  const interval = Math.pow(0.8 - (g.lv - 1) * 0.007, g.lv - 1);
  g.acc += (dt * (g.soft ? 18 : 1)) / interval;
  while (g.acc >= 1) {
    g.acc -= 1;
    if (stepDown(g, g.soft)) continue;
    break;
  }
  if (collide(g, p.m, p.x, p.y + 1)) {
    g.lock += dt;
    if (g.lock >= 0.5) lockPiece(g);
  } else g.lock = 0;
}

/* ---------- drawing ---------- */

function metrics(g) {
  const portrait = g.w < g.h * 0.85;
  const cell = portrait ? Math.floor(Math.min((g.h * 0.8) / (ROWS + 3.4), (g.w * 0.94) / COLS)) : Math.floor(Math.min((g.h * 0.92) / ROWS, g.w * 0.3 / COLS * 1.6));
  const bx = Math.floor((g.w - COLS * cell) / 2);
  const by = portrait ? Math.floor(g.h - ROWS * cell - 10) : Math.floor((g.h - ROWS * cell) / 2);
  return { cell, bx, by, portrait };
}

function cellDraw(ctx, x, y, s, col, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(x + 1, y + 1, s - 2, (s - 2) * 0.28);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x + 1, y + s - 1 - (s - 2) * 0.18, s - 2, (s - 2) * 0.18);
  ctx.globalAlpha = 1;
}

function miniPiece(ctx, name, x, y, s, a = 1) {
  const m = SHAPES[name];
  const w = m[0].length * s, h = m.length * s;
  m.forEach((row, r) => row.forEach((v, c) => v && cellDraw(ctx, x - w / 2 + c * s, y - h / 2 + r * s, s, COLOR[name], a)));
}

export function draw(ctx, g, t) {
  const { w, h } = g;
  const { cell, bx, by, portrait } = metrics(g);
  ctx.save();
  if (g.flash > 0) ctx.translate(0, g.flash * 14);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#06041a");
  bg.addColorStop(1, "#150830");
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  ctx.fillStyle = "rgba(125,255,230,0.05)";
  for (let i = 0; i < 40; i++) ctx.fillRect(((i * 197 + Math.floor(t * 8)) % w), (i * 131) % h, 2, 2);

  for (const q of g.bgp) {
    const m = SHAPES[q.name], sz = cell * 0.6 * q.sz;
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.rotate(q.rot);
    m.forEach((row, r) => row.forEach((v, c) => v && cellDraw(ctx, -(m[0].length * sz) / 2 + c * sz, -(m.length * sz) / 2 + r * sz, sz, COLOR[q.name], q.a)));
    ctx.restore();
  }

  // board
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(bx - 4, by - 4, COLS * cell + 8, ROWS * cell + 8);
  ctx.strokeStyle = "rgba(38,255,203,0.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(bx - 4, by - 4, COLS * cell + 8, ROWS * cell + 8);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) { ctx.moveTo(bx + c * cell, by); ctx.lineTo(bx + c * cell, by + ROWS * cell); }
  for (let r = 1; r < ROWS; r++) { ctx.moveTo(bx, by + r * cell); ctx.lineTo(bx + COLS * cell, by + r * cell); }
  ctx.stroke();

  g.board.forEach((row, r) => row.forEach((v, c) => v && cellDraw(ctx, bx + c * cell, by + r * cell, cell, COLOR[v])));
  if (g.clearing) {
    const a = clamp(g.clearing.t / 0.28, 0, 1);
    ctx.fillStyle = `rgba(255,255,255,${1 - a * 0.4})`;
    g.clearing.rows.forEach((r) => ctx.fillRect(bx, by + r * cell, COLS * cell, cell));
  }
  if (g.cur && g.started) {
    const gy = ghostY(g);
    g.cur.m.forEach((row, r) => row.forEach((v, c) => {
      if (!v) return;
      if (gy + r >= 0) {
        ctx.strokeStyle = COLOR[g.cur.name];
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + (g.cur.x + c) * cell + 2, by + (gy + r) * cell + 2, cell - 4, cell - 4);
        ctx.globalAlpha = 1;
      }
      if (g.cur.y + r >= 0) cellDraw(ctx, bx + (g.cur.x + c) * cell, by + (g.cur.y + r) * cell, cell, COLOR[g.cur.name]);
    }));
  }

  // side panels
  if (g.started) {
    const f = Math.max(0.7, cell / 30);
    const font = (px) => `${Math.round(px * f)}px Impact, "Arial Black", sans-serif`;
    const text = (txt, x, y, col, px, al = "center") => { ctx.textAlign = al; ctx.textBaseline = "top"; ctx.fillStyle = col; ctx.font = font(px); ctx.fillText(txt, x, y); };
    const card = (x, y, cw, ch) => { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x, y, cw, ch); ctx.strokeStyle = "rgba(38,255,203,0.35)"; ctx.lineWidth = 2; ctx.strokeRect(x, y, cw, ch); };
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (portrait) {
      const holdX = bx + cell * 1.6, nextX = bx + COLS * cell - cell * 1.6, panelY = by - cell * 3.2;
      text("HOLD", holdX, panelY, "#26ffcb", 15);
      if (g.hold) miniPiece(ctx, g.hold, holdX, panelY + cell * 2.2, cell * 0.7, g.canHold ? 1 : 0.4);
      text("NEXT", nextX, panelY, "#26ffcb", 15);
      miniPiece(ctx, g.bag[0], nextX, panelY + cell * 2.2, cell * 0.7);
      text(fmt(g.score), w / 2, by - cell * 3.1, "#fff", 30);
      text(`LEVEL ${g.lv}   LINES ${g.lines}`, w / 2, by - cell * 3.1 + 40 * f, "#26ffcb", 15);
      if (g.combo > 0) text(`COMBO x${g.combo}`, w / 2, by - cell * 3.1 + 62 * f, "#ffe600", 18);
    } else {
      const pad = 18 * f, gap = 28 * f;
      const pw = clamp(bx - gap - 24 * f, 150, 340 * f);
      const lx = bx - gap - pw, rx = bx + COLS * cell + gap, bh = ROWS * cell;
      card(lx, by, pw, bh);
      card(rx, by, pw, bh);
      // left: hold and stats
      text("HOLD", lx + pw / 2, by + pad, "#26ffcb", 17);
      if (g.hold) miniPiece(ctx, g.hold, lx + pw / 2, by + pad + cell * 2.6, cell * 0.8, g.canHold ? 1 : 0.4);
      const sy = by + bh * 0.36;
      text("SCORE", lx + pw / 2, sy, "#26ffcb", 17);
      text(fmt(g.score), lx + pw / 2, sy + 26 * f, "#fff", 44);
      text("LEVEL", lx + pad, sy + 100 * f, "#9aa4b2", 17, "left");
      text(String(g.lv), lx + pw - pad, sy + 94 * f, "#fff", 30, "right");
      text("LINES", lx + pad, sy + 152 * f, "#9aa4b2", 17, "left");
      text(String(g.lines), lx + pw - pad, sy + 146 * f, "#fff", 30, "right");
      if (g.combo > 0) text(`COMBO x${g.combo}`, lx + pw / 2, sy + 204 * f, "#ffe600", 24);
      // right: next pieces and controls
      text("NEXT", rx + pw / 2, by + pad, "#26ffcb", 17);
      g.bag.slice(0, 3).forEach((n, i) => miniPiece(ctx, n, rx + pw / 2, by + pad + cell * (2.6 + i * 3), cell * 0.8));
      const cy = by + bh * 0.62;
      [["← →", "MOVE"], ["↑  Z", "ROTATE"], ["↓", "SOFT DROP"], ["SPACE", "SLAM"], ["C", "HOLD"]].forEach(([k, what], i) => {
        text(k, rx + pad, cy + i * 30 * f, "#26ffcb", 16, "left");
        text(what, rx + pw - pad, cy + i * 30 * f, "#ffffff", 16, "right");
      });
    }
    if (g.banner.t > 0) {
      ctx.globalAlpha = clamp(g.banner.t, 0, 1);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = font(50);
      ctx.fillText(g.banner.text, bx + (COLS * cell) / 2, by + ROWS * cell * 0.35);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
