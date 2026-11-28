// Cyber Siege: a top-down twin-stick shooter in a rainy neon city. Dash, EMP, waves and a boss.

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const CFG = {
  easy: { hp: 0.75, dmg: 0.7, spd: 0.9, max: 130 },
  medium: { hp: 1, dmg: 1, spd: 1, max: 100 },
  hard: { hp: 1.3, dmg: 1.3, spd: 1.1, max: 100 },
};
const OBS = [[0.14, 0.2, 0.1, 0.07], [0.76, 0.2, 0.1, 0.07], [0.14, 0.72, 0.1, 0.07], [0.76, 0.72, 0.1, 0.07], [0.44, 0.4, 0.12, 0.12], [0.3, 0.5, 0.035, 0.13], [0.665, 0.5, 0.035, 0.13]];
const SPEC = {
  drone: { hp: 1, r: 12, pts: 100, col: "#ff2bd6" },
  gunner: { hp: 3, r: 16, pts: 220, col: "#ff8a00" },
  brute: { hp: 10, r: 24, pts: 450, col: "#ffe600" },
  boss: { hp: 1, r: 50, pts: 5000, col: "#ff2d4f" },
};
const DROP_COL = { H: "#7dff6b", R: "#ffe600", S: "#26ffcb", E: "#5cc8ff" };
const SIGNS = [["RAMEN", "#ff2bd6"], ["24H", "#26ffcb"], ["BAR", "#ffe600"], ["CYBER", "#5cc8ff"], ["NOODLE", "#ff4f6b"], ["HOTEL", "#b074ff"]];

export function newGame(level, w, h) {
  const c = CFG[level] || CFG.medium;
  const g = {
    w, h, c, level, t: 0, sc: 1, started: false, state: "play",
    p: { x: w / 2, y: h * 0.78, hp: c.max, max: c.max, inv: 0, dash: 0, dcd: 0, ddx: 0, ddy: 1, cd: 0, rapid: 0, spread: 0, face: -Math.PI / 2, trail: [] },
    input: { l: 0, r: 0, u: 0, d: 0, mx: 0, my: 0, fire: 0 }, aim: { x: w / 2, y: h * 0.4 }, tp: { move: null, aim: false },
    enemies: [], queue: [], tele: [], pb: [], eb: [], parts: [], drops: [], obs: [], rain: [], puddles: [],
    wave: 0, waveWait: 0.8, score: 0, kills: 0, chain: 0, chainT: 0, emp: 0, ring: 0, flash: 0, flashCol: "255,255,255", shake: 0,
    banner: { text: "", t: 0 }, boss: null,
  };
  layout(g);
  g.puddles = Array.from({ length: 9 }, () => ({ fx: Math.random(), fy: Math.random(), fr: rnd(0.03, 0.08), col: Math.random() < 0.5 ? "255,43,214" : "38,255,203" }));
  g.rain = Array.from({ length: 120 }, () => ({ x: Math.random() * w, y: Math.random() * h, l: rnd(10, 26), v: rnd(700, 1100) }));
  return g;
}

function layout(g) {
  g.sc = clamp(Math.min(g.w, g.h * 1.5) / 760, 0.7, 2);
  g.obs = OBS.map(([fx, fy, fw, fh]) => ({ x: fx * g.w, y: fy * g.h, w: fw * g.w, h: fh * g.h }));
}
export function resize(g, w, h) {
  g.w = w; g.h = h;
  layout(g);
  g.p.x = clamp(g.p.x, 20, w - 20);
  g.p.y = clamp(g.p.y, 20, h - 20);
}
export function idle(g, dt) { g.t += dt; rain(g, dt); }
export const result = (g) => [["Wave", g.wave], ["Kills", g.kills]];

/* ---------- input ---------- */

