// Draws a Temple Dash frame on a canvas: a road running into the distance (pseudo-3D),
// jungle and temple pillars at the sides, the runner, obstacles and coins.

export const W = 420;
export const H = 630;
const HORIZON = H * 0.4;
const F = 300;        // how strongly things shrink with distance
const CAM_H = 2.2;    // camera height
const BACK = 3.4;     // the runner is this far in front of the camera
const FAR = 58;       // how far ahead we draw
const ROAD = 1.7;     // half the width of the path

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const rgb = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const blend = (c1, c2, t) => {
  const a = rgb(c1), b = rgb(c2);
  return `rgb(${Math.round(mix(a[0], b[0], t))},${Math.round(mix(a[1], b[1], t))},${Math.round(mix(a[2], b[2], t))})`;
};
const FOG = "#e0825f";

function makeCam(s) {
  const camZ = s.dist - BACK;
  const camX = s.x * 0.55;
  const proj = (x, y, z) => {
    const zr = Math.max(0.3, z - camZ);
    const k = F / zr;
    return [W / 2 + (x - camX) * k, HORIZON + (CAM_H - y) * k, k, zr];
  };
  return { camZ, camX, proj };
}

function poly(ctx, pts, fill, stroke) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawSky(ctx, camX, t) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 6);
  g.addColorStop(0, "#1a0b3a");
  g.addColorStop(0.45, "#68206f");
  g.addColorStop(0.8, "#e0634f");
  g.addColorStop(1, "#ffb067");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 6);

  // sun with a glow
  const sx = W * 0.62 - camX * 6;
  const sy = HORIZON - 52;
  const glow = ctx.createRadialGradient(sx, sy, 6, sx, sy, 120);
  glow.addColorStop(0, "rgba(255,226,150,0.95)");
  glow.addColorStop(0.35, "rgba(255,160,90,0.45)");
  glow.addColorStop(1, "rgba(255,120,80,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 130, sy - 130, 260, 260);
  ctx.fillStyle = "#fff0b0";
  ctx.beginPath();
  ctx.arc(sx, sy, 28, 0, Math.PI * 2);
  ctx.fill();

  // far mountains (move a little as you steer)
  const shift = -camX * 10;
  ctx.fillStyle = "#4a1f5c";
  poly(ctx, [[-20, HORIZON], [40 + shift, HORIZON - 52], [90 + shift, HORIZON - 20], [150 + shift, HORIZON - 70], [230 + shift, HORIZON - 18], [300 + shift, HORIZON - 58], [370 + shift, HORIZON - 26], [440, HORIZON - 44], [440, HORIZON]]);
  ctx.fillStyle = "#35154a";
  poly(ctx, [[-20, HORIZON], [20 + shift * 1.4, HORIZON - 26], [110 + shift * 1.4, HORIZON - 8], [190 + shift * 1.4, HORIZON - 34], [270 + shift * 1.4, HORIZON - 10], [350 + shift * 1.4, HORIZON - 30], [440, HORIZON - 12], [440, HORIZON]]);

  // a temple on the horizon
  const tx = W / 2 - camX * 14;
  ctx.fillStyle = "#2a103f";
  poly(ctx, [[tx - 70, HORIZON], [tx - 56, HORIZON - 14], [tx - 44, HORIZON - 14], [tx - 36, HORIZON - 28], [tx - 24, HORIZON - 28], [tx - 18, HORIZON - 42], [tx + 18, HORIZON - 42], [tx + 24, HORIZON - 28], [tx + 36, HORIZON - 28], [tx + 44, HORIZON - 14], [tx + 56, HORIZON - 14], [tx + 70, HORIZON]]);
  ctx.fillStyle = "#ffb067";
  ctx.fillRect(tx - 5, HORIZON - 34, 10, 12);

  // birds
  ctx.strokeStyle = "rgba(30,10,50,0.7)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const bx = ((t * 14 + i * 140) % (W + 60)) - 30;
    const by = 60 + i * 22 + Math.sin(t * 2 + i) * 4;
    ctx.beginPath();
    ctx.moveTo(bx - 6, by);
    ctx.quadraticCurveTo(bx - 3, by - 5 + Math.sin(t * 9 + i) * 3, bx, by);
    ctx.quadraticCurveTo(bx + 3, by - 5 + Math.sin(t * 9 + i) * 3, bx + 6, by);
    ctx.stroke();
  }
}

