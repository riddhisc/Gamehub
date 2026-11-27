// Neon Rush: a pseudo-3D night highway. Weave through traffic, hit checkpoints, beat the clock.

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const CFG = {
  easy: { max: 1700, gap: 1.4, time: 75 },
  medium: { max: 2100, gap: 1, time: 60 },
  hard: { max: 2500, gap: 0.7, time: 50 },
};
const K = 320; // camera distance: how fast things grow as they come near
const STRIP = 240; // length of one road stripe
const HZ = 0.42; // horizon height
const LANES = [-0.75, -0.375, 0, 0.375, 0.75];
const COLORS = ["#ffe600", "#26ffcb", "#5cc8ff", "#b074ff", "#ff8a00", "#ffffff"];

const curveAt = (z) => Math.sin(z / 2600) + Math.sin(z / 1100 + 2) * 0.6;

export function newGame(level, w, h) {
  const c = CFG[level] || CFG.medium;
  return {
    w, h, c, level, t: 0, pos: 0, speed: 0, x: 0, tx: null, time: c.time, score: 0, dist: 0,
    cars: [], spawn: 0.5, crash: 0, nitro: 1, passed: 0, next: 6000, state: "play", shake: 0,
    banner: { text: "GO!", t: 1.2 }, input: { l: 0, r: 0, b: 0, n: 0 }, started: false,
  };
}
export function resize(g, w, h) { g.w = w; g.h = h; }
export function idle(g, dt) { g.pos += 600 * dt; g.t += dt; }
export const result = (g) => [["Distance", `${Math.round(g.dist)} m`], ["Overtakes", g.passed]];

export function key(g, k, down) {
  const m = { ArrowLeft: "l", a: "l", A: "l", ArrowRight: "r", d: "r", D: "r", ArrowDown: "b", s: "b", S: "b", ArrowUp: "n", w: "n", W: "n", " ": "n", Shift: "n" };
  if (m[k]) { g.input[m[k]] = down ? 1 : 0; if (m[k] === "l" || m[k] === "r") g.tx = null; }
}
export function pointer(g, x, y, phase, type) {
  if (phase === "up") { if (type !== "mouse") g.input.n = 0; return; }
  g.tx = clamp((x - g.w / 2) / (0.55 * 0.9 * Math.min(g.w * 0.48, g.h * 0.8)), -1.15, 1.15);
  if (type === "mouse") { if (phase === "down") g.input.n = 1; }
  else g.input.n = y < g.h * 0.45 ? 1 : 0;
}

export function update(g, dt) {
  const c = g.c;
  g.t += dt;
  const max = c.max * (1 + Math.min(0.25, g.dist / 60000));
  const boosting = g.input.n && g.nitro > 0.02 && g.crash <= 0;
  let target = boosting ? max * 1.35 : max;
  if (g.input.b) target = max * 0.35;
  if (Math.abs(g.x) > 1.02) target = Math.min(target, max * 0.4);
  g.speed += (target - g.speed) * Math.min(1, dt * (g.crash > 0 ? 0.5 : 0.9));
  g.nitro = boosting ? Math.max(0, g.nitro - dt * 0.33) : Math.min(1, g.nitro + dt * 0.07);
  g.pos += g.speed * dt;
  g.dist = g.pos / 10;

  const grip = 0.4 + (g.speed / max) * 0.8;
  if (g.input.l || g.input.r) g.x += (g.input.r - g.input.l) * dt * 1.7 * grip;
  else if (g.tx !== null) g.x += (g.tx - g.x) * Math.min(1, dt * 10);
  g.x -= curveAt(g.pos + K * 3) * (g.speed / max) * dt * 0.45; // bends push you wide, gently
  g.x = clamp(g.x, -1.6, 1.6);

  g.time -= dt;
  if (g.pos >= g.next) {
    g.next += 6000;
    g.time += 15;
    g.banner = { text: "CHECKPOINT +15s", t: 1.6 };
  }

  g.spawn -= dt;
  if (g.spawn <= 0) {
    g.spawn = rnd(0.45, 1.1) * c.gap * (1.3 - clamp(g.dist / 30000, 0, 0.5));
    g.cars.push({ z: g.pos + 18000, x: LANES[Math.floor(Math.random() * LANES.length)], vz: max * rnd(0.3, 0.5), col: COLORS[Math.floor(Math.random() * COLORS.length)], seen: false });
  }
  const playerZ = g.pos + K / 0.9;
  for (const car of g.cars) {
    car.z += car.vz * dt;
    if (!car.dead && Math.abs(car.z - playerZ) < 90 && Math.abs(car.x - g.x) < 0.2) {
      car.dead = true;
      g.speed *= 0.35;
      g.crash = 0.9;
      g.shake = 0.8;
      g.time -= 2;
      g.banner = { text: "CRASH  -2s", t: 0.9 };
    }
    if (!car.seen && car.z < playerZ - 120) { car.seen = true; g.passed++; }
  }
  g.cars = g.cars.filter((car) => !car.dead && car.z > g.pos - 400);
  g.crash = Math.max(0, g.crash - dt);
  g.shake = Math.max(0, g.shake - dt * 1.5);
  g.banner.t = Math.max(0, g.banner.t - dt);
  g.score = Math.round(g.dist) + g.passed * 50;
  if (g.time <= 0) { g.time = 0; g.state = "over"; }
}

