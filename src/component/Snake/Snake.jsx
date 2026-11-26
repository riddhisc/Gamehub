import { useEffect, useRef, useState } from "react";
import Levels, { useLevel } from "../Levels/Levels";
import "./Snake.css";

const SIZE = 15;
const START_MS = 140;
const APPLES_PER_LEVEL = 5;

export const MODES = [
  { id: "classic", name: "Classic", hint: "Walls are deadly." },
  { id: "portal", name: "Portal", hint: "Leave one side, come back on the other." },
  { id: "rocks", name: "Rocks", hint: "Walls and rocks are deadly. More rocks every level." },
];

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEYS = {
  ArrowUp: "up", w: "up", W: "up",
  ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
};

const key = (p) => p.y * SIZE + p.x;

// A free cell (not on the snake, rocks, food or items), optionally away from the head.
function freeCell(g, rand, awayFromHead = 0) {
  const taken = new Set(g.snake.map(key));
  g.rocks.forEach((p) => taken.add(key(p)));
  [g.food, g.gold, g.clock, g.shrink].forEach((p) => p && taken.add(key(p)));
  const head = g.snake[0];
  const free = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (taken.has(i)) continue;
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    if (awayFromHead && Math.abs(x - head.x) + Math.abs(y - head.y) < awayFromHead) continue;
    free.push({ x, y });
  }
  return free.length ? free[Math.floor(rand() * free.length)] : null;
}

export function newGame(mode = "classic", running = false, rand = Math.random, diff = "medium") {
  const snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
  const g = {
    mode,
    diff,
    snake,
    dir: DIRS.right,   // direction used on the last move
    queue: [],         // turns waiting to be used (so quick key presses aren't lost)
    food: null,
    gold: null,
    clock: null,
    shrink: null,
    rocks: [],
    alive: true,
    running,
    ticks: 0,
    score: 0,
    apples: 0,
    level: 1,
    slow: 0,
  };
  if (mode === "rocks") {
    for (let i = 0; i < 4; i++) {
      const c = freeCell(g, rand, 5);
      if (c) g.rocks.push(c);
    }
  }
  g.food = freeCell(g, rand);
  return g;
}

// easy is slower and speeds up gently, hard starts fast and speeds up quickly
const DIFF = {
  easy: { start: 1.35, step: 6, min: 95 },
  medium: { start: 1, step: 9, min: 60 },
  hard: { start: 0.72, step: 12, min: 42 },
};
export const tickMs = (g) => {
  const d = DIFF[g.diff] || DIFF.medium;
  const base = Math.max(d.min, Math.round(START_MS * d.start) - (g.level - 1) * d.step);
  return g.slow > 0 ? Math.round(base * 1.7) : base;
};