export function key(g, k, down, repeat) {
  const m = { a: "l", A: "l", ArrowLeft: "l", d: "r", D: "r", ArrowRight: "r", w: "u", W: "u", ArrowUp: "u", s: "d", S: "d", ArrowDown: "d" };
  if (m[k]) g.input[m[k]] = down ? 1 : 0;
  else if (down && !repeat && (k === " " || k === "Shift")) dash(g);
  else if (down && !repeat && (k === "q" || k === "Q" || k === "e" || k === "E")) emp(g);
}
export function pointer(g, x, y, phase, type) {
  if (type === "mouse") {
    g.aim.x = x; g.aim.y = y;
    if (phase === "down") g.input.fire = 1;
    if (phase === "up") g.input.fire = 0;
    return;
  }
  // touch: left half drives a thumb stick, right half aims and fires
  const left = x < g.w * 0.5;
  if (phase === "down") {
    if (left) g.tp.move = { ox: x, oy: y };
    else { g.tp.aim = true; g.aim.x = x; g.aim.y = y; g.input.fire = 1; }
  } else if (phase === "move") {
    if (g.tp.aim && !left) { g.aim.x = x; g.aim.y = y; }
    else if (g.tp.move && left) {
      const dx = x - g.tp.move.ox, dy = y - g.tp.move.oy, d = Math.hypot(dx, dy);
      g.input.mx = d > 12 ? dx / Math.max(d, 60) : 0;
      g.input.my = d > 12 ? dy / Math.max(d, 60) : 0;
    }
  } else if (phase === "up") {
    if (g.tp.aim && !left) { g.tp.aim = false; g.input.fire = 0; }
    else { g.tp.move = null; g.input.mx = 0; g.input.my = 0; }
  }
}

function dash(g) {
  const p = g.p;
  if (p.dcd > 0) return;
  let dx = g.input.r - g.input.l + g.input.mx, dy = g.input.d - g.input.u + g.input.my;
  if (!dx && !dy) { dx = Math.cos(p.face); dy = Math.sin(p.face); }
  const d = Math.hypot(dx, dy) || 1;
  p.ddx = dx / d; p.ddy = dy / d;
  p.dash = 0.18; p.dcd = 1.1; p.inv = Math.max(p.inv, 0.25);
}
function emp(g) {
  if (g.emp < 1) return;
  g.emp = 0; g.ring = 0.6; g.eb = [];
  g.enemies.forEach((e) => { e.hp -= 5; e.hit = 0.15; });
  if (g.boss) { g.boss.hp -= 20; g.boss.hit = 0.15; }
  g.flash = 0.5; g.flashCol = "92,200,255"; g.shake = 0.5;
}

/* ---------- effects ---------- */

function burst(g, x, y, col, n, speed = 220, life = 0.5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rnd(0.3, 1) * speed * g.sc;
    g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.4, 1) * life, max: life, col, r: rnd(1.5, 3.5) * g.sc });
  }
}
function rain(g, dt) {
  for (const r of g.rain) {
    r.y += r.v * g.sc * dt; r.x -= r.v * 0.18 * g.sc * dt;
    if (r.y > g.h || r.x < -20) { r.y = -r.l; r.x = Math.random() * (g.w + 200); }
  }
}
function pushOut(g, e, r) {
  for (const o of g.obs) {
    const cx = clamp(e.x, o.x, o.x + o.w), cy = clamp(e.y, o.y, o.y + o.h);
    let dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
    if (d < r) {
      if (d === 0) { dx = 0; dy = -1; d = 1; }
      e.x += (dx / d) * (r - d);
      e.y += (dy / d) * (r - d);
    }
  }
  e.x = clamp(e.x, r, g.w - r);
  e.y = clamp(e.y, r, g.h - r);
}
const hitsObs = (g, x, y) => g.obs.some((o) => x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h);

/* ---------- waves ---------- */

