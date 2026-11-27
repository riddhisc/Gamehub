// Neon Breaker: brick breaker with power-ups, tougher bricks and a new layout every level.

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const CFG = {
  easy: { ball: 520, lives: 5, paddle: 1.2 },
  medium: { ball: 600, lives: 3, paddle: 1 },
  hard: { ball: 700, lives: 3, paddle: 0.85 },
};
const HUES = [330, 20, 50, 150, 190, 260];
const PU = { E: "#26ffcb", M: "#ff4fa3", S: "#5cc8ff", L: "#ffe600", F: "#ff8a00", H: "#7dff6b" };

export function newGame(level, w, h) {
  const c = CFG[level] || CFG.medium;
  const sc = clamp(Math.min(w, h * 1.3) / 720, 0.7, 2);
  const g = {
    w, h, sc, c, level, t: 0, score: 0, lives: c.lives, lv: 0, bricks: [], balls: [], pu: [], shots: [], parts: [],
    p: { x: w / 2, w: 130 * sc * c.paddle, h: 14 * sc, y: h - 70 * sc, wide: 0, laser: 0, cd: 0, tx: null },
    stuck: true, launchT: 0, slow: 0, shake: 0, combo: 0, state: "play", started: false,
    banner: { text: "", t: 0 }, input: { l: 0, r: 0 },
  };
  nextLevel(g);
  return g;
}

export function resize(g, w, h) {
  const old = g.w;
  g.w = w; g.h = h;
  g.sc = clamp(Math.min(w, h * 1.3) / 720, 0.7, 2);
  g.p.y = h - 70 * g.sc;
  g.p.h = 14 * g.sc;
  g.p.w = 130 * g.sc * g.c.paddle;
  g.p.x = clamp(g.p.x * (w / old), 0, w);
  buildBricks(g, g.lv);
  g.balls.forEach((b) => { b.x = clamp(b.x, 0, w); b.y = Math.min(b.y, h - 90 * g.sc); b.r = 8 * g.sc; });
}
export const result = (g) => [["Level", g.lv]];

function buildBricks(g, n) {
  const cols = 10;
  const area = Math.min(g.w * 0.9, 1100 * g.sc);
  const bw = area / cols, bh = 28 * g.sc;
  const rows = Math.min(4 + n, 10);
  const x0 = (g.w - area) / 2, y0 = 100 * g.sc;
  const pattern = (n - 1) % 5;
  g.bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let on = true;
      if (pattern === 1) on = (r + c) % 2 === 0;
      else if (pattern === 2) on = c >= r % 5 && c < cols - (r % 5);
      else if (pattern === 3) on = Math.abs(c - 4.5) + Math.abs(r - rows / 2) < 6;
      else if (pattern === 4) on = c % 3 !== 1;
      if (!on) continue;
      const steel = n >= 4 && r === rows - 1 && c % 4 === 2;
      const hp = steel ? Infinity : n >= 3 && r < 2 ? 3 : n >= 2 && r < 4 ? 2 : 1;
      g.bricks.push({ x: x0 + c * bw, y: y0 + r * bh, w: bw - 3, h: bh - 3, hp, max: hp, hue: HUES[r % HUES.length], flash: 0 });
    }
  }
}

function nextLevel(g) {
  g.lv++;
  buildBricks(g, g.lv);
  g.balls = [];
  g.pu = [];
  g.shots = [];
  resetBall(g);
  g.banner = { text: `LEVEL ${g.lv}`, t: 1.8 };
}
function resetBall(g) {
  g.balls = [{ x: g.p.x, y: g.p.y - g.p.h, vx: 0, vy: 0, r: 8 * g.sc, fire: 0 }];
  g.stuck = true;
  g.launchT = 0;
}
function speedOf(g) { return g.c.ball * g.sc * (1 + 0.05 * (g.lv - 1)) * (g.slow > 0 ? 0.7 : 1); }
function launch(g) {
  if (!g.stuck) return;
  g.stuck = false;
  const a = rnd(-0.3, 0.3), s = speedOf(g);
  g.balls.forEach((b) => { b.vx = Math.sin(a) * s; b.vy = -Math.cos(a) * s; });
}

