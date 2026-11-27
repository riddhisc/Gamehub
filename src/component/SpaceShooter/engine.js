// Star Strike: the rules and the drawing, with no React. One plain object `g` is updated every frame.

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const LEVEL_CFG = {
  easy: { hp: 0.8, fire: 0.7, spd: 0.85, lives: 5 },
  medium: { hp: 1, fire: 1, spd: 1, lives: 3 },
  hard: { hp: 1.3, fire: 1.4, spd: 1.15, lives: 3 },
};

const SPECS = {
  scout: { hp: 1, r: 16, pts: 100, col: "#ff4fa3" },
  zig: { hp: 2, r: 18, pts: 150, col: "#ffe600" },
  gunner: { hp: 4, r: 21, pts: 250, col: "#ff8a00" },
  tank: { hp: 12, r: 30, pts: 500, col: "#b074ff" },
};

const PICK_COL = { W: "#26ffcb", S: "#5cc8ff", R: "#ffe600", B: "#ff4fa3", H: "#7dff6b" };
export const UPGRADES = [
  { id: "dmg", name: "Plasma Core", desc: "+25% weapon damage" },
  { id: "rate", name: "Overclock", desc: "+20% fire rate" },
  { id: "spd", name: "Thrusters", desc: "+15% ship speed" },
  { id: "life", name: "Repair Drone", desc: "+1 life" },
  { id: "shield", name: "Aegis", desc: "2 shield charges" },
  { id: "weapon", name: "Weapon Cache", desc: "Weapon +1 level" },
];

function makeStars(w, h) {
  return Array.from({ length: 110 }, () => ({ x: Math.random() * w, y: Math.random() * h, z: rnd(0.2, 1) }));
}

export function newGame(level, w, h) {
  const c = LEVEL_CFG[level] || LEVEL_CFG.medium;
  const g = {
    w, h, sc: clamp(Math.min(w, h * 1.1) / 720, 0.7, 2), c, level,
    t: 0, score: 0, kills: 0, lives: c.lives, wave: 0, state: "play", started: false,
    player: { x: w / 2, y: h * 0.82, cd: 0, wpn: 1, rapid: 0, inv: 0, shield: 0, tx: null, ty: null },
    input: { l: 0, r: 0, u: 0, d: 0 },
    enemies: [], pb: [], eb: [], pick: [], parts: [], stars: makeStars(w, h),
    queue: [], qt: 0, waveWait: 0.8, boss: null, opts: [],
    up: { dmg: 1, rate: 1, spd: 1 }, shake: 0, flash: 0, banner: { text: "", t: 0 },
  };
  return g;
}

export function resizeGame(g, w, h) {
  g.w = w;
  g.h = h;
  g.sc = clamp(Math.min(w, h * 1.1) / 720, 0.7, 2);
  g.stars = makeStars(w, h);
  g.player.x = clamp(g.player.x, 0, w);
  g.player.y = clamp(g.player.y, 0, h);
}

export function updateStars(g, dt) {
  for (const s of g.stars) {
    s.y += s.z * 70 * g.sc * dt;
    if (s.y > g.h) { s.y = -2; s.x = Math.random() * g.w; }
  }
}

/* ---------- waves ---------- */

function startWave(g) {
  g.wave++;
  const n = g.wave;
  if (n % 5 === 0) {
    g.banner = { text: "BOSS INCOMING", t: 2.4 };
    const idx = n / 5;
    const max = Math.round((140 + (idx - 1) * 110) * g.c.hp);
    g.boss = { x: g.w / 2, y: -120 * g.sc, hp: max, max, r: 66 * g.sc, t: 0, cd: 1.5, cd2: 4, hit: 0, ang: 0, idx };
    g.queue = [];
    return;
  }
  g.banner = { text: `WAVE ${n}`, t: 2 };
  const q = [];
  let t = 0;
  const count = 5 + Math.floor(n * 1.8);
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let type = "scout";
    if (n >= 2 && r > 0.62) type = "zig";
    if (n >= 3 && r > 0.8) type = "gunner";
    if (n >= 6 && r > 0.92) type = "tank";
    q.push({ t, type, x: rnd(0.1, 0.9) });
    t += rnd(0.35, 0.9) / (1 + n * 0.03);
  }
  g.queue = q;
  g.qt = 0;
}