function startWave(g) {
  g.wave++;
  const n = g.wave;
  g.queue = [];
  if (n % 5 === 0) {
    g.banner = { text: "WARDEN-9 INBOUND", t: 2.4 };
    g.queue.push({ t: 0.5, type: "boss" });
    for (let i = 0; i < 4; i++) g.queue.push({ t: 2 + i * 1.2, type: "drone" });
    return;
  }
  g.banner = { text: `WAVE ${n}`, t: 1.8 };
  const count = Math.min(40, 5 + n * 2);
  let t = 0.3;
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let type = "drone";
    if (n >= 2 && r > 0.7) type = "gunner";
    if (n >= 4 && r > 0.88) type = "brute";
    g.queue.push({ t, type });
    t += rnd(0.35, 0.9) / (1 + n * 0.03);
  }
}
function telegraph(g, type) {
  let x, y;
  if (type === "boss") { x = g.w / 2; y = g.h * 0.18; }
  else {
    const side = Math.floor(Math.random() * 4), m = 40 * g.sc;
    x = side === 0 ? m : side === 1 ? g.w - m : rnd(m, g.w - m);
    y = side === 2 ? m : side === 3 ? g.h - m : rnd(m, g.h - m);
    if (Math.hypot(x - g.p.x, y - g.p.y) < 220 * g.sc) { x = g.w - x; y = g.h - y; }
  }
  g.tele.push({ x, y, type, t: type === "boss" ? 1.4 : 0.8 });
}
function spawn(g, type, x, y) {
  const sp = SPEC[type], c = g.c;
  const hp = type === "boss" ? Math.round((150 + (g.wave / 5 - 1) * 110) * c.hp) : Math.max(1, Math.ceil(sp.hp * c.hp * (1 + g.wave * 0.04)));
  const e = { type, x, y, hp, max: hp, r: sp.r * g.sc, col: sp.col, pts: sp.pts, t: 0, hit: 0, cd: rnd(0.6, 1.6), st: 0, vx: 0, vy: 0, ang: 0 };
  if (type === "boss") g.boss = e;
  g.enemies.push(e);
}

/* ---------- combat ---------- */

function ebullet(g, x, y, ang, speed, r = 5) {
  g.eb.push({ x, y, vx: Math.cos(ang) * speed * g.sc * g.c.spd, vy: Math.sin(ang) * speed * g.sc * g.c.spd, r: r * g.sc });
}
function hurt(g, dmg) {
  const p = g.p;
  if (p.inv > 0 || p.dash > 0) return;
  p.hp -= dmg * g.c.dmg;
  p.inv = 0.7;
  g.shake = 0.5;
  g.flash = 0.3; g.flashCol = "255,40,80";
  burst(g, p.x, p.y, "#ff2d4f", 12, 260);
  if (p.hp <= 0) { p.hp = 0; g.state = "over"; }
}
function killEnemy(g, e) {
  g.kills++;
  g.chain++; g.chainT = 2.2;
  g.score += e.pts * Math.min(5, 1 + Math.floor(g.chain / 4));
  g.emp = Math.min(1, g.emp + (e.type === "boss" ? 1 : 0.06));
  burst(g, e.x, e.y, e.col, e.type === "boss" ? 50 : 16, e.type === "boss" ? 420 : 240, e.type === "boss" ? 1 : 0.6);
  g.shake = Math.max(g.shake, e.type === "brute" ? 0.3 : 0.1);
  if (Math.random() < (e.type === "boss" ? 1 : 0.13)) g.drops.push({ x: e.x, y: e.y, t: "HRSE"[Math.floor(Math.random() * 4)], life: 10 });
  if (e.type === "boss") { g.boss = null; g.flash = 0.7; g.flashCol = "255,255,255"; g.eb = []; g.banner = { text: "WARDEN DOWN", t: 2 }; g.p.hp = Math.min(g.p.max, g.p.hp + 40); }
}