export function key(g, k, down) {
  if (k === "ArrowLeft" || k === "a" || k === "A") { g.input.l = down ? 1 : 0; if (down) g.p.tx = null; }
  else if (k === "ArrowRight" || k === "d" || k === "D") { g.input.r = down ? 1 : 0; if (down) g.p.tx = null; }
  else if (k === " " && down) launch(g);
}
export function pointer(g, x, y, phase) {
  g.p.tx = x;
  if (phase === "down") launch(g);
}

function burst(g, x, y, hue, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rnd(0.3, 1) * 260 * g.sc;
    g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.7), max: 0.7, hue, r: rnd(1.5, 3.2) * g.sc });
  }
}

function hitBrick(g, b, dmg) {
  b.flash = 0.1;
  if (b.hp === Infinity) { burst(g, b.x + b.w / 2, b.y + b.h / 2, 210, 3); return; }
  b.hp -= dmg;
  if (b.hp <= 0) {
    b.dead = true;
    g.combo++;
    g.score += 10 * b.max * Math.min(5, 1 + Math.floor(g.combo / 5));
    burst(g, b.x + b.w / 2, b.y + b.h / 2, b.hue, 10);
    g.shake = Math.max(g.shake, 0.06);
    if (Math.random() < 0.14) {
      const t = "EMSLFH"[Math.floor(Math.random() * 6)];
      g.pu.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, t, life: 0 });
    }
  } else burst(g, b.x + b.w / 2, b.y + b.h / 2, b.hue, 3);
}

function applyPu(g, t) {
  const p = g.p;
  if (t === "E") p.wide = 12;
  else if (t === "S") g.slow = 8;
  else if (t === "L") p.laser = 10;
  else if (t === "F") g.balls.forEach((b) => (b.fire = 7));
  else if (t === "H") g.lives = Math.min(6, g.lives + 1);
  else if (t === "M") {
    const add = [];
    g.balls.forEach((b) => {
      const s = Math.hypot(b.vx, b.vy) || speedOf(g);
      const a = Math.atan2(b.vx, -b.vy);
      [-0.4, 0.4].forEach((d) => add.push({ ...b, vx: Math.sin(a + d) * s, vy: -Math.cos(a + d) * s }));
    });
    g.balls.push(...add.slice(0, 4));
  }
  g.score += 25;
}