// One step of the game. Pure (pass `rand` to make it predictable): returns a new state.
export function advance(g, rand = Math.random) {
  if (!g.alive || !g.running) return g;

  const dir = g.queue[0] || g.dir;
  const queue = g.queue.slice(1);
  let hx = g.snake[0].x + dir.x;
  let hy = g.snake[0].y + dir.y;

  if (g.mode === "portal") {
    hx = (hx + SIZE) % SIZE;
    hy = (hy + SIZE) % SIZE;
  }
  const head = { x: hx, y: hy };

  const eatsApple = g.food && head.x === g.food.x && head.y === g.food.y;
  const eatsGold = g.gold && head.x === g.gold.x && head.y === g.gold.y;
  const grows = eatsApple || eatsGold;

  // the tail moves out of the way unless the snake is growing
  const body = grows ? g.snake : g.snake.slice(0, -1);
  const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE;
  const hitSelf = body.some((p) => p.x === head.x && p.y === head.y);
  const hitRock = g.rocks.some((p) => p.x === head.x && p.y === head.y);

  if (hitWall || hitSelf || hitRock) {
    return { ...g, dir, queue, alive: false, running: false };
  }

  let snake = [head, ...body];
  let { score, apples, level, slow } = g;
  let food = g.food;
  let gold = g.gold;
  let clock = g.clock;
  let shrink = g.shrink;
  let rocks = g.rocks;
  let leveledUp = false;

  if (slow > 0) slow -= 1;

  if (eatsApple) {
    apples += 1;
    score += 9 + level;
    if (apples % APPLES_PER_LEVEL === 0) {
      level += 1;
      leveledUp = true;
    }
  }
  if (eatsGold) {
    apples += 1;
    score += 50;
    gold = null;
  }
  if (clock && head.x === clock.x && head.y === clock.y) {
    slow = 40;
    score += 5;
    clock = null;
  }
  if (shrink && head.x === shrink.x && head.y === shrink.y) {
    snake = snake.slice(0, Math.max(3, snake.length - 3));
    score += 5;
    shrink = null;
  }

  let next = { ...g, snake, dir, queue, food, gold, clock, shrink, rocks, score, apples, level, slow, ticks: g.ticks + 1, alive: true };

  if (eatsApple || !food) next.food = freeCell(next, rand);

  // more rocks every level
  if (leveledUp && g.mode === "rocks") {
    const extra = [];
    for (let i = 0; i < 2; i++) {
      const c = freeCell({ ...next, rocks: [...next.rocks, ...extra] }, rand, 5);
      if (c) extra.push(c);
    }
    next.rocks = [...next.rocks, ...extra];
  }

  // bonus items come and go
  const age = (item) => (item && item.ttl > 1 ? { ...item, ttl: item.ttl - 1 } : null);
  next.gold = next.gold ? age(next.gold) : null;
  next.clock = next.clock ? age(next.clock) : null;
  next.shrink = next.shrink ? age(next.shrink) : null;
  if (!next.gold && rand() < 0.014) {
    const c = freeCell(next, rand);
    if (c) next.gold = { ...c, ttl: 45 };
  }
  if (!next.clock && rand() < 0.008) {
    const c = freeCell(next, rand);
    if (c) next.clock = { ...c, ttl: 60 };
  }
  if (!next.shrink && next.snake.length >= 9 && rand() < 0.008) {
    const c = freeCell(next, rand);
    if (c) next.shrink = { ...c, ttl: 60 };
  }
  return next;
}

/* ---------- saving the best scores ---------- */

const BEST_KEY = "gamehub-snake-best-v1";
const loadBest = () => {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) || {};
  } catch {
    return {};
  }
};

/* ---------- drawing ---------- */

