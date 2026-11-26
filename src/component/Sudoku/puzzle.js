// Sudoku puzzles: a seed always makes the same puzzle, so two players can share one.
// A puzzle is built by filling a full grid, then removing numbers one at a time as long as
// there is still exactly one solution.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BIT = (n) => 1 << n;
const ALL = 0x3fe; // bits 1..9

const ROW = (i) => Math.floor(i / 9);
const COL = (i) => i % 9;
const BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);

// Count solutions (stops at `limit`). Optionally fills `out` with the first solution found.
function solve(grid, limit, rand, out) {
  const rows = Array(9).fill(0);
  const cols = Array(9).fill(0);
  const boxes = Array(9).fill(0);
  const g = grid.slice();
  for (let i = 0; i < 81; i++) {
    if (g[i]) {
      const b = BIT(g[i]);
      if (rows[ROW(i)] & b || cols[COL(i)] & b || boxes[BOX(i)] & b) return 0;
      rows[ROW(i)] |= b;
      cols[COL(i)] |= b;
      boxes[BOX(i)] |= b;
    }
  }
  let count = 0;

  function go() {
    // pick the empty cell with the fewest candidates
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const mask = ALL & ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]);
      let n = 0;
      for (let m = mask; m; m &= m - 1) n++;
      if (n < bestN) {
        best = i;
        bestMask = mask;
        bestN = n;
        if (n <= 1) break;
      }
    }
    if (best === -1) {
      count++;
      if (out && count === 1) for (let i = 0; i < 81; i++) out[i] = g[i];
      return count >= limit;
    }
    if (bestN === 0) return false;
    const options = [];
    for (let v = 1; v <= 9; v++) if (bestMask & BIT(v)) options.push(v);
    if (rand) for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    for (const v of options) {
      const b = BIT(v);
      g[best] = v;
      rows[ROW(best)] |= b;
      cols[COL(best)] |= b;
      boxes[BOX(best)] |= b;
      const stop = go();
      rows[ROW(best)] &= ~b;
      cols[COL(best)] &= ~b;
      boxes[BOX(best)] &= ~b;
      g[best] = 0;
      if (stop) return true;
    }
    return false;
  }
  go();
  return count;
}

export const countSolutions = (grid, limit = 2) => solve(grid, limit, null, null);

export const LEVELS = {
  easy: { name: "Easy", clues: 40 },
  medium: { name: "Medium", clues: 32 },
  hard: { name: "Hard", clues: 26 },
};

const cache = new Map();
// same as makePuzzle, remembered so repeated lookups are free
export function cachedPuzzle(seed, level) {
  const k = `${seed}-${level}`;
  if (!cache.has(k)) {
    if (cache.size > 20) cache.clear();
    cache.set(k, makePuzzle(seed, level));
  }
  return cache.get(k);
}

export const newSeed = () => 1 + Math.floor(Math.random() * 999999);

// -> { puzzle: [81 numbers, 0 = empty], solution: [81 numbers] }
export function makePuzzle(seed, level = "medium") {
  const rand = rng(seed * 7919 + (level === "easy" ? 1 : level === "hard" ? 3 : 2));
  const solution = Array(81).fill(0);
  solve(Array(81).fill(0), 1, rand, solution);

  const puzzle = solution.slice();
  const order = Array.from({ length: 81 }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let clues = 81;
  const target = (LEVELS[level] || LEVELS.medium).clues;
  for (const i of order) {
    if (clues <= target) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = keep;
    else clues--;
  }
  return { puzzle, solution };
}

// cells that share a row, column or box with cell i
export function peers(i) {
  const out = [];
  for (let j = 0; j < 81; j++) {
    if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) out.push(j);
  }
  return out;
}
export { ROW, COL, BOX };