function spawn(g, type, xf) {
  const sp = SPECS[type];
  const hp = Math.max(1, Math.ceil(sp.hp * g.c.hp * (1 + g.wave * 0.05)));
  const x = xf * g.w;
  g.enemies.push({ type, x, x0: x, y: -40 * g.sc, hp, max: hp, r: sp.r * g.sc, col: sp.col, pts: sp.pts, t: 0, hit: 0, ph: rnd(0, TAU), vx: Math.random() < 0.5 ? -1 : 1, cd: rnd(0.6, 1.6) });
}

/* ---------- shooting ---------- */

function ebullet(g, x, y, ang, speed, r = 5) {
  g.eb.push({ x, y, vx: Math.sin(ang) * speed * g.sc * g.c.spd, vy: Math.cos(ang) * speed * g.sc * g.c.spd, r: r * g.sc });
}
const aim = (g, x, y) => Math.atan2(g.player.x - x, g.player.y - y);

function playerFire(g) {
  const p = g.player;
  const dmg = g.up.dmg;
  const mk = (dx, a) => g.pb.push({ x: p.x + dx * g.sc, y: p.y - 22 * g.sc, vx: Math.sin(a) * 780 * g.sc, vy: -Math.cos(a) * 780 * g.sc, dmg, r: 4 * g.sc });
  if (p.wpn === 1) mk(0, 0);
  else if (p.wpn === 2) { mk(-9, 0); mk(9, 0); }
  else if (p.wpn === 3) { mk(0, 0); mk(-12, -0.12); mk(12, 0.12); }
  else if (p.wpn === 4) { mk(-9, 0); mk(9, 0); mk(-18, -0.2); mk(18, 0.2); }
  else { mk(0, 0); mk(-10, -0.1); mk(10, 0.1); mk(-20, -0.25); mk(20, 0.25); }
}

/* ---------- effects ---------- */

function burst(g, x, y, col, n, speed = 200, life = 0.6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rnd(0.3, 1) * speed * g.sc;
    g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.4, 1) * life, max: life, col, r: rnd(1.5, 3.5) * g.sc });
  }
}

function drop(g, x, y, boost) {
  if (Math.random() > 0.12 + boost) return;
  const r = Math.random();
  const type = r < 0.38 ? "W" : r < 0.6 ? "S" : r < 0.8 ? "R" : r < 0.92 ? "B" : "H";
  g.pick.push({ x, y, type, t: 0 });
}

function kill(g, e) {
  g.score += e.pts;
  g.kills++;
  burst(g, e.x, e.y, e.col, 16);
  burst(g, e.x, e.y, "#ffffff", 6, 120, 0.4);
  drop(g, e.x, e.y, e.type === "tank" ? 0.4 : e.type === "gunner" ? 0.12 : 0);
  g.shake = Math.max(g.shake, e.type === "tank" ? 0.25 : 0.08);
}

function killBoss(g) {
  const b = g.boss;
  g.score += 3000 * b.idx;
  for (let i = 0; i < 6; i++) burst(g, b.x + rnd(-1, 1) * b.r, b.y + rnd(-0.6, 0.6) * b.r, i % 2 ? "#ff8a00" : "#ff4fa3", 26, 340, 1);
  g.shake = 1;
  g.flash = 0.8;
  g.eb = [];
  g.enemies.forEach((e) => kill(g, e));
  g.enemies = [];
  for (let i = 0; i < 4; i++) g.pick.push({ x: b.x + rnd(-80, 80), y: b.y + rnd(-30, 30), type: i === 0 ? "W" : "SRBH"[Math.floor(Math.random() * 4)], t: 0 });
  g.boss = null;
  g.opts = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
  g.state = "pick";
}

function hitPlayer(g) {
  const p = g.player;
  if (p.inv > 0) return;
  burst(g, p.x, p.y, "#26ffcb", 14, 220);
  if (p.shield > 0) {
    p.shield--;
    p.inv = 1;
    g.shake = 0.3;
    return;
  }
  g.lives--;
  p.inv = 2.2;
  p.wpn = Math.max(1, p.wpn - 1);
  g.shake = 0.7;
  burst(g, p.x, p.y, "#ff4fa3", 24, 300);
  if (g.lives <= 0) g.state = "over";
}

function applyPickup(g, type) {
  const p = g.player;
  if (type === "W") { if (p.wpn < 5) { p.wpn++; g.banner = { text: "WEAPON UP", t: 1 }; } else g.score += 500; }
  else if (type === "S") p.shield = Math.min(2, p.shield + 1);
  else if (type === "R") p.rapid = 8;
  else if (type === "H") g.lives = Math.min(6, g.lives + 1);
  else if (type === "B") {
    g.flash = 0.7;
    g.eb = [];
    g.enemies.forEach((e) => { e.hp -= 6; e.hit = 0.1; });
    if (g.boss) { g.boss.hp -= 25; g.boss.hit = 0.1; }
    g.banner = { text: "BOMB!", t: 0.8 };
  }
  g.score += 50;
}

