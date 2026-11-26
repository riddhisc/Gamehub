// Ludo rules. Everything here is pure (no React), so it is easy to test.
//
// Board: a 15 x 15 grid. Four players sit in the corners: Red (top left), Green (top right),
// Yellow (bottom right), Blue (bottom left). Each has 4 pieces.
//
// A piece's position, counted from its own start square:
//   -1       at home (needs a 6 to come out)
//   0 .. 50  on the shared 52-square track
//   51 .. 55 on its own coloured home stretch
//   56       finished (needs the exact number to land here)

export const SEATS = [
  { id: 0, name: "Red", color: "#ff5d6c", dark: "#c2293c", soft: "#ffc9ce" },
  { id: 1, name: "Green", color: "#5ed67b", dark: "#2c9a49", soft: "#c9f3d4" },
  { id: 2, name: "Yellow", color: "#ffd23f", dark: "#c79a00", soft: "#fff0b0" },
  { id: 3, name: "Blue", color: "#5cc8ff", dark: "#1f8cc4", soft: "#c7ebff" },
];

export const FINISH = 56;

// The 52 squares of the shared track, clockwise, starting at Red's start square.
export const TRACK = [
  ...[1, 2, 3, 4, 5].map((c) => [c, 6]),
  ...[5, 4, 3, 2, 1, 0].map((r) => [6, r]),
  [7, 0], [8, 0],
  ...[1, 2, 3, 4, 5].map((r) => [8, r]),
  ...[9, 10, 11, 12, 13, 14].map((c) => [c, 6]),
  [14, 7], [14, 8],
  ...[13, 12, 11, 10, 9].map((c) => [c, 8]),
  ...[9, 10, 11, 12, 13, 14].map((r) => [8, r]),
  [7, 14], [6, 14],
  ...[13, 12, 11, 10, 9].map((r) => [6, r]),
  ...[5, 4, 3, 2, 1, 0].map((c) => [c, 8]),
  [0, 7], [0, 6],
];

// Squares nobody can be captured on: each start square and the star square 8 steps on.
export const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);

export const absOf = (seat, pos) => (seat * 13 + pos) % 52;

export const HOME_STRETCH = [
  (k) => [k, 7],         // Red: along row 7 from the left
  (k) => [7, k],         // Green: down column 7 from the top
  (k) => [14 - k, 7],    // Yellow: along row 7 from the right
  (k) => [7, 14 - k],    // Blue: up column 7 from the bottom
];

export const BASE_SLOTS = [
  [[1.9, 1.9], [4.1, 1.9], [1.9, 4.1], [4.1, 4.1]],
  [[10.9, 1.9], [13.1, 1.9], [10.9, 4.1], [13.1, 4.1]],
  [[10.9, 10.9], [13.1, 10.9], [10.9, 13.1], [13.1, 13.1]],
  [[1.9, 10.9], [4.1, 10.9], [1.9, 13.1], [4.1, 13.1]],
];

// Centre-of-square (in board units) for a piece
export function cellOf(seat, pos, idx) {
  if (pos === -1) return BASE_SLOTS[seat][idx];
  if (pos <= 50) {
    const [c, r] = TRACK[absOf(seat, pos)];
    return [c + 0.5, r + 0.5];
  }
  if (pos <= 55) {
    const [c, r] = HOME_STRETCH[seat](pos - 50);
    return [c + 0.5, r + 0.5];
  }
  // finished: sits in this colour's wedge of the centre, spread out a little
  const wedge = [[6.4, 7.5], [7.5, 6.4], [8.6, 7.5], [7.5, 8.6]][seat];
  const off = (idx - 1.5) * 0.17;
  return seat % 2 === 0 ? [wedge[0], wedge[1] + off] : [wedge[0] + off, wedge[1]];
}

/* ---------- game state ---------- */

export function seatsFor(n) {
  return n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];
}

// kinds: { seat: "human" | "bot" | "remote" }
// The seats for `n` players when you choose colour `me`: you first, then clockwise.
// With two players the other one sits opposite you.
export function seatsFrom(me, n) {
  const order = n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  return order.map((k) => (me + k) % 4);
}

// easy: every player starts with one piece already on their start square
export function newGame(seats, kinds, easy = false, host = seats[0], guest = null, level = "medium") {
  const pos = {};
  seats.forEach((s) => (pos[s] = easy ? [0, -1, -1, -1] : [-1, -1, -1, -1]));
  return {
    easy,
    level, // how clever the computer players are
    host,   // the colour the host plays
    guest,  // the colour an online friend plays (or null)
    seats,
    kinds,
    pos,
    turn: seats[0],
    phase: "roll", // roll | move | over
    dice: null,    // the number rolled, while a piece must still be chosen
    last: null,    // { seat, value } shown next to the dice
    sixes: 0,
    winner: null,
    msg: "",
    moves: 0,
  };
}