export function update(g, dt) {
  const p = g.p, sc = g.sc;
  g.t += dt;
  // paddle
  if (g.input.l || g.input.r) p.x += (g.input.r - g.input.l) * 950 * sc * dt;
  else if (p.tx !== null) p.x += (p.tx - p.x) * Math.min(1, dt * 20);
  const pw = p.w * (p.wide > 0 ? 1.6 : 1);
  p.x = clamp(p.x, pw / 2, g.w - pw / 2);
  p.wide = Math.max(0, p.wide - dt);
  p.laser = Math.max(0, p.laser - dt);
  g.slow = Math.max(0, g.slow - dt);

  if (g.stuck) {
    g.balls.forEach((b) => { b.x = p.x; b.y = p.y - p.h / 2 - b.r; });
    g.launchT += dt;
    if (g.launchT > 2.2) launch(g);
  }

  // balls in two small steps so fast balls can't skip through bricks
  for (let s = 0; s < 2 && !g.stuck; s++) {
    const d = dt / 2;
    for (const b of g.balls) {
      b.fire = Math.max(0, b.fire - d);
      b.x += b.vx * d;
      b.y += b.vy * d;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > g.w - b.r) { b.x = g.w - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
      if (b.vy > 0 && b.y + b.r > p.y - p.h / 2 && b.y - b.r < p.y + p.h / 2 && Math.abs(b.x - p.x) < pw / 2 + b.r) {
        const k = clamp((b.x - p.x) / (pw / 2), -0.95, 0.95);
        const sp = Math.max(Math.hypot(b.vx, b.vy), speedOf(g));
        b.vx = Math.sin(k * 1.15) * sp;
        b.vy = -Math.cos(k * 1.15) * sp;
        b.y = p.y - p.h / 2 - b.r;
        g.combo = 0;
      }
      for (const br of g.bricks) {
        if (br.dead) continue;
        const cx = clamp(b.x, br.x, br.x + br.w), cy = clamp(b.y, br.y, br.y + br.h);
        const nx = b.x - cx, ny = b.y - cy;
        if (nx * nx + ny * ny < b.r * b.r) {
          const fire = b.fire > 0 && br.hp !== Infinity;
          hitBrick(g, br, fire ? 3 : 1);
          if (!fire) {
            if (Math.abs(nx) > Math.abs(ny)) { b.vx = (nx >= 0 ? 1 : -1) * Math.abs(b.vx); b.x += nx >= 0 ? 1 : -1; }
            else { b.vy = (ny > 0 ? 1 : -1) * Math.abs(b.vy); if (ny === 0) b.vy = -b.vy; }
            break;
          }
        }
      }
    }
  }
  g.bricks = g.bricks.filter((b) => !b.dead);
  g.bricks.forEach((b) => (b.flash = Math.max(0, b.flash - dt)));

  // laser
  if (p.laser > 0) {
    p.cd -= dt;
    if (p.cd <= 0) { p.cd = 0.3; [-1, 1].forEach((s) => g.shots.push({ x: p.x + s * pw * 0.4, y: p.y - p.h })); }
  }
  for (const s of g.shots) {
    s.y -= 900 * sc * dt;
    for (const br of g.bricks) if (!br.dead && !s.dead && s.x > br.x && s.x < br.x + br.w && s.y < br.y + br.h && s.y > br.y - 10) { s.dead = true; hitBrick(g, br, 1); }
  }
  g.shots = g.shots.filter((s) => !s.dead && s.y > -20);
  g.bricks = g.bricks.filter((b) => !b.dead);

  // power-ups
  for (const u of g.pu) {
    u.y += 170 * sc * dt;
    u.life += dt;
    if (Math.abs(u.x - p.x) < pw / 2 + 14 * sc && Math.abs(u.y - p.y) < 22 * sc) { u.dead = true; applyPu(g, u.t); burst(g, u.x, u.y, 160, 8); }
  }
  g.pu = g.pu.filter((u) => !u.dead && u.y < g.h + 30);

  // lost balls
  g.balls = g.balls.filter((b) => b.y - b.r < g.h);
  if (!g.balls.length && !g.stuck) {
    g.lives--;
    g.shake = 0.5;
    g.combo = 0;
    if (g.lives <= 0) g.state = "over";
    else { resetBall(g); p.wide = 0; p.laser = 0; g.slow = 0; }
  }
  if (!g.bricks.some((b) => b.hp !== Infinity)) { g.score += 500; nextLevel(g); }

  for (const q of g.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; q.vy += 300 * sc * dt; }
  g.parts = g.parts.filter((q) => q.life > 0);
  g.shake = Math.max(0, g.shake - dt * 1.6);
  g.banner.t = Math.max(0, g.banner.t - dt);
}

/* ---------- drawing ---------- */

