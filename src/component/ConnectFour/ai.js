// The computer player for Connect Four (it plays Player 2). Pure functions.
const COLS = 7;
const ROWS = 6;
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

const dropRow = (b, c) => {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r * COLS + c] === 0) return r;
  return -1;
};
const legal = (b) => [0, 1, 2, 3, 4, 5, 6].filter((c) => b[c] === 0);

function wins(b, p) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (b[r * COLS + c] !== p) continue;
      for (const [dr, dc] of DIRS) {
        let k = 1;
        while (k < 4) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr * COLS + cc] !== p) break;
          k++;
        }
        if (k === 4) return true;
      }
    }
  return false;
}

const play = (b, c, p) => {
  const n = b.slice();
  n[dropRow(b, c) * COLS + c] = p;
  return n;
};

// A rough value of the board for player 2: windows of four with their own pieces score, the opponent's lose.
function evaluate(b) {
  let s = 0;
  for (let r = 0; r < ROWS; r++) if (b[r * COLS + 3] === 2) s += 3;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      for (const [dr, dc] of DIRS) {
        const er = r + dr * 3, ec = c + dc * 3;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
        let a = 0, o = 0;
        for (let k = 0; k < 4; k++) {
          const v = b[(r + dr * k) * COLS + c + dc * k];
          if (v === 2) a++; else if (v === 1) o++;
        }
        if (a && !o) s += a === 3 ? 6 : a === 2 ? 2 : 0;
        if (o && !a) s -= o === 3 ? 8 : o === 2 ? 2 : 0;
      }
  return s;
}

const ORDER = [3, 2, 4, 1, 5, 0, 6];

function search(b, depth, alpha, beta, maxing) {
  if (wins(b, 2)) return 100000 + depth;
  if (wins(b, 1)) return -100000 - depth;
  const moves = ORDER.filter((c) => b[c] === 0);
  if (!moves.length) return 0;
  if (depth === 0) return evaluate(b);
  if (maxing) {
    let v = -Infinity;
    for (const c of moves) {
      v = Math.max(v, search(play(b, c, 2), depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, v);
      if (alpha >= beta) break;
    }
    return v;
  }
  let v = Infinity;
  for (const c of moves) {
    v = Math.min(v, search(play(b, c, 1), depth - 1, alpha, beta, true));
    beta = Math.min(beta, v);
    if (alpha >= beta) break;
  }
  return v;
}

function immediate(b, p) {
  return legal(b).find((c) => wins(play(b, c, p), p));
}

// level: easy = mostly random, medium = wins, blocks and likes the middle, hard = looks six moves ahead
export function computerMove(board, level = "medium") {
  const moves = legal(board);
  const random = () => moves[Math.floor(Math.random() * moves.length)];
  if (level === "easy") {
    const win = immediate(board, 2);
    if (win !== undefined && Math.random() < 0.5) return win;
    return random();
  }
  const win = immediate(board, 2);
  if (win !== undefined) return win;
  const block = immediate(board, 1);
  if (level === "medium") {
    if (block !== undefined && Math.random() < 0.9) return block;
    const safe = moves.filter((c) => immediate(play(board, c, 2), 1) === undefined);
    const pool = safe.length ? safe : moves;
    return Math.random() < 0.55 ? ORDER.find((c) => pool.includes(c)) : pool[Math.floor(Math.random() * pool.length)];
  }
  if (block !== undefined) return block;
  let best = -Infinity;
  let pick = ORDER.find((c) => moves.includes(c));
  for (const c of ORDER.filter((c) => moves.includes(c))) {
    const v = search(play(board, c, 2), 5, -Infinity, Infinity, false);
    if (v > best) { best = v; pick = c; }
  }
  return pick;
}