export function update(g, dt) {
  const sc = g.sc, p = g.p;
  g.t += dt;
  rain(g, dt);
  g.chainT -= dt; if (g.chainT <= 0) g.chain = 0;

  // player
  p.inv = Math.max(0, p.inv - dt);
  p.dcd = Math.max(0, p.dcd - dt);
  p.rapid = Math.max(0, p.rapid - dt);
  p.spread = Math.max(0, p.spread - dt);
  p.face = Math.atan2(g.aim.y - p.y, g.aim.x - p.x);
  let dx = g.input.r - g.input.l + g.input.mx, dy = g.input.d - g.input.u + g.input.my;
  const dl = Math.hypot(dx, dy);
  if (dl > 1) { dx /= dl; dy /= dl; }
  if (p.dash > 0) {
    p.dash -= dt;
    p.x += p.ddx * 900 * sc * dt; p.y += p.ddy * 900 * sc * dt;
    p.trail.push({ x: p.x, y: p.y, a: 0.5 });
  } else { p.x += dx * 300 * sc * dt; p.y += dy * 300 * sc * dt; }
  pushOut(g, p, 14 * sc);
  p.trail.forEach((q) => (q.a -= dt * 2.5));
  p.trail = p.trail.filter((q) => q.a > 0);

  // shooting
  p.cd -= dt;
  if (g.input.fire && p.cd <= 0) {
    p.cd = p.rapid > 0 ? 0.07 : 0.14;
    const angs = p.spread > 0 ? [-0.2, 0, 0.2] : [0];
    for (const d of angs) g.pb.push({ x: p.x + Math.cos(p.face) * 20 * sc, y: p.y + Math.sin(p.face) * 20 * sc, vx: Math.cos(p.face + d + rnd(-0.02, 0.02)) * 1000 * sc, vy: Math.sin(p.face + d + rnd(-0.02, 0.02)) * 1000 * sc, life: 0.9 });
  }

  // waves
  if (!g.boss && !g.queue.length && !g.tele.length && !g.enemies.length) {
    g.waveWait -= dt;
    if (g.waveWait <= 0) { startWave(g); g.waveWait = 1.6; }
  }
  if (g.queue.length) {
    g.queue.forEach((q) => (q.t -= dt));
    while (g.queue.length && g.queue[0].t <= 0) telegraph(g, g.queue.shift().type);
  }
  for (const s of g.tele) s.t -= dt;
  for (const s of g.tele) if (s.t <= 0) { spawn(g, s.type, s.x, s.y); burst(g, s.x, s.y, "#ffffff", 8, 160, 0.3); }
  g.tele = g.tele.filter((s) => s.t > 0);

  // enemies
  const spd = g.c.spd;
  for (const e of g.enemies) {
    e.t += dt; e.hit = Math.max(0, e.hit - dt);
    const ang = Math.atan2(p.y - e.y, p.x - e.x), dist = Math.hypot(p.x - e.x, p.y - e.y);
    if (e.type === "drone") {
      e.x += Math.cos(ang) * 175 * sc * spd * dt; e.y += Math.sin(ang) * 175 * sc * spd * dt;
    } else if (e.type === "gunner") {
      const want = 250 * sc, v = 120 * sc * spd;
      const k = dist > want + 40 * sc ? 1 : dist < want - 40 * sc ? -1 : 0;
      e.x += Math.cos(ang) * v * k * dt + Math.cos(ang + Math.PI / 2) * v * 0.5 * Math.sin(e.t) * dt;
      e.y += Math.sin(ang) * v * k * dt + Math.sin(ang + Math.PI / 2) * v * 0.5 * Math.sin(e.t) * dt;
      e.cd -= dt;
      if (e.cd <= 0) { ebullet(g, e.x, e.y, ang, 420, 5); e.cd = 1.5 / spd; }
    } else if (e.type === "brute") {
      e.cd -= dt;
      if (e.st === 0) {
        e.x += Math.cos(ang) * 85 * sc * spd * dt; e.y += Math.sin(ang) * 85 * sc * spd * dt;
        if (e.cd <= 0 && dist < 420 * sc) { e.st = 1; e.cd = 0.6; e.ang = ang; }
      } else if (e.st === 1) { if (e.cd <= 0) { e.st = 2; e.cd = 0.55; } }
      else { e.x += Math.cos(e.ang) * 560 * sc * spd * dt; e.y += Math.sin(e.ang) * 560 * sc * spd * dt; if (e.cd <= 0) { e.st = 0; e.cd = rnd(1.2, 2.2); } }
    } else {
      // the boss
      const frac = e.hp / e.max, ph = frac > 0.66 ? 0 : frac > 0.33 ? 1 : 2;
      const ty = g.h * 0.22;
      e.x += (g.w / 2 + Math.sin(e.t * 0.6) * g.w * 0.28 - e.x) * Math.min(1, dt * 1.2);
      e.y += (ty + Math.sin(e.t * 0.9) * g.h * 0.06 - e.y) * Math.min(1, dt * 1.2);
      e.cd -= dt * spd;
      if (e.cd <= 0) {
        if (ph === 0) { for (let i = 0; i < 12; i++) ebullet(g, e.x, e.y, (i / 12) * TAU + e.t, 230, 6); e.cd = 1.7; }
        else if (ph === 1) { for (let i = -1; i <= 1; i++) ebullet(g, e.x, e.y, ang + i * 0.16, 400, 6); e.cd = 0.7; }
        else { e.ang += 0.55; for (let i = 0; i < 3; i++) ebullet(g, e.x, e.y, e.ang + (i * TAU) / 3, 260, 6); e.cd = 0.12; }
      }
      if (ph === 2) { e.cd2 = (e.cd2 ?? 3) - dt; if (e.cd2 <= 0) { telegraph(g, "drone"); telegraph(g, "drone"); e.cd2 = 3.5; } }
    }
    pushOut(g, e, e.r * 0.8);
    // touching the player
    if (dist < e.r + 12 * sc) {
      if (e.type === "drone") { hurt(g, 18); e.hp = 0; burst(g, e.x, e.y, "#ff2bd6", 14); }
      else if (e.type === "brute" && e.st === 2) hurt(g, 28);
      else if (e.type === "boss") hurt(g, 22);
    }
  }

  // bullets
  for (const q of g.pb) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (hitsObs(g, q.x, q.y)) { q.life = 0; burst(g, q.x, q.y, "#26ffcb", 3, 120, 0.2); } }
  for (const q of g.pb) {
    if (q.life <= 0) continue;
    for (const e of g.enemies) if (e.hp > 0 && Math.hypot(q.x - e.x, q.y - e.y) < e.r) { e.hp -= 1; e.hit = 0.08; q.life = 0; burst(g, q.x, q.y, e.col, 3, 140, 0.25); break; }
  }
  g.pb = g.pb.filter((q) => q.life > 0 && q.x > -20 && q.x < g.w + 20 && q.y > -20 && q.y < g.h + 20);
  for (const e of g.enemies) if (e.hp <= 0) killEnemy(g, e);
  g.enemies = g.enemies.filter((e) => e.hp > 0);
  for (const q of g.eb) {
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (hitsObs(g, q.x, q.y)) q.dead = true;
    else if (Math.hypot(q.x - p.x, q.y - p.y) < q.r + 11 * sc) { q.dead = true; hurt(g, 12); }
  }
  g.eb = g.eb.filter((q) => !q.dead && q.x > -30 && q.x < g.w + 30 && q.y > -30 && q.y < g.h + 30);

  // drops
  for (const d of g.drops) {
    d.life -= dt;
    if (Math.hypot(d.x - p.x, d.y - p.y) < 26 * sc) {
      d.life = 0;
      if (d.t === "H") p.hp = Math.min(p.max, p.hp + 30);
      else if (d.t === "R") p.rapid = 10;
      else if (d.t === "S") p.spread = 12;
      else g.emp = Math.min(1, g.emp + 0.5);
      burst(g, d.x, d.y, DROP_COL[d.t], 10, 180, 0.4);
    }
  }
  g.drops = g.drops.filter((d) => d.life > 0);

  for (const q of g.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; q.vx *= 0.97; q.vy *= 0.97; }
  g.parts = g.parts.filter((q) => q.life > 0);
  g.shake = Math.max(0, g.shake - dt * 1.8);
  g.flash = Math.max(0, g.flash - dt * 1.8);
  g.ring = Math.max(0, g.ring - dt);
  g.banner.t = Math.max(0, g.banner.t - dt);
}