export function applyUpgrade(g, id) {
  const p = g.player;
  if (id === "dmg") g.up.dmg *= 1.25;
  else if (id === "rate") g.up.rate *= 1.2;
  else if (id === "spd") g.up.spd *= 1.15;
  else if (id === "life") g.lives = Math.min(6, g.lives + 1);
  else if (id === "shield") p.shield = 2;
  else if (id === "weapon") p.wpn = Math.min(5, p.wpn + 1);
  g.state = "play";
  g.waveWait = 1.4;
}

/* ---------- one step of the game ---------- */

export function update(g, dt) {
  const sc = g.sc;
  g.t += dt;
  const p = g.player;
  updateStars(g, dt);

  // player movement: keys, or follow the pointer
  const k = g.input;
  const speed = 520 * sc * g.up.spd;
  if (k.l || k.r || k.u || k.d) {
    p.x += (k.r - k.l) * speed * dt;
    p.y += (k.d - k.u) * speed * dt;
    p.tx = null;
  } else if (p.tx !== null) {
    const f = Math.min(1, dt * 14);
    p.x += (p.tx - p.x) * f;
    p.y += (p.ty - p.y) * f;
  }
  p.x = clamp(p.x, 20 * sc, g.w - 20 * sc);
  p.y = clamp(p.y, g.h * 0.25, g.h - 30 * sc);
  p.inv = Math.max(0, p.inv - dt);
  p.rapid = Math.max(0, p.rapid - dt);

  // auto fire
  p.cd -= dt;
  if (p.cd <= 0) {
    playerFire(g);
    p.cd = 0.24 / g.up.rate / (p.rapid > 0 ? 1.7 : 1);
  }

  // waves
  if (!g.boss && !g.queue.length && !g.enemies.length) {
    g.waveWait -= dt;
    if (g.waveWait <= 0) {
      startWave(g);
      g.waveWait = 1.6;
    }
  }
  if (g.queue.length) {
    g.qt += dt;
    while (g.queue.length && g.queue[0].t <= g.qt) {
      const q = g.queue.shift();
      spawn(g, q.type, q.x);
    }
  }

  // enemies
  for (const e of g.enemies) {
    e.t += dt;
    e.hit = Math.max(0, e.hit - dt);
    const sp = g.c.spd;
    if (e.type === "scout") {
      e.y += 130 * sc * sp * dt;
      e.x = e.x0 + Math.sin(e.t * 2 + e.ph) * 60 * sc;
    } else if (e.type === "zig") {
      e.y += 100 * sc * sp * dt;
      e.x += e.vx * 150 * sc * sp * dt;
      if (e.x < 30 * sc || e.x > g.w - 30 * sc) e.vx *= -1;
    } else {
      const stopY = e.type === "tank" ? g.h * 0.16 : g.h * 0.22;
      if (e.y < stopY) e.y += (e.type === "tank" ? 70 : 120) * sc * sp * dt;
      else {
        e.x += e.vx * (e.type === "tank" ? 40 : 90) * sc * dt;
        if (e.x < 40 * sc || e.x > g.w - 40 * sc) e.vx *= -1;
        e.cd -= dt * g.c.fire;
        if (e.cd <= 0) {
          if (e.type === "gunner") { ebullet(g, e.x, e.y, aim(g, e.x, e.y), 280); e.cd = 1.8; }
          else { const a = aim(g, e.x, e.y); [-0.3, 0, 0.3].forEach((d) => ebullet(g, e.x, e.y, a + d, 240, 6)); e.cd = 2.4; }
        }
      }
    }
  }
  g.enemies = g.enemies.filter((e) => e.y < g.h + 60 * sc);

  // boss
  const b = g.boss;
  if (b) {
    b.t += dt;
    b.hit = Math.max(0, b.hit - dt);
    const targetY = g.h * 0.2;
    if (b.y < targetY) b.y += 90 * sc * dt;
    b.x = g.w / 2 + Math.sin(b.t * 0.8) * g.w * 0.3;
    const frac = b.hp / b.max;
    const phase = frac > 0.66 ? 0 : frac > 0.33 ? 1 : 2;
    if (b.y >= targetY - 2) {
      b.cd -= dt * g.c.fire;
      if (b.cd <= 0) {
        if (phase === 0) {
          for (let i = -2; i <= 2; i++) ebullet(g, b.x, b.y + b.r * 0.6, i * 0.28, 250);
          b.cd = 1.3;
        } else if (phase === 1) {
          const a = aim(g, b.x, b.y);
          for (let i = 0; i < 3; i++) ebullet(g, b.x, b.y + b.r * 0.6, a + (i - 1) * 0.1, 330 + i * 30, 6);
          b.cd = 0.8;
        } else {
          b.ang += 0.5;
          for (let i = 0; i < 3; i++) ebullet(g, b.x, b.y, b.ang + (i * TAU) / 3, 230);
          b.cd = 0.12;
        }
      }
      if (phase === 2) {
        b.cd2 -= dt;
        if (b.cd2 <= 0) { spawn(g, "scout", rnd(0.2, 0.8)); spawn(g, "zig", rnd(0.2, 0.8)); b.cd2 = 4; }
      }
    }
  }

  // player bullets
  for (const q of g.pb) { q.x += q.vx * dt; q.y += q.vy * dt; }
  for (const q of g.pb) {
    for (const e of g.enemies) {
      if (e.hp > 0 && !q.dead && Math.hypot(q.x - e.x, q.y - e.y) < e.r + q.r) {
        e.hp -= q.dmg;
        e.hit = 0.08;
        q.dead = true;
        burst(g, q.x, q.y, e.col, 2, 120, 0.25);
      }
    }
    if (b && !q.dead && Math.hypot(q.x - b.x, q.y - b.y) < b.r + q.r) {
      b.hp -= q.dmg;
      b.hit = 0.08;
      q.dead = true;
      burst(g, q.x, q.y, "#ffb067", 2, 140, 0.25);
    }
  }
  g.pb = g.pb.filter((q) => !q.dead && q.y > -20 && q.x > -20 && q.x < g.w + 20);
  for (const e of g.enemies) if (e.hp <= 0) kill(g, e);
  g.enemies = g.enemies.filter((e) => e.hp > 0);
  if (b && b.hp <= 0) killBoss(g);

  // enemy bullets and bodies hurt the player
  for (const q of g.eb) { q.x += q.vx * dt; q.y += q.vy * dt; }
  const pr = 13 * sc;
  for (const q of g.eb) if (!q.dead && Math.hypot(q.x - p.x, q.y - p.y) < q.r + pr * 0.8) { q.dead = true; hitPlayer(g); }
  g.eb = g.eb.filter((q) => !q.dead && q.y < g.h + 20 && q.y > -40 && q.x > -40 && q.x < g.w + 40);
  for (const e of g.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + pr) { e.hp = 0; hitPlayer(g); kill(g, e); }
  g.enemies = g.enemies.filter((e) => e.hp > 0);
  if (g.boss && Math.hypot(g.boss.x - p.x, g.boss.y - p.y) < g.boss.r * 0.8 + pr) hitPlayer(g);

  // pickups drift down and get pulled in when near
  for (const u of g.pick) {
    u.t += dt;
    const d = Math.hypot(u.x - p.x, u.y - p.y);
    if (d < 140 * sc) { u.x += ((p.x - u.x) / d) * 260 * sc * dt; u.y += ((p.y - u.y) / d) * 260 * sc * dt; }
    else u.y += 95 * sc * dt;
    if (d < 26 * sc) { u.dead = true; applyPickup(g, u.type); burst(g, u.x, u.y, PICK_COL[u.type], 10, 160, 0.4); }
  }
  g.pick = g.pick.filter((u) => !u.dead && u.y < g.h + 30);

  // particles and timers
  for (const q of g.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; q.vx *= 0.98; q.vy *= 0.98; }
  g.parts = g.parts.filter((q) => q.life > 0);
  g.shake = Math.max(0, g.shake - dt * 1.6);
  g.flash = Math.max(0, g.flash - dt * 1.8);
  g.banner.t = Math.max(0, g.banner.t - dt);
}