function Board({ g }) {
  const [hx, hy] = [g.snake[0].x + 0.5, g.snake[0].y + 0.5];
  const eye = (side) => {
    const d = g.dir;
    // eyes sit on either side of the direction of travel
    const px = -d.y * side;
    const py = d.x * side;
    return [hx + d.x * 0.14 + px * 0.2, hy + d.y * 0.14 + py * 0.2];
  };
  const n = g.snake.length;
  const segs = [];
  for (let i = n - 1; i > 0; i--) {
    const a = g.snake[i];
    const b = g.snake[i - 1];
    if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) continue; // wrapped through a portal
    const t = i / n; // 0 near the head, 1 at the tail
    segs.push(
      <line
        key={i}
        x1={a.x + 0.5}
        y1={a.y + 0.5}
        x2={b.x + 0.5}
        y2={b.y + 0.5}
        stroke={`hsl(${160 - t * 40} 85% ${58 - t * 14}%)`}
        strokeWidth={0.82 - t * 0.2}
        strokeLinecap="round"
      />
    );
  }

  const blink = (item) => item.ttl < 12 && item.ttl % 2 === 0;

  return (
    <svg className={`snake-svg ${g.slow > 0 ? "slowed" : ""} ${g.alive ? "" : "dead"}`} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img"
      aria-label={`Snake board. Score ${g.score}, level ${g.level}, length ${n}.`}>
      <defs>
        <pattern id="snake-checker" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="#13242c" />
          <rect width="1" height="1" fill="#172b34" />
          <rect x="1" y="1" width="1" height="1" fill="#172b34" />
        </pattern>
      </defs>
      <rect width={SIZE} height={SIZE} fill="url(#snake-checker)" />
      {g.mode === "portal" && <rect className="portal-edge" x="0.05" y="0.05" width={SIZE - 0.1} height={SIZE - 0.1} fill="none" />}

      {g.rocks.map((r, i) => (
        <g key={i}>
          <rect x={r.x + 0.1} y={r.y + 0.1} width="0.8" height="0.8" rx="0.25" fill="#59707b" />
          <rect x={r.x + 0.2} y={r.y + 0.18} width="0.45" height="0.22" rx="0.1" fill="#7f97a2" />
        </g>
      ))}

      {g.food && (
        <g>
          <circle cx={g.food.x + 0.5} cy={g.food.y + 0.56} r="0.34" fill="#ff5d6c" />
          <path d={`M${g.food.x + 0.5} ${g.food.y + 0.28}q0.05 -0.2 0.25 -0.24`} stroke="#5ed67b" strokeWidth="0.1" fill="none" strokeLinecap="round" />
        </g>
      )}
      {g.gold && !blink(g.gold) && (
        <g className="gold">
          <circle cx={g.gold.x + 0.5} cy={g.gold.y + 0.5} r="0.42" fill="#ffd23f" stroke="#fff3b0" strokeWidth="0.08" />
          <path d={`M${g.gold.x + 0.5} ${g.gold.y + 0.25}l0.07 0.17 0.18 0.01 -0.14 0.11 0.05 0.18 -0.16 -0.1 -0.16 0.1 0.05 -0.18 -0.14 -0.11 0.18 -0.01z`} fill="#b57600" />
        </g>
      )}
      {g.clock && !blink(g.clock) && (
        <g>
          <circle cx={g.clock.x + 0.5} cy={g.clock.y + 0.5} r="0.4" fill="#5cc8ff" />
          <path d={`M${g.clock.x + 0.5} ${g.clock.y + 0.28}V${g.clock.y + 0.5}l0.15 0.1`} stroke="#0f1b21" strokeWidth="0.09" fill="none" strokeLinecap="round" />
        </g>
      )}
      {g.shrink && !blink(g.shrink) && (
        <g>
          <circle cx={g.shrink.x + 0.5} cy={g.shrink.y + 0.5} r="0.4" fill="#b074ff" />
          <path d={`M${g.shrink.x + 0.3} ${g.shrink.y + 0.5}h0.4`} stroke="#fff" strokeWidth="0.11" strokeLinecap="round" />
        </g>
      )}

      {segs}
      {g.snake.length > 1 && (
        <circle cx={g.snake[n - 1].x + 0.5} cy={g.snake[n - 1].y + 0.5} r={0.82 * 0.5 - 0.1} fill="hsl(120 70% 40%)" opacity="0" />
      )}
      <circle cx={hx} cy={hy} r="0.46" fill="#9bffe0" />
      {[1, -1].map((s) => {
        const [ex, ey] = eye(s);
        return (
          <g key={s}>
            <circle cx={ex} cy={ey} r="0.11" fill="#fff" />
            <circle cx={ex + g.dir.x * 0.04} cy={ey + g.dir.y * 0.04} r="0.055" fill="#0f1b21" />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- the game ---------- */

export default function Snake() {
  const [mode, setMode] = useState("classic");
  const [diff, setDiff] = useLevel("snake");
  const [game, setGame] = useState(() => newGame("classic", false, Math.random, diff));
  const [best, setBest] = useState(loadBest);
  const touch = useRef(null);

  const modeInfo = MODES.find((m) => m.id === mode);
  const bestOf = (m, d) => (d === "medium" ? m : `${m}-${d}`); // medium keeps the old save slot
  const bestHere = best[bestOf(mode, diff)] || 0;
  const ms = tickMs(game);

  // game loop (speeds up with each level, slows during slow-mo)
  useEffect(() => {
    if (!game.running) return;
    const id = setInterval(() => setGame((g) => advance(g)), ms);
    return () => clearInterval(id);
  }, [game.running, ms]);

  // remember the best score when a run ends
  useEffect(() => {
    if (game.alive || game.score === 0) return;
    setBest((b) => {
      const k = game.diff === "medium" ? game.mode : `${game.mode}-${game.diff}`;
      if ((b[k] || 0) >= game.score) return b;
      const next = { ...b, [k]: game.score };
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {
        /* not remembered */
      }
      return next;
    });
  }, [game.alive, game.score, game.mode, game.diff]);

  function turn(name) {
    const d = DIRS[name];
    setGame((g) => {
      if (!g.alive) return g;
      const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
      if (d.x === -last.x && d.y === -last.y) return g; // can't reverse
      if (d.x === last.x && d.y === last.y) return g.running ? g : { ...g, running: true };
      return { ...g, queue: [...g.queue, d].slice(-2), running: true };
    });
  }

  // keyboard controls
  useEffect(() => {
    function onKey(e) {
      if (e.key === " ") {
        e.preventDefault();
        setGame((g) => (g.alive && g.ticks > 0 ? { ...g, running: !g.running } : g));
        return;
      }
      const name = KEYS[e.key];
      if (!name) return;
      e.preventDefault();
      turn(name);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // swipe on the board
  function onTouchStart(e) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? "right" : "left");
    else turn(dy > 0 ? "down" : "up");
  }

  function pickMode(id) {
    setMode(id);
    setGame(newGame(id, false, Math.random, diff));
  }

  function primaryAction() {
    if (!game.alive) setGame(newGame(mode, true, Math.random, diff));
    else setGame((g) => ({ ...g, running: !g.running }));
  }

  let buttonLabel = "Start";
  if (!game.alive) buttonLabel = "Play again";
  else if (game.running) buttonLabel = "Pause";
  else if (game.ticks > 0) buttonLabel = "Resume";

  const nextLevelIn = APPLES_PER_LEVEL - (game.apples % APPLES_PER_LEVEL);
  let status = "Press an arrow key, swipe, or Start";
  if (!game.alive) status = <><strong>Game over.</strong> Score {game.score}, level {game.level}{game.score > 0 && game.score >= bestHere ? ". New best!" : ""}</>;
  else if (game.running && game.slow > 0) status = <><strong>Slow motion!</strong> {game.slow} moves left</>;
  else if (game.running) status = <>{nextLevelIn} {nextLevelIn === 1 ? "apple" : "apples"} to level {game.level + 1}</>;
  else if (game.ticks > 0) status = "Paused";

  return (
    <main className="game">
      <h1 className="title">
        <span>Snake</span>
      </h1>

      <div className="snake-modes" role="radiogroup" aria-label="Game mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={m.id === mode}
            className="mode-opt"
            onClick={() => pickMode(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>
      <p className="snake-hint">{modeInfo.hint}</p>
      <Levels
        value={diff}
        onChange={(l) => { setDiff(l); setGame(newGame(mode, false, Math.random, l)); }}
        hints={{ easy: "Slower snake, more time to think.", medium: "The classic speed.", hard: "Fast from the start and it keeps speeding up." }}
      />

      <section className="scoreboard" aria-label="Scoreboard">
        <div className="score score-x">
          <span className="score-label">Score</span>
          <span className="score-value">{game.score}</span>
        </div>
        <div className="score">
          <span className="score-label">Level</span>
          <span className="score-value">{game.level}</span>
        </div>
        <div className="score score-o">
          <span className="score-label">Best</span>
          <span className="score-value">{bestHere}</span>
        </div>
      </section>

      <p className="status" aria-live="polite">{status}</p>

      <div className="snake-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <Board g={game} />
      </div>

      <p className="snake-legend" aria-label="Bonus items">
        <span><i className="lg lg-gold" />Gold +50</span>
        <span><i className="lg lg-clock" />Slow motion</span>
        <span><i className="lg lg-shrink" />Shorter by 3</span>
      </p>

      <div className="dpad" aria-label="Direction buttons">
        <button className="dpad-btn" aria-label="Left" onClick={() => turn("left")}>←</button>
        <button className="dpad-btn" aria-label="Up" onClick={() => turn("up")}>↑</button>
        <button className="dpad-btn" aria-label="Down" onClick={() => turn("down")}>↓</button>
        <button className="dpad-btn" aria-label="Right" onClick={() => turn("right")}>→</button>
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={primaryAction}>
          {buttonLabel}
        </button>
      </div>
    </main>
  );
}