/* ---------- drawing ---------- */

export function draw(ctx, g, t) {
  const { w, h, sc } = g;
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 16 * g.shake, (Math.random() - 0.5) * 16 * g.shake);

  // wet street
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#07061a");
  bg.addColorStop(1, "#0d0820");
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  for (const pd of g.puddles) {
    const gr = ctx.createRadialGradient(pd.fx * w, pd.fy * h, 0, pd.fx * w, pd.fy * h, pd.fr * w);
    gr.addColorStop(0, `rgba(${pd.col},0.16)`);
    gr.addColorStop(1, `rgba(${pd.col},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  }
  const gs = 64 * sc;
  ctx.lineWidth = 1;
  for (let i = 0, x = 0; x < w; x += gs, i++) { ctx.strokeStyle = i % 4 ? "rgba(92,200,255,0.05)" : "rgba(255,43,214,0.12)"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let i = 0, y = 0; y < h; y += gs, i++) { ctx.strokeStyle = i % 4 ? "rgba(92,200,255,0.05)" : "rgba(255,43,214,0.12)"; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // neon signs along the top edge
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  SIGNS.forEach(([txt, col], i) => {
    const x = ((i + 0.5) / SIGNS.length) * w, flick = Math.sin(t * 3 + i * 7) > -0.92 ? 1 : 0.25;
    ctx.globalAlpha = 0.5 * flick;
    ctx.fillStyle = col;
    ctx.font = `${Math.round(22 * sc)}px Impact, "Arial Black", sans-serif`;
    ctx.fillText(txt, x, 20 * sc);
    ctx.fillRect(x - 40 * sc, 36 * sc, 80 * sc, 2 * sc);
  });
  ctx.globalAlpha = 1;

  // cover
  for (const o of g.obs) {
    ctx.fillStyle = "#120c24";
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = "#1c1236";
    ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
    ctx.strokeStyle = "#ff2bd6";
    ctx.lineWidth = 2 * sc;
    ctx.strokeRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = "rgba(38,255,203,0.6)";
    ctx.strokeRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
  }

  if (g.started) {
    for (const s of g.tele) {
      ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t * 20)})`;
      ctx.lineWidth = 2 * sc;
      ctx.beginPath();
      ctx.arc(s.x, s.y, SPEC[s.type].r * sc * (1 + s.t), 0, TAU);
      ctx.stroke();
    }
    for (const d of g.drops) {
      const col = DROP_COL[d.t];
      ctx.strokeStyle = col; ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.lineWidth = 3 * sc;
      ctx.beginPath(); ctx.arc(d.x, d.y, 13 * sc * (1 + 0.1 * Math.sin(t * 8)), 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.font = `${Math.round(14 * sc)}px Impact, Arial Black, sans-serif`; ctx.textBaseline = "middle"; ctx.fillText(d.t, d.x, d.y + 1);
    }
    for (const e of g.enemies) drawEnemy(ctx, g, e, t);

    // the runner
    const p = g.p;
    ctx.globalCompositeOperation = "lighter";
    for (const q of p.trail) { ctx.globalAlpha = q.a; ctx.fillStyle = "#26ffcb"; ctx.beginPath(); ctx.arc(q.x, q.y, 12 * sc, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (!(p.inv > 0 && Math.floor(t * 20) % 2)) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.face);
      ctx.fillStyle = "#06101a";
      ctx.beginPath(); ctx.arc(0, 0, 14 * sc, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#26ffcb"; ctx.lineWidth = 3 * sc; ctx.stroke();
      ctx.fillStyle = "#ff2bd6"; ctx.fillRect(2 * sc, -4 * sc, 14 * sc, 8 * sc);
      ctx.fillStyle = "#e8fffb"; ctx.fillRect(14 * sc, -2 * sc, 16 * sc, 4 * sc);
      ctx.restore();
    }

    ctx.globalCompositeOperation = "lighter";
    for (const q of g.pb) { ctx.strokeStyle = "#9bffe8"; ctx.lineWidth = 3 * sc; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.016, q.y - q.vy * 0.016); ctx.stroke(); }
    for (const q of g.eb) {
      ctx.fillStyle = "rgba(255,40,100,0.9)"; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 1.4, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.55, 0, TAU); ctx.fill();
    }
    for (const q of g.parts) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (g.ring > 0) { ctx.strokeStyle = `rgba(92,200,255,${g.ring})`; ctx.lineWidth = 8 * sc; ctx.beginPath(); ctx.arc(p.x, p.y, (0.6 - g.ring) * Math.max(w, h) * 1.4, 0, TAU); ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over";
  }

  // rain and scanlines
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(160,200,255,0.22)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const r of g.rain) { ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.l * 0.18, r.y - r.l); }
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  if (g.flash > 0) { ctx.fillStyle = `rgba(${g.flashCol},${g.flash * 0.45})`; ctx.fillRect(-20, -20, w + 40, h + 40); }
  ctx.restore();
  if (g.started) hud(ctx, g, t);
}

