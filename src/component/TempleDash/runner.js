// Temple Dash: the game rules, with no React or drawing. A run is one plain object that
// `step` updates in place every frame (so it is fast and easy to test).
//
// The track is measured in "units" ahead of the start. Three lanes: -1 (left), 0, 1 (right).
//   block   a stone block in one lane            -> change lane
//   log     a log across the whole path          -> jump
//   branch  a low beam across the whole path     -> slide
//   pit     a gap across the whole path          -> jump (falling ends the run)
// The first hit is a stumble (a demon starts chasing you); a second hit while it is close
// catches you.

export const LANES = [-1, 0, 1];
export const GRAVITY = 30;
export const JUMP_SPEED = 9.6;
export const SLIDE_TIME = 0.65;
export const STUMBLE_TIME = 6;
export const START_SPEED = 9;
export const MAX_SPEED = 24;

// start speed, top speed, how fast it builds up, and the space between obstacle rows (x speed)
export const LEVEL_CFG = {
  easy: { start: 7.5, max: 18, ramp: 0.2, gap: 1.2 },
  medium: { start: 9, max: 24, ramp: 0.3, gap: 0.95 },
  hard: { start: 10.5, max: 29, ramp: 0.4, gap: 0.82 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function newRun(rand = Math.random, level = "medium") {
  const cfg = LEVEL_CFG[level] || LEVEL_CFG.medium;
  const s = {
    level,
    time: 0,
    dist: 0,          // how far you have run
    speed: cfg.start,
    x: 0,             // lane position, moves smoothly towards targetLane
    targetLane: 0,
    y: 0,             // height above the ground
    vy: 0,
    slide: 0,         // seconds of sliding left
    phase: 0,         // leg animation
    stumble: 0,       // seconds the demon is still after you
    cooldown: 0,      // short safe time after a hit
    shake: 0,
    coins: 0,
    alive: true,
    cause: null,      // "caught" | "fell"
    obstacles: [],
    coinsList: [],
    nextRow: 26,
    rows: 0,
    nextId: 1,
  };
  spawn(s, rand);
  return s;
}

export function moveLane(s, d) {
  if (!s.alive) return;
  s.targetLane = clamp(s.targetLane + d, -1, 1);
}

export function jump(s) {
  if (!s.alive) return;
  if (s.y <= 0.001) {
    s.vy = JUMP_SPEED;
    s.slide = 0;
  }
}

export function slide(s) {
  if (!s.alive) return;
  if (s.y > 0.001) s.vy = Math.min(s.vy, -14); // drop quickly
  s.slide = SLIDE_TIME;
}

export const score = (s) => Math.floor(s.dist) + s.coins * 10;

/* ---------- building the path ahead ---------- */

function addCoins(s, lane, z, n, y = 0.5, gap = 1.5) {
  for (let i = 0; i < n; i++) s.coinsList.push({ id: s.nextId++, z: z + i * gap, lane, y, got: false });
}

function spawn(s, rand) {
  const pick = (a) => a[Math.floor(rand() * a.length)];
  while (s.nextRow < s.dist + 80) {
    const z = s.nextRow;
    const early = s.rows < 3;
    const kind = early ? pick(["coins", "log", "branch", "block1"]) : pick(["block1", "block1", "block2", "log", "log", "branch", "pit", "mixed", "mixed", "coins"]);
    const lanes = [-1, 0, 1];
    const free = pick(lanes);
    const others = lanes.filter((l) => l !== free);
    const ob = (type, lane, extra = {}) => s.obstacles.push({ id: s.nextId++, z, lane, type, hit: false, ...extra });

    if (kind === "block1") {
      ob("block", pick(lanes));
      addCoins(s, pick(lanes), z - 3, 5);
    } else if (kind === "block2") {
      others.forEach((l) => ob("block", l));
      addCoins(s, free, z - 4, 6);
    } else if (kind === "log") {
      ob("log", "all");
      addCoins(s, pick(lanes), z - 0.8, 3, 1.6, 0.8); // coins in an arc over the log
    } else if (kind === "branch") {
      ob("branch", "all");
      addCoins(s, pick(lanes), z - 3, 5);
    } else if (kind === "pit") {
      ob("pit", "all", { len: 2.4 });
      addCoins(s, pick(lanes), z - 0.2, 3, 1.7, 1);
    } else if (kind === "mixed") {
      ob("log", others[0]);
      ob("block", others[1]);
      addCoins(s, free, z - 4, 6);
    } else {
      // a wavy line of coins
      let l = pick(lanes);
      for (let i = 0; i < 8; i++) {
        s.coinsList.push({ id: s.nextId++, z: z + i * 1.6, lane: l, y: 0.5, got: false });
        if (i % 3 === 2) l = clamp(l + pick([-1, 1]), -1, 1);
      }
    }
    s.rows++;
    s.nextRow += Math.max(10, s.speed * (LEVEL_CFG[s.level] || LEVEL_CFG.medium).gap) + rand() * 3;
  }
}

/* ---------- one frame ---------- */

export function step(s, dt, rand = Math.random) {
  if (!s.alive) return s;
  s.time += dt;

  // speed builds up, and drops while you are stumbling
  const cfg = LEVEL_CFG[s.level] || LEVEL_CFG.medium;
  let target = Math.min(cfg.max, cfg.start + s.time * cfg.ramp);
  if (s.stumble > 0) target *= 0.78;
  s.speed += (target - s.speed) * Math.min(1, dt * 1.5);
  s.dist += s.speed * dt;
  s.phase += s.speed * dt * 0.9;

  // lane change is quick but smooth
  const dx = s.targetLane - s.x;
  s.x += clamp(dx, -9 * dt, 9 * dt);

  // jumping
  if (s.y > 0 || s.vy > 0) {
    s.vy -= GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y <= 0) {
      s.y = 0;
      s.vy = 0;
    }
  }
  if (s.slide > 0) s.slide = Math.max(0, s.slide - dt);
  if (s.stumble > 0) s.stumble = Math.max(0, s.stumble - dt);
  if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt);
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt);

  // coins
  for (const c of s.coinsList) {
    if (c.got || Math.abs(c.z - s.dist) > 0.6) continue;
    if (Math.abs(c.lane - s.x) < 0.6 && Math.abs(c.y - (s.y + 0.6)) < 1.1) {
      c.got = true;
      s.coins++;
    }
  }

  // obstacles
  for (const o of s.obstacles) {
    if (o.hit) continue;
    const here = o.lane === "all" || Math.abs(o.lane - s.x) < 0.6;
    if (!here) continue;
    if (o.type === "pit") {
      if (s.dist > o.z + 0.3 && s.dist < o.z + o.len - 0.3 && s.y < 0.35) {
        s.alive = false;
        s.cause = "fell";
        s.shake = 0.5;
        return s;
      }
      continue;
    }
    if (Math.abs(o.z - s.dist) > 0.45) continue;
    let hit = false;
    if (o.type === "block") hit = true;
    else if (o.type === "log") hit = s.y < 0.55;
    else if (o.type === "branch") hit = s.slide <= 0;
    if (!hit) continue;
    o.hit = true;
    if (s.cooldown > 0) continue;
    if (s.stumble > 0) {
      s.alive = false;
      s.cause = "caught";
      s.shake = 0.5;
      return s;
    }
    s.stumble = STUMBLE_TIME;
    s.cooldown = 1;
    s.shake = 0.35;
    s.speed *= 0.65;
  }

  // forget what is behind us, add what is ahead
  s.obstacles = s.obstacles.filter((o) => o.z + (o.len || 0) > s.dist - 6);
  s.coinsList = s.coinsList.filter((c) => c.z > s.dist - 6);
  spawn(s, rand);
  return s;
}