export const canMove = (pos, dice) => (pos === -1 ? dice === 6 : pos + dice <= FINISH);

export function movable(g) {
  if (g.phase !== "move") return [];
  return g.pos[g.turn].map((p, i) => (canMove(p, g.dice) ? i : -1)).filter((i) => i >= 0);
}

const nextSeat = (g) => g.seats[(g.seats.indexOf(g.turn) + 1) % g.seats.length];

// The current player rolls `value` (1-6).
export function rollDice(g, value) {
  if (g.phase !== "roll") return g;
  const name = SEATS[g.turn].name;
  const base = { ...g, last: { seat: g.turn, value }, moves: g.moves + 1 };

  // three sixes in a row: the turn is lost
  if (value === 6 && g.sixes === 2) {
    return { ...base, sixes: 0, turn: nextSeat(g), dice: null, msg: `${name} rolled three 6s in a row and loses the turn` };
  }
  const probe = { ...base, phase: "move", dice: value };
  if (movable(probe).length === 0) {
    return { ...base, sixes: 0, turn: nextSeat(g), dice: null, msg: `${name} rolled ${value}: no move${g.pos[g.turn].every((p) => p === -1) ? " (every piece is at home, a 6 is needed to bring one out)" : ""}` };
  }
  return { ...probe, sixes: value === 6 ? g.sixes + 1 : 0, msg: "" };
}

// Move piece number `idx` of the current player by the rolled number.
export function moveToken(g, idx) {
  if (g.phase !== "move" || !movable(g).includes(idx)) return g;
  const seat = g.turn;
  const from = g.pos[seat][idx];
  const to = from === -1 ? 0 : from + g.dice;

  const pos = {};
  g.seats.forEach((s) => (pos[s] = g.pos[s].slice()));
  pos[seat][idx] = to;

  // landing on a square with other colours (not a safe square) sends them home
  let captured = 0;
  if (to <= 50 && !SAFE.has(absOf(seat, to))) {
    g.seats.forEach((s) => {
      if (s === seat) return;
      pos[s] = pos[s].map((p) => {
        if (p >= 0 && p <= 50 && absOf(s, p) === absOf(seat, to)) {
          captured++;
          return -1;
        }
        return p;
      });
    });
  }

  const name = SEATS[seat].name;
  const finishedNow = to === FINISH;
  if (pos[seat].every((p) => p === FINISH)) {
    return { ...g, pos, phase: "over", dice: null, winner: seat, msg: `${name} wins!`, moves: g.moves + 1 };
  }

  // another turn for a 6, a capture, or getting a piece all the way home
  const again = g.dice === 6 || captured > 0 || finishedNow;
  let msg = "";
  if (captured) msg = `${name} sent ${captured === 1 ? "a piece" : "pieces"} home!`;
  else if (finishedNow) msg = `${name} got a piece home!`;
  return {
    ...g,
    pos,
    phase: "roll",
    dice: null,
    turn: again ? seat : nextSeat(g),
    sixes: again ? g.sixes : 0,
    msg,
    moves: g.moves + 1,
  };
}

/* ---------- the computer player ---------- */

// Which of the movable pieces to play. Prefers finishing, capturing, coming out, safety.
export function botPick(g, level = g.level || "hard") {
  const seat = g.turn;
  const options = movable(g);
  // easy: anything goes. medium: usually sensible. hard: always the best looking move.
  if (level === "easy" || (level === "medium" && Math.random() < 0.35)) {
    return options[Math.floor(Math.random() * options.length)];
  }
  const danger = (s, p) => {
    // is an opponent 1-6 squares behind this track square (and it isn't safe)?
    if (p < 0 || p > 50 || SAFE.has(absOf(s, p))) return false;
    const here = absOf(s, p);
    return g.seats.some(
      (o) =>
        o !== s &&
        g.pos[o].some((q) => q >= 0 && q <= 50 && ((here - absOf(o, q) + 52) % 52 >= 1) && ((here - absOf(o, q) + 52) % 52 <= 6))
    );
  };
  let best = options[0];
  let bestScore = -Infinity;
  options.forEach((i) => {
    const from = g.pos[seat][i];
    const to = from === -1 ? 0 : from + g.dice;
    let score = to; // progress
    if (to === FINISH) score += 1000;
    if (from === -1) score += 300;
    if (to > 50) score += 200; // safe on the home stretch
    else if (SAFE.has(absOf(seat, to))) score += 150;
    if (to <= 50 && !SAFE.has(absOf(seat, to))) {
      const hit = g.seats.some((o) => o !== seat && g.pos[o].some((q) => q >= 0 && q <= 50 && absOf(o, q) === absOf(seat, to)));
      if (hit) score += 600;
      if (danger(seat, to)) score -= 180;
    }
    if (danger(seat, from)) score += 120; // run away from a threat
    score += Math.random() * 5;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