/* ---------- drawing ---------- */

function carSprite(ctx, cx, y, wpx, col, lights = true) {
  const hpx = wpx * 0.62;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(cx, y, wpx * 0.62, hpx * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.fillRect(cx - wpx / 2, y - hpx * 0.78, wpx, hpx * 0.62);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(cx - wpx / 2, y - hpx * 0.34, wpx, hpx * 0.18);
  ctx.fillStyle = "#0b0818";
  ctx.fillRect(cx - wpx * 0.36, y - hpx * 1.1, wpx * 0.72, hpx * 0.36);
  ctx.fillStyle = col;
  ctx.fillRect(cx - wpx * 0.42, y - hpx * 1.16, wpx * 0.84, hpx * 0.1);
  if (lights) {
    ctx.fillStyle = "#ff2d4f";
    ctx.fillRect(cx - wpx * 0.46, y - hpx * 0.62, wpx * 0.2, hpx * 0.14);
    ctx.fillRect(cx + wpx * 0.26, y - hpx * 0.62, wpx * 0.2, hpx * 0.14);
  }
  ctx.fillStyle = "#111";
  ctx.fillRect(cx - wpx * 0.5, y - hpx * 0.2, wpx * 0.14, hpx * 0.2);
  ctx.fillRect(cx + wpx * 0.36, y - hpx * 0.2, wpx * 0.14, hpx * 0.2);
}

export function draw(ctx, g, t) {
  const { w, h } = g;
  const hy = h * HZ;
  const RW = Math.min(w * 0.48, h * 0.8);
  const camX = g.x * 0.45;
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 20 * g.shake, (Math.random() - 0.5) * 12 * g.shake);

  // sky, sun, mountains
  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, "#07021a");
  sky.addColorStop(0.6, "#3a0a5c");
  sky.addColorStop(1, "#ff4f8b");
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, w + 40, hy + 22);
  const sunR = Math.min(w, h) * 0.2;
  ctx.fillStyle = "#ffcf3a";
  ctx.beginPath();
  ctx.arc(w / 2, hy - sunR * 0.15, sunR, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = "#ff4f8b";
  for (let i = 1; i < 6; i++) ctx.fillRect(w / 2 - sunR, hy - sunR * 0.15 - i * sunR * 0.16, sunR * 2, i * sunR * 0.025);
  ctx.fillStyle = "#12062a";
  ctx.beginPath();
  ctx.moveTo(-20, hy);
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * (w + 40) - 20;
    ctx.lineTo(x, hy - (Math.abs(Math.sin(i * 1.7 + 1) * 0.6 + Math.sin(i * 0.6)) * h * 0.07 + h * 0.01));
  }
  ctx.lineTo(w + 20, hy);
  ctx.fill();

  // road, row by row, near ones last
  const bend = curveAt(g.pos + K * 3);
  const STEP = 2;
  for (let y = Math.ceil(hy); y < h + STEP; y += STEP) {
    const tt = (y - hy + 1) / (h - hy);
    if (tt < 0.004) continue;
    const z = g.pos + K / tt;
    const stripe = Math.floor(z / STRIP) % 2;
    const half = tt * RW;
    const cx = w / 2 + bend * (1 - tt) * (1 - tt) * w * 0.3 - camX * half;
    ctx.fillStyle = stripe ? "#0f0724" : "#150a30";
    ctx.fillRect(0, y, w, STEP);
    const edge = half * 0.07;
    ctx.fillStyle = stripe ? "#ff2d6f" : "#f4f0ff";
    ctx.fillRect(cx - half - edge, y, edge, STEP);
    ctx.fillRect(cx + half, y, edge, STEP);
    ctx.fillStyle = stripe ? "#1a1626" : "#201b2f";
    ctx.fillRect(cx - half, y, half * 2, STEP);
    if (stripe) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (const lx of [-0.5, 0, 0.5]) ctx.fillRect(cx + lx * half - half * 0.012, y, half * 0.024, STEP);
    }
  }
  const glow = ctx.createLinearGradient(0, hy, 0, hy + h * 0.06);
  glow.addColorStop(0, "rgba(255,79,139,0.5)");
  glow.addColorStop(1, "rgba(255,79,139,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, hy, w, h * 0.06);

  // traffic, far to near
  const ordered = [...g.cars].sort((a, b) => b.z - a.z);
  for (const car of ordered) {
    const dz = car.z - g.pos;
    if (dz < K * 1.05) continue;
    const tt = K / dz;
    if (tt < 0.01) continue;
    const y = hy + tt * (h - hy);
    const half = tt * RW;
    const cx = w / 2 + bend * (1 - tt) * (1 - tt) * w * 0.3 - camX * half + car.x * half;
    carSprite(ctx, cx, y, half * 0.3, car.col);
  }

  // the player's car
  const py = hy + 0.9 * (h - hy);
  const pw = 0.9 * RW * 0.3;
  const pcx = w / 2 + bend * 0.01 * w * 0.3 + (g.x - camX) * 0.9 * RW;
  ctx.save();
  ctx.translate(pcx, py);
  ctx.rotate(clamp(((g.input.r - g.input.l) || ((g.tx ?? g.x) - g.x)) * 0.12, -0.15, 0.15));
  if (g.input.n && g.nitro > 0.02) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(92,200,255,0.8)";
    ctx.beginPath();
    ctx.moveTo(-pw * 0.3, 0);
    ctx.lineTo(0, pw * (0.5 + Math.random() * 0.5));
    ctx.lineTo(pw * 0.3, 0);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  carSprite(ctx, 0, 0, pw, "#26ffcb");
  ctx.restore();

  // speed lines when boosting
  if (g.input.n && g.nitro > 0.02 && g.started) {
    ctx.strokeStyle = "rgba(180,230,255,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + t, r0 = Math.min(w, h) * 0.45, r1 = r0 + Math.min(w, h) * (0.15 + 0.1 * Math.sin(t * 20 + i));
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * r0 * 1.3, h * 0.55 + Math.sin(a) * r0);
      ctx.lineTo(w / 2 + Math.cos(a) * r1 * 1.3, h * 0.55 + Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  if (g.crash > 0) {
    ctx.fillStyle = `rgba(255,40,80,${g.crash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
  if (g.started) hud(ctx, g);
}

function hud(ctx, g) {
  const f = clamp(Math.min(g.w, g.h * 1.3) / 720, 0.7, 2);
  const font = (px) => `${Math.round(px * f)}px Impact, "Arial Black", sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.fillStyle = g.time < 10 ? "#ff4f8b" : "#ffffff";
  ctx.font = font(40);
  ctx.fillText(String(Math.ceil(g.time)), g.w / 2, 12 * f);
  ctx.fillStyle = "#26ffcb";
  ctx.font = font(16);
  ctx.fillText(`${g.score} PTS`, g.w / 2, 56 * f);
  const ahead = curveAt(g.pos + 4500);
  if (Math.abs(ahead) > 0.45) {
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255,230,0,${Math.min(1, Math.abs(ahead) - 0.2)})`;
    ctx.font = font(36);
    ctx.fillText(ahead > 0 ? "CURVE  ▶▶▶" : "◀◀◀  CURVE", g.w / 2, 84 * f);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = font(44);
  ctx.fillText(String(Math.round(g.speed / 10)), 18 * f, g.h - 74 * f);
  ctx.fillStyle = "#ff4f8b";
  ctx.font = font(16);
  ctx.fillText("KM/H", 18 * f, g.h - 28 * f);
  ctx.textAlign = "right";
  ctx.fillStyle = "#5cc8ff";
  ctx.fillText("NITRO", g.w - 18 * f, g.h - 52 * f);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(g.w - 18 * f - 180 * f, g.h - 30 * f, 180 * f, 12 * f);
  ctx.fillStyle = "#5cc8ff";
  ctx.fillRect(g.w - 18 * f - 180 * f, g.h - 30 * f, 180 * f * g.nitro, 12 * f);
  if (g.banner.t > 0) {
    ctx.globalAlpha = clamp(g.banner.t, 0, 1);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe600";
    ctx.font = font(54);
    ctx.fillText(g.banner.text, g.w / 2, g.h * 0.24);
    ctx.globalAlpha = 1;
  }
}