function drawGround(ctx, cam, s) {
  // jungle floor either side
  const g = ctx.createLinearGradient(0, HORIZON, 0, H);
  g.addColorStop(0, "#5a3a3a");
  g.addColorStop(0.15, "#1d3b25");
  g.addColorStop(1, "#0c1f14");
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);

  const pits = s.obstacles.filter((o) => o.type === "pit");
  for (let i = FAR; i >= 1; i--) {
    const l1 = cam.proj(-ROAD, 0, cam.camZ + i);
    const r1 = cam.proj(ROAD, 0, cam.camZ + i);
    const l2 = cam.proj(-ROAD, 0, Math.max(cam.camZ + i - 1, cam.camZ + 0.31));
    const r2 = cam.proj(ROAD, 0, Math.max(cam.camZ + i - 1, cam.camZ + 0.31));
    const wz = cam.camZ + i;
    const stripe = Math.floor(wz / 2) % 2 === 0;
    const fogT = clamp(Math.pow(i / FAR, 1.4), 0, 1) * 0.9;
    const inPit = pits.some((p) => wz > p.z && wz < p.z + p.len);

    if (inPit) {
      poly(ctx, [[l1[0], l1[1]], [r1[0], r1[1]], [r2[0], r2[1]], [l2[0], l2[1]]], blend("#06020a", FOG, fogT));
    } else {
      poly(ctx, [[l1[0], l1[1]], [r1[0], r1[1]], [r2[0], r2[1]], [l2[0], l2[1]]], blend(stripe ? "#7a6650" : "#6d5a45", FOG, fogT));
      // mossy edges
      const el1 = cam.proj(-ROAD - 0.3, 0, wz), el2 = cam.proj(-ROAD - 0.3, 0, Math.max(wz - 1, cam.camZ + 0.31));
      const er1 = cam.proj(ROAD + 0.3, 0, wz), er2 = cam.proj(ROAD + 0.3, 0, Math.max(wz - 1, cam.camZ + 0.31));
      const moss = blend(stripe ? "#3f7a3a" : "#356b32", FOG, fogT);
      poly(ctx, [[el1[0], el1[1]], [l1[0], l1[1]], [l2[0], l2[1]], [el2[0], el2[1]]], moss);
      poly(ctx, [[r1[0], r1[1]], [er1[0], er1[1]], [er2[0], er2[1]], [r2[0], r2[1]]], moss);
      // faint lane lines
      if (stripe) {
        for (const lx of [-0.5, 0.5]) {
          const p1 = cam.proj(lx - 0.025, 0, wz), p2 = cam.proj(lx + 0.025, 0, wz);
          const p3 = cam.proj(lx + 0.025, 0, Math.max(wz - 1, cam.camZ + 0.31)), p4 = cam.proj(lx - 0.025, 0, Math.max(wz - 1, cam.camZ + 0.31));
          poly(ctx, [[p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]], [p4[0], p4[1]]], blend("#a39078", FOG, fogT));
        }
      }
    }
  }
}

/* ---------- things standing on the track ---------- */