function drawEnemy(ctx, g, e, t) {
  const sc = g.sc;
  ctx.save();
  ctx.translate(e.x, e.y);
  const face = Math.atan2(g.p.y - e.y, g.p.x - e.x);
  ctx.lineWidth = 3 * sc;
  ctx.strokeStyle = e.col;
  ctx.fillStyle = e.hit > 0 ? "#ffffff" : "#13091f";
  if (e.type === "drone") {
    ctx.rotate(t * 4);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; ctx.lineTo(Math.cos(a) * e.r * 1.2, Math.sin(a) * e.r * 1.2); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff4f6b"; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.3, 0, TAU); ctx.fill();
  } else if (e.type === "gunner") {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(face);
    ctx.fillStyle = e.col; ctx.fillRect(e.r * 0.3, -3 * sc, e.r * 1.1, 6 * sc);
  } else if (e.type === "brute") {
    if (e.st === 1) { ctx.strokeStyle = "#fff"; ctx.rotate(Math.sin(t * 40) * 0.05); }
    ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
    ctx.strokeRect(-e.r, -e.r, e.r * 2, e.r * 2);
    ctx.fillStyle = e.st === 2 ? "#ff2d4f" : e.col;
    ctx.fillRect(-e.r * 0.5, -e.r * 0.25, e.r, e.r * 0.5);
  } else {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + t * 0.3; ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(-t * 0.8);
    ctx.strokeStyle = "#ffe600";
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.55, 0, TAU); ctx.stroke();
    ctx.fillStyle = "#ff2d4f"; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.25, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (e.type === "brute" || e.type === "gunner") {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(e.x - e.r, e.y - e.r - 10 * sc, e.r * 2, 4 * sc);
    ctx.fillStyle = e.col; ctx.fillRect(e.x - e.r, e.y - e.r - 10 * sc, e.r * 2 * clamp(e.hp / e.max, 0, 1), 4 * sc);
  }
}