/* ---------- drawing ---------- */

function poly(ctx, pts, x, y, s) {
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)));
  ctx.closePath();
}

const SHAPES = {
  scout: [[0, 1.1], [1, -0.7], [0.35, -0.3], [-0.35, -0.3], [-1, -0.7]],
  zig: [[0, 1], [1, 0], [0.5, -0.9], [-0.5, -0.9], [-1, 0]],
  gunner: [[0, 1.1], [0.9, 0.3], [0.9, -0.8], [0.3, -1], [-0.3, -1], [-0.9, -0.8], [-0.9, 0.3]],
  tank: [[0, 1], [0.95, 0.55], [1.1, -0.4], [0.55, -1], [-0.55, -1], [-1.1, -0.4], [-0.95, 0.55]],
};

function drawBackground(ctx, g, t) {
  const gr = ctx.createLinearGradient(0, 0, 0, g.h);
  gr.addColorStop(0, "#03040b");
  gr.addColorStop(0.55, "#0a0720");
  gr.addColorStop(1, "#170a30");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, g.w, g.h);
  const n1 = ctx.createRadialGradient(g.w * 0.2, g.h * 0.3, 0, g.w * 0.2, g.h * 0.3, g.h * 0.6);
  n1.addColorStop(0, "rgba(255,79,163,0.14)");
  n1.addColorStop(1, "rgba(255,79,163,0)");
  ctx.fillStyle = n1;
  ctx.fillRect(0, 0, g.w, g.h);
  const n2 = ctx.createRadialGradient(g.w * 0.85, g.h * 0.7, 0, g.w * 0.85, g.h * 0.7, g.h * 0.6);
  n2.addColorStop(0, "rgba(38,255,203,0.12)");
  n2.addColorStop(1, "rgba(38,255,203,0)");
  ctx.fillStyle = n2;
  ctx.fillRect(0, 0, g.w, g.h);
  for (const s of g.stars) {
    ctx.globalAlpha = 0.25 + s.z * 0.65;
    ctx.fillStyle = "#cfe8ff";
    const sz = (0.8 + s.z * 1.6) * g.sc;
    ctx.fillRect(s.x, s.y, sz, sz * (1 + s.z * 2));
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, g, t) {
  const p = g.player;
  const s = 22 * g.sc;
  if (p.inv > 0 && Math.floor(t * 18) % 2) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  const fl = 0.8 + Math.random() * 0.6;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#26ffcb";
  ctx.beginPath();
  ctx.moveTo(-0.28 * s, 0.9 * s);
  ctx.lineTo(0, (0.9 + 1.1 * fl) * s);
  ctx.lineTo(0.28 * s, 0.9 * s);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(-0.12 * s, 0.9 * s);
  ctx.lineTo(0, (0.9 + 0.6 * fl) * s);
  ctx.lineTo(0.12 * s, 0.9 * s);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const body = [[0, -1.3], [0.45, -0.3], [1.25, 0.95], [0.5, 0.65], [0.25, 1], [-0.25, 1], [-0.5, 0.65], [-1.25, 0.95], [-0.45, -0.3]];
  poly(ctx, body, 0, 0, s);
  const gr = ctx.createLinearGradient(0, -1.3 * s, 0, s);
  gr.addColorStop(0, "#f2fffc");
  gr.addColorStop(1, "#1fd8b0");
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = "#04201a";
  ctx.lineWidth = 2 * g.sc;
  ctx.stroke();
  ctx.fillStyle = "#0a5bd8";
  ctx.beginPath();
  ctx.ellipse(0, -0.2 * s, 0.17 * s, 0.4 * s, 0, 0, TAU);
  ctx.fill();
  if (p.shield > 0) {
    ctx.strokeStyle = `rgba(125,255,230,${0.5 + 0.3 * Math.sin(t * 8)})`;
    ctx.lineWidth = (2 + p.shield) * g.sc;
    ctx.beginPath();
    ctx.arc(0, 0, 1.9 * s, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoss(ctx, g, b, t) {
  const s = b.r;
  ctx.save();
  ctx.translate(b.x, b.y);
  const hull = [[0, 1], [0.55, 0.75], [1.3, 0.2], [1.6, -0.5], [0.9, -0.55], [0.6, -1], [-0.6, -1], [-0.9, -0.55], [-1.6, -0.5], [-1.3, 0.2], [-0.55, 0.75]];
  poly(ctx, hull, 0, 0, s);
  const gr = ctx.createLinearGradient(0, -s, 0, s);
  gr.addColorStop(0, b.hit > 0 ? "#fff" : "#7a1d4f");
  gr.addColorStop(1, b.hit > 0 ? "#fff" : "#2a0a22");
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = "#ff4fa3";
  ctx.lineWidth = 3 * g.sc;
  ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  const pulse = 0.7 + 0.3 * Math.sin(t * 6);
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.5 * s);
  cg.addColorStop(0, `rgba(255,230,0,${pulse})`);
  cg.addColorStop(1, "rgba(255,80,60,0)");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, 0.5 * s, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

export function draw(ctx, g, t) {
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * g.shake * g.sc, (Math.random() - 0.5) * 14 * g.shake * g.sc);
  drawBackground(ctx, g, t);
  if (!g.started) { ctx.restore(); return; }

  for (const u of g.pick) {
    const col = PICK_COL[u.type];
    const r = 13 * g.sc * (1 + 0.1 * Math.sin(u.t * 8));
    ctx.strokeStyle = col;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 3 * g.sc;
    ctx.beginPath();
    ctx.arc(u.x, u.y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = `${Math.round(14 * g.sc)}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.type, u.x, u.y + 1);
  }

  for (const e of g.enemies) {
    poly(ctx, SHAPES[e.type], e.x, e.y, e.r);
    ctx.fillStyle = e.hit > 0 ? "#ffffff" : "#120a1c";
    ctx.fill();
    ctx.strokeStyle = e.col;
    ctx.lineWidth = 3 * g.sc;
    ctx.stroke();
    ctx.fillStyle = e.col;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * 0.22, 0, TAU);
    ctx.fill();
  }
  if (g.boss) drawBoss(ctx, g, g.boss, t);

  ctx.globalCompositeOperation = "lighter";
  for (const q of g.pb) {
    ctx.fillStyle = "#9bffe8";
    ctx.fillRect(q.x - q.r * 0.6, q.y - q.r * 2.5, q.r * 1.2, q.r * 5);
  }
  for (const q of g.eb) {
    ctx.fillStyle = "rgba(255,60,120,0.9)";
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r * 1.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r * 0.6, 0, TAU);
    ctx.fill();
  }
  for (const q of g.parts) {
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    ctx.fillStyle = q.col;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  drawPlayer(ctx, g, t);
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${g.flash * 0.5})`;
    ctx.fillRect(0, 0, g.w, g.h);
  }
  ctx.restore();
  drawHud(ctx, g);
}

function drawHud(ctx, g) {
  const f = g.sc;
  const font = (px) => `${Math.round(px * f)}px Impact, "Arial Black", sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = font(30);
  ctx.fillText(String(g.score).replace(/\B(?=(\d{3})+(?!\d))/g, ","), g.w / 2, 14 * f);
  ctx.fillStyle = "#26ffcb";
  ctx.font = font(15);
  ctx.fillText(`WAVE ${g.wave}`, g.w / 2, 50 * f);

  // lives (bottom left) and weapon level (bottom right)
  ctx.textAlign = "left";
  ctx.fillStyle = "#ff4fa3";
  ctx.font = font(20);
  ctx.fillText("LIVES", 18 * f, g.h - 62 * f);
  for (let i = 0; i < g.lives; i++) {
    ctx.fillStyle = "#26ffcb";
    poly(ctx, [[0, -1], [0.8, 0.8], [0, 0.4], [-0.8, 0.8]], 28 * f + i * 26 * f, g.h - 22 * f, 11 * f);
    ctx.fill();
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffe600";
  ctx.font = font(20);
  ctx.fillText(`WEAPON ${g.player.wpn}${g.player.wpn === 5 ? " MAX" : ""}`, g.w - 18 * f, g.h - 62 * f);
  if (g.player.rapid > 0) { ctx.fillStyle = "#ffe600"; ctx.font = font(15); ctx.fillText(`RAPID ${Math.ceil(g.player.rapid)}s`, g.w - 18 * f, g.h - 38 * f); }
  if (g.player.shield > 0) { ctx.fillStyle = "#5cc8ff"; ctx.font = font(15); ctx.fillText(`SHIELD x${g.player.shield}`, g.w - 18 * f, g.h - 20 * f); }

  if (g.boss) {
    const w = Math.min(g.w * 0.5, 520 * f), x = g.w / 2 - w / 2, y = 84 * f;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 3, y - 3, w + 6, 14 * f + 6);
    ctx.fillStyle = "#ff4fa3";
    ctx.fillRect(x, y, w * clamp(g.boss.hp / g.boss.max, 0, 1), 14 * f);
  }
  if (g.banner.t > 0) {
    ctx.globalAlpha = clamp(g.banner.t, 0, 1);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = font(58);
    ctx.fillText(g.banner.text, g.w / 2, g.h * 0.32);
    ctx.globalAlpha = 1;
  }
}
