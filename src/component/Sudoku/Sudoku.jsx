import { useEffect, useState } from "react";
import { cachedPuzzle, newSeed, LEVELS, peers, ROW, COL } from "./puzzle";
import useRoom from "../../net/useRoom";
import RoomBar from "../Room/RoomBar";
import "./Sudoku.css";

const fresh = (seed = newSeed(), level = "medium") => ({
  seed,
  level,
  entries: Array(81).fill(0), // what the players have typed (0 = nothing)
  hints: 0,
  startedAt: null,
  solvedAt: null,
});

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Put number v (0 = clear) in cell i. Clues can't be changed. Safe to apply twice.
function applySet(g, i, v, t) {
  const { puzzle, solution } = cachedPuzzle(g.seed, g.level);
  if (puzzle[i]) return g;
  const entries = g.entries.slice();
  entries[i] = v;
  const done = entries.every((e, k) => (puzzle[k] || e) === solution[k]);
  return { ...g, entries, startedAt: g.startedAt || t, solvedAt: done ? g.solvedAt || t : null };
}

export default function Sudoku({ intent, onExit }) {
  const [game, setGame] = useState(() => fresh());
  const [selected, setSelected] = useState(null);
  const [pencil, setPencil] = useState(false);
  const [notes, setNotes] = useState({}); // your own pencil marks: { cell: bitmask }
  const [showMistakes, setShowMistakes] = useState(true);
  const [friendCell, setFriendCell] = useState(null);
  const [now, setNow] = useState(Date.now());

  // the puzzle itself is rebuilt from the seed, so only the seed and the entries are shared
  const { puzzle, solution } = cachedPuzzle(game.seed, game.level);

  const room = useRoom("sudoku", {
    onMessage: (kind, p) => {
      if (kind === "set") setGame((g) => applySet(g, p.i, p.v, p.t));
      else if (kind === "hint") setGame((g) => applySet({ ...g, hints: g.hints + 1 }, p.i, cachedPuzzle(g.seed, g.level).solution[p.i], p.t));
      else if (kind === "new") {
        setGame(fresh(p.seed, p.level));
        setNotes({});
        setSelected(null);
      } else if (kind === "sync") setGame(p);
      else if (kind === "cursor") setFriendCell(p.i);
    },
    onConnected: (role) => role === "host" && room.send("sync", game),
    onDisconnected: () => setFriendCell(null),
  }, intent);

  const solved = Boolean(game.solvedAt);
  useEffect(() => {
    if (!game.startedAt || solved) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [game.startedAt, solved]);

  const valueAt = (i) => puzzle[i] || game.entries[i];
  const isWrong = (i) => !puzzle[i] && game.entries[i] && game.entries[i] !== solution[i];

  function setCell(i, v) {
    if (puzzle[i] || solved) return;
    const t = Date.now();
    const v2 = game.entries[i] === v ? 0 : v;
    setGame((g) => applySet(g, i, v2, t));
    room.send("set", { i, v: v2, t });
    if (v2) {
      // a placed number clears that pencil mark from the cells it sees
      setNotes((n) => {
        const next = { ...n, [i]: 0 };
        peers(i).forEach((p) => {
          if (next[p]) next[p] &= ~(1 << v2);
        });
        return next;
      });
    }
  }

  function press(v) {
    if (selected === null || puzzle[selected] || solved) return;
    if (pencil) {
      if (game.entries[selected]) return;
      setNotes((n) => ({ ...n, [selected]: (n[selected] || 0) ^ (1 << v) }));
    } else setCell(selected, v);
  }

  function erase() {
    if (selected === null || puzzle[selected] || solved) return;
    if (game.entries[selected]) setCell(selected, game.entries[selected]);
    else setNotes((n) => ({ ...n, [selected]: 0 }));
  }

  function hint() {
    if (solved) return;
    // fill the selected cell, or the first wrong/empty one
    let i = selected;
    if (i === null || puzzle[i] || game.entries[i] === solution[i]) {
      i = game.entries.findIndex((e, k) => !puzzle[k] && e !== solution[k]);
    }
    if (i < 0) return;
    const t = Date.now();
    setGame((g) => applySet({ ...g, hints: g.hints + 1 }, i, solution[i], t));
    room.send("hint", { i, t });
    setSelected(i);
  }

  function select(i) {
    setSelected(i);
    room.send("cursor", { i });
  }

  function newPuzzle(level = game.level) {
    const seed = newSeed();
    setGame(fresh(seed, level));
    setNotes({});
    setSelected(null);
    room.send("new", { seed, level });
  }

  // keyboard
  useEffect(() => {
    function onKey(e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
      if (e.key >= "1" && e.key <= "9") press(Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") erase();
      else if (e.key.startsWith("Arrow") && selected !== null) {
        e.preventDefault();
        const r = ROW(selected) + (e.key === "ArrowDown") - (e.key === "ArrowUp");
        const c = COL(selected) + (e.key === "ArrowRight") - (e.key === "ArrowLeft");
        if (r >= 0 && r < 9 && c >= 0 && c < 9) select(r * 9 + c);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // numbers: how many of each are still to place
  const placed = Array(10).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = valueAt(i);
    if (v && v === solution[i]) placed[v]++;
  }

  const sel = selected;
  const selVal = sel !== null ? valueAt(sel) : 0;
  const near = sel !== null ? new Set([sel, ...peers(sel)]) : new Set();
  const empty = game.entries.filter((e, i) => !puzzle[i] && e !== solution[i]).length;

  return (
    <main className="game">
      <h1 className="title">
        Su<span>doku</span>
      </h1>

      <RoomBar room={room} onExit={onExit} youAre={room.connected ? "Solving together" : null} />

      <div className="sd-levels" role="radiogroup" aria-label="Difficulty">
        {Object.entries(LEVELS).map(([id, l]) => (
          <button key={id} role="radio" aria-checked={game.level === id} className="mode-opt" onClick={() => newPuzzle(id)}>
            {l.name}
          </button>
        ))}
      </div>

      <section className="scoreboard" aria-label="Progress">
        <div className="score score-x">
          <span className="score-label">Left</span>
          <span className="score-value">{empty}</span>
        </div>
        <div className="score">
          <span className="score-label">Time</span>
          <span className="score-value">{game.startedAt ? fmt((game.solvedAt || now) - game.startedAt) : "0:00"}</span>
        </div>
        <div className="score score-o">
          <span className="score-label">Hints</span>
          <span className="score-value">{game.hints}</span>
        </div>
      </section>

      <p className="status" aria-live="polite">
        {solved ? <><strong>Solved!</strong> {fmt(game.solvedAt - game.startedAt)} with {game.hints} {game.hints === 1 ? "hint" : "hints"}</> : "Pick a square, then a number."}
      </p>

      <div className="sd-grid" role="grid" aria-label="Sudoku board">
        {Array.from({ length: 81 }, (_, i) => {
          const v = valueAt(i);
          const given = Boolean(puzzle[i]);
          const wrong = showMistakes && isWrong(i);
          const cls = [
            "sd-cell",
            given ? "given" : "",
            i === sel ? "sel" : near.has(i) ? "near" : "",
            v && v === selVal && i !== sel ? "same" : "",
            wrong ? "wrong" : "",
            i === friendCell ? "friend" : "",
            COL(i) % 3 === 2 && COL(i) !== 8 ? "r-edge" : "",
            ROW(i) % 3 === 2 && ROW(i) !== 8 ? "b-edge" : "",
          ].join(" ");
          const marks = notes[i] || 0;
          return (
            <button
              key={i}
              className={cls}
              onClick={() => select(i)}
              aria-label={`Row ${ROW(i) + 1}, column ${COL(i) + 1}, ${v ? v : "empty"}${given ? ", given" : ""}${wrong ? ", wrong" : ""}`}
            >
              {v ? (
                <span className="sd-val">{v}</span>
              ) : marks ? (
                <span className="sd-notes" aria-hidden="true">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <i key={n}>{marks & (1 << n) ? n : ""}</i>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="sd-pad" aria-label="Number pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} className="sd-key" onClick={() => press(n)} disabled={placed[n] >= 9 || solved} aria-label={`Number ${n}, ${9 - placed[n]} left`}>
            <b>{n}</b>
            <small>{9 - placed[n]}</small>
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-ghost" aria-pressed={pencil} onClick={() => setPencil((p) => !p)}>
          Notes: {pencil ? "on" : "off"}
        </button>
        <button className="btn btn-ghost" onClick={erase}>Erase</button>
        <button className="btn btn-ghost" onClick={hint} disabled={solved}>Hint</button>
        <button className="btn btn-ghost" aria-pressed={showMistakes} onClick={() => setShowMistakes((s) => !s)}>
          Mistakes: {showMistakes ? "shown" : "hidden"}
        </button>
        <button className={`btn ${solved ? "btn-primary" : "btn-ghost"}`} onClick={() => newPuzzle()}>New puzzle</button>
      </div>
    </main>
  );
}