function drawTree(ctx, p, size, h) {
  const [x, y, k] = p;
  const trunkW = 0.22 * size * k;
  const trunkH = 1.6 * size * k;
  ctx.fillStyle = "#3a2417";
  ctx.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);
  const greens = ["#1d5a2d", "#26703a", "#2f8745"];
  for (let i = 0; i < 3; i++) {
    const r = (1.0 - i * 0.2) * size * k * (0.9 + h * 0.3);
    ctx.fillStyle = greens[i];
    ctx.beginPath();
    ctx.ellipse(x + (i % 2 ? 0.1 : -0.1) * k, y - trunkH - i * 0.45 * size * k + 0.2 * size * k, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPillar(ctx, p, size) {
  const [x, y, k] = p;
  const w = 0.55 * size * k;
  const hh = 2.6 * size * k;
  ctx.fillStyle = "#7d6b5a";
  ctx.fillRect(x - w / 2, y - hh, w, hh);
  ctx.fillStyle = "#5c4d40";
  ctx.fillRect(x + w * 0.15, y - hh, w * 0.35, hh);
  ctx.fillStyle = "#938170";
  ctx.fillRect(x - w * 0.7, y - hh - 0.18 * size * k, w * 1.4, 0.2 * size * k);
  ctx.fillStyle = "#3f7a3a"; // moss
  ctx.fillRect(x - w / 2, y - hh * 0.35, w * 0.5, hh * 0.08);
  ctx.fillRect(x - w / 2, y - hh * 0.7, w * 0.3, hh * 0.06);
}

function drawArch(ctx, cam, z) {
  const l = cam.proj(-ROAD - 0.35, 0, z), r = cam.proj(ROAD + 0.35, 0, z);
  const top = cam.proj(0, 3.4, z);
  const k = l[2];
  const pw = 0.55 * k;
  for (const p of [l, r]) {
    ctx.fillStyle = "#7d6b5a";
    ctx.fillRect(p[0] - pw / 2, top[1], pw, p[1] - top[1]);
    ctx.fillStyle = "#5c4d40";
    ctx.fillRect(p[0] + pw * 0.1, top[1], pw * 0.4, p[1] - top[1]);
  }
  ctx.fillStyle = "#8d7a67";
  ctx.fillRect(l[0] - pw, top[1] - 0.55 * k, r[0] - l[0] + pw * 2, 0.6 * k);
  ctx.fillStyle = "#ffb067"; // glowing carving
  ctx.fillRect((l[0] + r[0]) / 2 - 0.35 * k, top[1] - 0.4 * k, 0.7 * k, 0.18 * k);
}

function drawBlock(ctx, cam, o, fade) {
  const x0 = o.lane - 0.45, x1 = o.lane + 0.45;
  const fl = cam.proj(x0, 0, o.z), fr = cam.proj(x1, 0, o.z);
  const tl = cam.proj(x0, 1.15, o.z), tr = cam.proj(x1, 1.15, o.z);
  const bl = cam.proj(x0, 1.15, o.z + 0.9), br = cam.proj(x1, 1.15, o.z + 0.9);
  ctx.globalAlpha = fade;
  // top
  poly(ctx, [[tl[0], tl[1]], [tr[0], tr[1]], [br[0], br[1]], [bl[0], bl[1]]], "#b7a58c", "#6f604f");
  // side facing the middle of the road
  if (o.lane > cam.camX + 0.1) {
    const sb = cam.proj(x0, 0, o.z + 0.9);
    poly(ctx, [[fl[0], fl[1]], [tl[0], tl[1]], [bl[0], bl[1]], [sb[0], sb[1]]], "#6f604f", "#4a3f33");
  } else if (o.lane < cam.camX - 0.1) {
    const sb = cam.proj(x1, 0, o.z + 0.9);
    poly(ctx, [[fr[0], fr[1]], [tr[0], tr[1]], [br[0], br[1]], [sb[0], sb[1]]], "#6f604f", "#4a3f33");
  }
  // front
  poly(ctx, [[fl[0], fl[1]], [fr[0], fr[1]], [tr[0], tr[1]], [tl[0], tl[1]]], "#8f7d68", "#4a3f33");
  const k = fl[2];
  ctx.fillStyle = "#ffb067"; // glowing rune
  ctx.fillRect((fl[0] + fr[0]) / 2 - 0.12 * k, tl[1] + 0.3 * k, 0.24 * k, 0.1 * k);
  ctx.fillRect((fl[0] + fr[0]) / 2 - 0.04 * k, tl[1] + 0.3 * k, 0.08 * k, 0.5 * k);
  ctx.fillStyle = "#3f7a3a";
  ctx.fillRect(fl[0], tl[1], (fr[0] - fl[0]) * 0.4, 0.1 * k);
  ctx.globalAlpha = 1;
}

function drawLog(ctx, cam, o, fade) {
  const l = cam.proj(-ROAD - 0.1, 0.55, o.z), r = cam.proj(ROAD + 0.1, 0.55, o.z);
  const bl = cam.proj(-ROAD - 0.1, 0, o.z);
  const k = l[2];
  const h = bl[1] - l[1];
  ctx.globalAlpha = fade;
  const rad = h / 2;
  ctx.fillStyle = "#7a4a2a";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(l[0], l[1], r[0] - l[0], h, rad) : ctx.rect(l[0], l[1], r[0] - l[0], h);
  ctx.fill();
  ctx.fillStyle = "#9a6238";
  ctx.fillRect(l[0] + rad, l[1] + h * 0.15, r[0] - l[0] - rad * 2, h * 0.18);
  ctx.fillStyle = "#5a3319";
  ctx.fillRect(l[0] + rad, l[1] + h * 0.7, r[0] - l[0] - rad * 2, h * 0.14);
  // the cut end
  ctx.fillStyle = "#c58a4d";
  ctx.beginPath();
  ctx.ellipse(l[0] + rad * 0.4, l[1] + rad, rad * 0.5, rad, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4a2a";
  ctx.lineWidth = Math.max(1, k * 0.03);
  ctx.beginPath();
  ctx.ellipse(l[0] + rad * 0.4, l[1] + rad, rad * 0.25, rad * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBranch(ctx, cam, o, fade) {
  const bl = cam.proj(-ROAD - 0.1, 1.55, o.z), br = cam.proj(ROAD + 0.1, 1.55, o.z);
  const bb = cam.proj(-ROAD - 0.1, 1.05, o.z);
  const k = bl[2];
  const h = bb[1] - bl[1];
  ctx.globalAlpha = fade;
  // posts
  for (const p of [cam.proj(-ROAD - 0.1, 0, o.z), cam.proj(ROAD + 0.1, 0, o.z)]) {
    ctx.fillStyle = "#4b2f1c";
    ctx.fillRect(p[0] - 0.09 * k, bl[1], 0.18 * k, p[1] - bl[1]);
  }
  // beam
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(bl[0], bl[1], br[0] - bl[0], h);
  ctx.fillStyle = "#8a5a35";
  ctx.fillRect(bl[0], bl[1], br[0] - bl[0], h * 0.25);
  // hanging vines
  ctx.strokeStyle = "#2f8745";
  ctx.lineWidth = Math.max(1, 0.06 * k);
  for (let i = 0; i < 9; i++) {
    const vx = mix(bl[0], br[0], (i + 0.5) / 9);
    ctx.beginPath();
    ctx.moveTo(vx, bb[1]);
    ctx.lineTo(vx + Math.sin(i * 2.3) * 0.05 * k, bb[1] + (0.12 + 0.18 * hash(i + o.z)) * k);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawCoin(ctx, cam, c, t, fade) {
  const p = cam.proj(c.lane, c.y, c.z);
  const k = p[2];
  const spin = Math.abs(Math.cos(t * 5 + c.id));
  const r = 0.24 * k;
  ctx.globalAlpha = fade;
  ctx.fillStyle = "rgba(255,210,63,0.25)";
  ctx.beginPath();
  ctx.arc(p[0], p[1], r * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd23f";
  ctx.beginPath();
  ctx.ellipse(p[0], p[1], Math.max(1, r * (0.25 + 0.75 * spin)), r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b57600";
  ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.stroke();
  ctx.fillStyle = "#fff3b0";
  ctx.beginPath();
  ctx.ellipse(p[0] - r * 0.15 * spin, p[1] - r * 0.25, Math.max(0.5, r * 0.12), r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ---------- the runner ---------- */

function drawRunner(ctx, cam, s, t) {
  const p = cam.proj(s.x, s.y, s.dist);
  const g = cam.proj(s.x, 0, s.dist);
  const k = p[2];
  const sliding = s.slide > 0 && s.y <= 0.05;
  const air = s.y > 0.05;

  // shadow
  ctx.fillStyle = `rgba(0,0,0,${0.35 - Math.min(0.25, s.y * 0.15)})`;
  ctx.beginPath();
  ctx.ellipse(g[0], g[1] + 0.03 * k, 0.4 * k * (1 - s.y * 0.1), 0.12 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  if (s.cooldown > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.45;

  ctx.save();
  ctx.translate(p[0], p[1]);
  const swing = air ? 0.25 : Math.sin(s.phase * 2);
  const bob = air ? 0 : Math.abs(Math.sin(s.phase * 2)) * 0.05;
  if (sliding) {
    ctx.translate(0, -0.05 * k);
    ctx.rotate(-1.25);
    ctx.translate(0.25 * k, 0.1 * k);
  }
  const u = k; // one unit in pixels

  // legs
  ctx.lineCap = "round";
  ctx.strokeStyle = "#3d2a1d";
  ctx.lineWidth = 0.17 * u;
  for (const side of [1, -1]) {
    const a = swing * side;
    const kneeX = (air ? 0.12 * side : a * 0.22) * u;
    const footX = a * 0.35 * u;
    const lift = air ? (side > 0 ? 0.35 : 0.15) : Math.max(0, -a) * 0.22;
    ctx.beginPath();
    ctx.moveTo(0, -0.7 * u - bob * u);
    ctx.lineTo(kneeX, -0.38 * u);
    ctx.lineTo(footX, -lift * u);
    ctx.stroke();
    ctx.fillStyle = "#2a1a10";
    ctx.beginPath();
    ctx.ellipse(footX + 0.04 * u, -lift * u, 0.11 * u, 0.06 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // backpack
  ctx.fillStyle = "#8a5a2b";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-0.3 * u, -1.22 * u - bob * u, 0.2 * u, 0.5 * u, 0.06 * u) : ctx.rect(-0.3 * u, -1.22 * u, 0.2 * u, 0.5 * u);
  ctx.fill();
  // torso
  ctx.fillStyle = "#e8d3a0";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-0.2 * u, -1.28 * u - bob * u, 0.4 * u, 0.62 * u, 0.12 * u) : ctx.rect(-0.2 * u, -1.28 * u, 0.4 * u, 0.62 * u);
  ctx.fill();
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(-0.2 * u, -0.78 * u - bob * u, 0.4 * u, 0.08 * u);
  // arms
  ctx.strokeStyle = "#d9a679";
  ctx.lineWidth = 0.12 * u;
  for (const side of [1, -1]) {
    const a = (air ? -0.9 * side : -swing * side) * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -1.18 * u - bob * u);
    ctx.lineTo(a * 0.4 * u, -0.95 * u);
    ctx.lineTo(a * 0.6 * u + 0.05 * u, -0.75 * u - (air ? 0.25 : 0) * u);
    ctx.stroke();
  }
  // head and hat
  ctx.fillStyle = "#d9a679";
  ctx.beginPath();
  ctx.arc(0.02 * u, -1.5 * u - bob * u, 0.19 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a4b2a";
  ctx.beginPath();
  ctx.ellipse(0.02 * u, -1.6 * u - bob * u, 0.3 * u, 0.07 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.02 * u, -1.65 * u - bob * u, 0.17 * u, 0.12 * u, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawDemon(ctx, s, t) {
  // glowing eyes and fangs creeping in from the bottom of the screen
  const near = clamp(s.stumble / 1.2, 0, 1) * 0.7 + 0.3 * clamp(s.stumble / 6, 0, 1);
  if (s.stumble <= 0) return;
  const cx = W / 2 + Math.sin(t * 7) * 6;
  const rise = 40 + near * 52;
  const g = ctx.createLinearGradient(0, H - rise * 3, 0, H);
  g.addColorStop(0, "rgba(40,0,10,0)");
  g.addColorStop(1, `rgba(40,0,10,${0.85 * near})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, H - rise * 3, W, rise * 3);
  ctx.globalAlpha = near;
  ctx.fillStyle = "#12020a";
  poly(ctx, [[cx - 120, H], [cx - 100, H - rise * 1.1], [cx - 70, H - rise * 0.8], [cx - 42, H - rise * 1.5], [cx - 20, H - rise * 1.05], [cx + 20, H - rise * 1.05], [cx + 42, H - rise * 1.5], [cx + 70, H - rise * 0.8], [cx + 100, H - rise * 1.1], [cx + 120, H]]);
  for (const side of [-1, 1]) {
    const ex = cx + side * 30;
    const ey = H - rise * 0.75;
    const eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, 26);
    eg.addColorStop(0, "rgba(255,70,40,0.9)");
    eg.addColorStop(1, "rgba(255,40,20,0)");
    ctx.fillStyle = eg;
    ctx.fillRect(ex - 26, ey - 26, 52, 52);
    ctx.fillStyle = "#ff3d2a";
    ctx.beginPath();
    ctx.ellipse(ex, ey, 11, 6, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.ellipse(ex, ey, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f4f0e6";
  for (let i = -3; i <= 3; i++) {
    poly(ctx, [[cx + i * 9 - 4, H - rise * 0.38], [cx + i * 9 + 4, H - rise * 0.38], [cx + i * 9, H - rise * 0.38 + 10]]);
  }
  ctx.globalAlpha = 1;
}

/* ---------- the whole frame ---------- */

export function drawFrame(ctx, s, t) {
  const cam = makeCam(s);
  ctx.save();
  if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 12 * s.shake, (Math.random() - 0.5) * 12 * s.shake);

  drawSky(ctx, cam.camX, t);
  drawGround(ctx, cam, s);

  // everything standing on the track, drawn from far to near
  const things = [];
  const first = Math.ceil((cam.camZ + 0.5) / 4.5);
  for (let n = first; n * 4.5 < cam.camZ + FAR; n++) {
    const z = n * 4.5;
    const h1 = hash(n), h2 = hash(n + 91);
    for (const side of [-1, 1]) {
      const hh = side < 0 ? h1 : h2;
      const x = side * (2.5 + hh * 2.2);
      const kind = hash(n * 3 + side) > 0.72 ? "pillar" : "tree";
      things.push({ zr: z - cam.camZ, draw: () => {
        const p = cam.proj(x, 0, z);
        const fade = clamp((FAR - (z - cam.camZ)) / 14, 0, 1);
        ctx.globalAlpha = fade;
        if (kind === "tree") drawTree(ctx, p, 1.6 + hh * 1.2, hh); else drawPillar(ctx, p, 1.1 + hh * 0.5);
        ctx.globalAlpha = 1;
      } });
    }
    if (n % 8 === 0) things.push({ zr: z - cam.camZ, draw: () => drawArch(ctx, cam, z) });
  }
  for (const o of s.obstacles) {
    if (o.type === "pit") continue;
    const zr = o.z - cam.camZ;
    if (zr < 0.4 || zr > FAR) continue;
    const fade = clamp((FAR - zr) / 14, 0, 1);
    things.push({ zr, draw: () => (o.type === "block" ? drawBlock(ctx, cam, o, fade) : o.type === "log" ? drawLog(ctx, cam, o, fade) : drawBranch(ctx, cam, o, fade)) });
  }
  for (const c of s.coinsList) {
    if (c.got) continue;
    const zr = c.z - cam.camZ;
    if (zr < 0.4 || zr > FAR) continue;
    const fade = clamp((FAR - zr) / 14, 0, 1);
    things.push({ zr, draw: () => drawCoin(ctx, cam, c, t, fade) });
  }
  things.push({ zr: BACK, draw: () => drawRunner(ctx, cam, s, t) });
  things.sort((a, b) => b.zr - a.zr).forEach((th) => th.draw());

  // a soft mist at the horizon
  const mist = ctx.createLinearGradient(0, HORIZON - 10, 0, HORIZON + 70);
  mist.addColorStop(0, "rgba(255,150,100,0.0)");
  mist.addColorStop(0.35, "rgba(255,150,100,0.35)");
  mist.addColorStop(1, "rgba(255,150,100,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, HORIZON - 10, W, 80);

  drawDemon(ctx, s, t);

  // dark corners
  const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.8);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  if (s.shake > 0) {
    ctx.fillStyle = `rgba(255,40,40,${Math.min(0.4, s.shake)})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
