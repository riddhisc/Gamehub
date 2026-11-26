// The computer player for Tic Tac Toe (it plays "O"). Pure functions, easy to test.
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const winner = (b) => {
  for (const [x, y, z] of LINES) if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x];
  return null;
};
const empties = (b) => b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);

// Perfect play: +1 if O ends up winning, -1 if X does, 0 for a draw (faster wins score higher).
function minimax(b, turn, depth) {
  const w = winner(b);
  if (w) return w === "O" ? 10 - depth : depth - 10;
  const free = empties(b);
  if (!free.length) return 0;
  let best = turn === "O" ? -Infinity : Infinity;
  for (const i of free) {
    b[i] = turn;
    const v = minimax(b, turn === "O" ? "X" : "O", depth + 1);
    b[i] = null;
    best = turn === "O" ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

function bestMove(board) {
  const b = board.slice();
  let best = -Infinity;
  let moves = [];
  for (const i of empties(b)) {
    b[i] = "O";
    const v = minimax(b, "X", 1);
    b[i] = null;
    if (v > best) { best = v; moves = [i]; } else if (v === best) moves.push(i);
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

// A move that wins (or blocks) a line right now, if there is one.
function lineMove(board, mark) {
  for (const [x, y, z] of LINES) {
    const cells = [x, y, z];
    const mine = cells.filter((i) => board[i] === mark).length;
    const free = cells.filter((i) => !board[i]);
    if (mine === 2 && free.length === 1) return free[0];
  }
  return null;
}

// level: easy = mostly random, medium = wins and blocks but misses traps, hard = never loses
export function computerMove(board, level = "medium") {
  const free = empties(board);
  const random = () => free[Math.floor(Math.random() * free.length)];
  if (level === "easy") {
    // sometimes takes a win that is right there, otherwise random
    return Math.random() < 0.25 ? lineMove(board, "O") ?? random() : random();
  }
  if (level === "medium") {
    const win = lineMove(board, "O");
    if (win !== null) return win;
    const block = lineMove(board, "X");
    if (block !== null && Math.random() < 0.85) return block;
    if (!board[4] && Math.random() < 0.7) return 4;
    return random();
  }
  return bestMove(board);
}