export function draw(ctx, g, t) {
  const { w, h, sc } = g;
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * g.shake, (Math.random() - 0.5) * 14 * g.shake);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#07041a");
  bg.addColorStop(1, "#14062c");
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  ctx.strokeStyle = "rgba(125,255,230,0.05)";
  ctx.lineWidth = 1;
  const gs = 48 * sc;
  ctx.beginPath();
  for (let x = 0; x < w; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y < h; y += gs) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();

  for (const b of g.bricks) {
    const steel = b.hp === Infinity;
    const l = 55 - (b.max - b.hp) * 6;
    ctx.fillStyle = b.flash > 0 ? "#fff" : steel ? "#56606b" : `hsl(${b.hue} 90% ${l}%)`;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(b.x, b.y, b.w, b.h * 0.3);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(b.x, b.y + b.h * 0.8, b.w, b.h * 0.2);
    if (b.max > 1 && !steel) { ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillRect(b.x + b.w / 2 - 3 * sc, b.y + b.h / 2 - 3 * sc, 6 * sc, 6 * sc); }
  }

  ctx.globalCompositeOperation = "lighter";
  for (const s of g.shots) { ctx.fillStyle = "#ffe600"; ctx.fillRect(s.x - 2 * sc, s.y - 12 * sc, 4 * sc, 18 * sc); }
  for (const q of g.parts) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = `hsl(${q.hue} 100% 60%)`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const b of g.balls) {
    const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3);
    gr.addColorStop(0, b.fire > 0 ? "rgba(255,150,40,0.9)" : "rgba(120,255,230,0.8)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 3, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  for (const b of g.balls) { ctx.fillStyle = b.fire > 0 ? "#ffd9a0" : "#ffffff"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }

  const p = g.p, pw = p.w * (p.wide > 0 ? 1.6 : 1);
  const pg = ctx.createLinearGradient(0, p.y - p.h / 2, 0, p.y + p.h / 2);
  pg.addColorStop(0, "#eafffb");
  pg.addColorStop(1, p.laser > 0 ? "#ffcf3a" : "#1fd8b0");
  ctx.fillStyle = pg;
  ctx.fillRect(p.x - pw / 2, p.y - p.h / 2, pw, p.h);
  ctx.fillStyle = "#ff4fa3";
  ctx.fillRect(p.x - pw / 2 - 5 * sc, p.y - p.h / 2, 5 * sc, p.h);
  ctx.fillRect(p.x + pw / 2, p.y - p.h / 2, 5 * sc, p.h);

  for (const u of g.pu) {
    ctx.strokeStyle = PU[u.t]; ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.lineWidth = 3 * sc;
    ctx.beginPath(); ctx.arc(u.x, u.y, 13 * sc, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PU[u.t]; ctx.font = `${Math.round(14 * sc)}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(u.t, u.x, u.y + 1);
  }
  ctx.restore();
  if (g.started) hud(ctx, g);
}

function hud(ctx, g) {
  const f = g.sc;
  const font = (px) => `${Math.round(px * f)}px Impact, "Arial Black", sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = font(30);
  ctx.fillText(String(g.score), g.w / 2, 14 * f);
  ctx.fillStyle = "#26ffcb";
  ctx.font = font(15);
  ctx.fillText(`LEVEL ${g.lv}${g.combo > 4 ? `   COMBO x${Math.min(5, 1 + Math.floor(g.combo / 5))}` : ""}`, g.w / 2, 50 * f);
  ctx.textAlign = "left";
  ctx.fillStyle = "#ff4fa3";
  ctx.font = font(18);
  ctx.fillText("♥".repeat(g.lives), 18 * f, g.h - 36 * f);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffe600";
  ctx.font = font(15);
  const tags = [g.p.wide > 0 && "WIDE", g.p.laser > 0 && "LASER", g.slow > 0 && "SLOW", g.balls.some((b) => b.fire > 0) && "FIRE"].filter(Boolean);
  ctx.fillText(tags.join("  "), g.w - 18 * f, g.h - 34 * f);
  if (g.stuck) { ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = font(18); ctx.fillText("CLICK, TAP OR PRESS SPACE TO LAUNCH", g.w / 2, g.p.y - 70 * f); }
  if (g.banner.t > 0) {
    ctx.globalAlpha = clamp(g.banner.t, 0, 1);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = font(54);
    ctx.fillText(g.banner.text, g.w / 2, g.h * 0.55);
    ctx.globalAlpha = 1;
  }
}
