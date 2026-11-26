import { useState } from "react";
import Levels, { useLevel } from "../Levels/Levels";
import "./MemoryMatch.css";

const SHAPES = [
  { name: "circle",   color: "#26ffcb", svg: <circle cx="50" cy="50" r="30" /> },
  { name: "square",   color: "#ffb86b", svg: <rect x="22" y="22" width="56" height="56" rx="6" /> },
  { name: "triangle", color: "#8ab4ff", svg: <polygon points="50,18 84,78 16,78" /> },
  { name: "diamond",  color: "#ff7a90", svg: <polygon points="50,12 88,50 50,88 12,50" /> },
  { name: "plus",     color: "#c792ff", svg: <path d="M40 16h20v24h24v20H60v24H40V60H16V40h24z" /> },
  { name: "star",     color: "#ffd86b", svg: <polygon points="50,12 61,38 89,40 67,58 74,86 50,70 26,86 33,58 11,40 39,38" /> },
  { name: "hexagon",  color: "#6be0ff", svg: <polygon points="50,12 84,31 84,69 50,88 16,69 16,31" /> },
  { name: "heart",    color: "#ff8fd0", svg: <path d="M50 84 L18 52 C6 38 14 18 32 18 C41 18 47 23 50 30 C53 23 59 18 68 18 C86 18 94 38 82 52 Z" /> },
  { name: "moon",     color: "#f3e38a", svg: <path d="M62 14 A38 38 0 1 0 86 62 A30 30 0 0 1 62 14 Z" /> },
  { name: "bolt",     color: "#ffa04d", svg: <polygon points="56,10 26,54 46,54 40,90 74,42 54,42" /> },
  { name: "drop",     color: "#5fd0ff", svg: <path d="M50 12 C70 38 78 52 78 64 A28 28 0 0 1 22 64 C22 52 30 38 50 12 Z" /> },
  { name: "ring",     color: "#9cf06b", svg: <circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" strokeWidth="14" /> },
];

// how many pairs on the table
const PAIRS = { easy: 6, medium: 8, hard: 12 };

function newDeck(level = "medium") {
  const shapes = SHAPES.slice(0, PAIRS[level]);
  const deck = [...shapes, ...shapes];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function MemoryMatch() {
  const [level, setLevel] = useLevel("memory");
  const [cards, setCards] = useState(() => newDeck(level));
  const [flipped, setFlipped] = useState([]); // indexes face up this turn
  const [matched, setMatched] = useState([]); // indexes already paired
  const [moves, setMoves] = useState(0);
  const [bests, setBests] = useState({});
  const best = bests[level] ?? null;
  const [locked, setLocked] = useState(false);

  const won = matched.length === cards.length;

  function flip(i) {
    if (locked || won || flipped.includes(i) || matched.includes(i)) return;

    const next = [...flipped, i];
    setFlipped(next);
    if (next.length < 2) return;

    const newMoves = moves + 1;
    setMoves(newMoves);
    const [a, b] = next;

    if (cards[a].name === cards[b].name) {
      const nowMatched = [...matched, a, b];
      setMatched(nowMatched);
      setFlipped([]);
      if (nowMatched.length === cards.length) {
        setBests((b) => ({ ...b, [level]: b[level] == null ? newMoves : Math.min(b[level], newMoves) }));
      }
    } else {
      setLocked(true);
      setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 800);
    }
  }

  function newGame(l = level) {
    setCards(newDeck(l));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setLocked(false);
  }

  return (
    <main className="game">
      <h1 className="title">
        Memory <span>Match</span>
      </h1>

      <Levels
        value={level}
        onChange={(l) => { setLevel(l); newGame(l); }}
        hints={{ easy: "6 pairs", medium: "8 pairs", hard: "12 pairs" }}
      />

      <section className="scoreboard" aria-label="Progress">
        <div className="score">
          <span className="score-label">Moves</span>
          <span className="score-value">{moves}</span>
        </div>
        <div className="score score-x">
          <span className="score-label">Pairs</span>
          <span className="score-value">{matched.length / 2} / {cards.length / 2}</span>
        </div>
        <div className="score score-o">
          <span className="score-label">Best</span>
          <span className="score-value">{best ?? "–"}</span>
        </div>
      </section>

      <p className="status" aria-live="polite">
        {won ? <>All pairs found in <strong>{moves}</strong> moves!</> : "Flip two cards to find a pair"}
      </p>

      <div className="memory-board">
        {cards.map((card, i) => {
          const faceUp = flipped.includes(i) || matched.includes(i);
          const isMatched = matched.includes(i);
          return (
            <button
              key={i}
              className={`card ${faceUp ? "up" : "down"} ${isMatched ? "matched" : ""}`}
              style={faceUp ? { color: card.color } : undefined}
              onClick={() => flip(i)}
              aria-label={`Card ${i + 1}, ${faceUp ? card.name : "face down"}`}
            >
              {faceUp && (
                <svg className="shape" viewBox="0 0 100 100" aria-hidden="true">
                  {card.svg}
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={() => newGame()}>
          New game
        </button>
      </div>
    </main>
  );
}