function hud(ctx, g, t) {
  const f = g.sc, p = g.p;
  const font = (px) => `${Math.round(px * f)}px Impact, "Arial Black", sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = font(32);
  ctx.fillText(String(g.score).replace(/\B(?=(\d{3})+(?!\d))/g, ","), g.w / 2, 52 * f);
  const mult = Math.min(5, 1 + Math.floor(g.chain / 4));
  ctx.fillStyle = "#26ffcb";
  ctx.font = font(15);
  ctx.fillText(`WAVE ${g.wave}${mult > 1 ? `    x${mult} CHAIN` : ""}`, g.w / 2, 90 * f);

  // health, EMP, dash
  const bx = 18 * f, by = g.h - 74 * f, bw = 260 * f;
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 3, by - 3, bw + 6, 20 * f + 6);
  ctx.fillStyle = p.hp / p.max > 0.3 ? "#26ffcb" : "#ff2d4f"; ctx.fillRect(bx, by, bw * clamp(p.hp / p.max, 0, 1), 20 * f);
  ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = font(14);
  ctx.fillText("HEALTH", bx, by - 20 * f);
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 3, by + 26 * f - 3, bw + 6, 10 * f + 6);
  ctx.fillStyle = g.emp >= 1 ? `rgba(92,200,255,${0.7 + 0.3 * Math.sin(t * 8)})` : "#3a6f8f"; ctx.fillRect(bx, by + 26 * f, bw * g.emp, 10 * f);
  ctx.fillStyle = g.emp >= 1 ? "#5cc8ff" : "#9aa4b2"; ctx.font = font(13);
  ctx.fillText(g.emp >= 1 ? "EMP READY  [Q]" : "EMP", bx + bw + 14 * f, by + 24 * f);

  ctx.textAlign = "right";
  ctx.fillStyle = p.dcd > 0 ? "#9aa4b2" : "#ffe600"; ctx.font = font(16);
  ctx.fillText(p.dcd > 0 ? `DASH ${p.dcd.toFixed(1)}s` : "DASH READY  [SPACE]", g.w - 18 * f, g.h - 44 * f);
  const mods = [p.rapid > 0 && `RAPID ${Math.ceil(p.rapid)}s`, p.spread > 0 && `SPREAD ${Math.ceil(p.spread)}s`].filter(Boolean).join("   ");
  if (mods) { ctx.fillStyle = "#26ffcb"; ctx.font = font(14); ctx.fillText(mods, g.w - 18 * f, g.h - 68 * f); }

  if (g.boss) {
    const bw2 = Math.min(g.w * 0.5, 520 * f), x = g.w / 2 - bw2 / 2, y = 118 * f;
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - 3, y - 3, bw2 + 6, 14 * f + 6);
    ctx.fillStyle = "#ff2d4f"; ctx.fillRect(x, y, bw2 * clamp(g.boss.hp / g.boss.max, 0, 1), 14 * f);
  }
  if (g.banner.t > 0) {
    ctx.globalAlpha = clamp(g.banner.t, 0, 1); ctx.textAlign = "center"; ctx.fillStyle = "#ff2bd6"; ctx.font = font(54);
    ctx.fillText(g.banner.text, g.w / 2, g.h * 0.3); ctx.globalAlpha = 1;
  }
  // crosshair
  const a = g.aim;
  ctx.strokeStyle = "#ff2bd6"; ctx.lineWidth = 2 * f;
  ctx.beginPath(); ctx.arc(a.x, a.y, 11 * f, 0, TAU);
  ctx.moveTo(a.x - 20 * f, a.y); ctx.lineTo(a.x - 6 * f, a.y); ctx.moveTo(a.x + 6 * f, a.y); ctx.lineTo(a.x + 20 * f, a.y);
  ctx.moveTo(a.x, a.y - 20 * f); ctx.lineTo(a.x, a.y - 6 * f); ctx.moveTo(a.x, a.y + 6 * f); ctx.lineTo(a.x, a.y + 20 * f);
  ctx.stroke();
}
