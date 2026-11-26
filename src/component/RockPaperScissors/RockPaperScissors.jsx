import { useState } from "react";
import Levels, { useLevel } from "../Levels/Levels";
import "./RockPaperScissors.css";

const CHOICES = ["rock", "paper", "scissors"];
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

function Icon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 100 100" aria-hidden="true">
      {name === "rock" && (
        <path d="M28 72 L20 50 L36 28 L64 24 L82 44 L76 68 L50 80 Z" />
      )}
      {name === "paper" && (
        <>
          <rect x="26" y="16" width="48" height="68" rx="6" />
          <path d="M37 38h26M37 52h26M37 66h16" />
        </>
      )}
      {name === "scissors" && (
        <>
          <path d="M30 14 L68 66 M70 14 L32 66" />
          <circle cx="28" cy="78" r="9" />
          <circle cx="72" cy="78" r="9" />
        </>
      )}
    </svg>
  );
}

const COUNTER = { rock: "paper", paper: "scissors", scissors: "rock" }; // what beats each move
const randomMove = () => CHOICES[Math.floor(Math.random() * 3)];

// The computer's pick. easy: random. medium: often counters the move you use most.
// hard: learns what you tend to play after your last two moves and counters that.
export function computerPick(history, level) {
  if (level === "easy" || history.length < 3) return randomMove();
  const count = (list) => CHOICES.reduce((o, c) => ({ ...o, [c]: list.filter((x) => x === c).length }), {});
  const top = (o) => CHOICES.reduce((a, b) => (o[b] > o[a] ? b : a));
  if (level === "medium") {
    return Math.random() < 0.5 ? COUNTER[top(count(history))] : randomMove();
  }
  const key = history.slice(-2).join(",");
  const after = [];
  for (let i = 2; i < history.length; i++) if (history.slice(i - 2, i).join(",") === key) after.push(history[i]);
  const guess = after.length >= 2 ? top(count(after)) : top(count(history));
  return Math.random() < 0.8 ? COUNTER[guess] : randomMove();
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default function RockPaperScissors() {
  const [score, setScore] = useState({ you: 0, ties: 0, cpu: 0 });
  const [round, setRound] = useState(null);
  const [history, setHistory] = useState([]);
  const [level, setLevel] = useLevel("rps");

  function play(you) {
    const cpu = computerPick(history, level);
    setHistory((h) => [...h, you]);
    const outcome = you === cpu ? "ties" : BEATS[you] === cpu ? "you" : "cpu";
    setRound({ you, cpu, outcome });
    setScore((s) => ({ ...s, [outcome]: s[outcome] + 1 }));
  }

  function resetScores() {
    setScore({ you: 0, ties: 0, cpu: 0 });
    setRound(null);
    setHistory([]);
  }

  let status = "Pick rock, paper or scissors";
  if (round?.outcome === "you") status = <><strong>You win!</strong> {cap(round.you)} beats {round.cpu}</>;
  else if (round?.outcome === "cpu") status = <><strong>Computer wins.</strong> {cap(round.cpu)} beats {round.you}</>;
  else if (round) status = <><strong>It's a tie.</strong> You both chose {round.you}</>;

  const handClass = (side) =>
    `hand hand-${side} ${round && round.outcome === side ? "win" : ""}`;

  return (
    <main className="game">
      <h1 className="title">
        Rock Paper <span>Scissors</span>
      </h1>

      <Levels
        value={level}
        onChange={(l) => { setLevel(l); resetScores(); }}
        hints={{ easy: "The computer picks at random.", medium: "The computer sometimes counters your favourite move.", hard: "The computer studies your habits. Mix it up!" }}
      />

      <section className="scoreboard" aria-label="Scoreboard">
        <div className="score score-x">
          <span className="score-label">You</span>
          <span className="score-value">{score.you}</span>
        </div>
        <div className="score">
          <span className="score-label">Ties</span>
          <span className="score-value">{score.ties}</span>
        </div>
        <div className="score score-o">
          <span className="score-label">Computer</span>
          <span className="score-value">{score.cpu}</span>
        </div>
      </section>

      <div className="arena">
        <div className={handClass("you")}>
          {round ? <Icon name={round.you} /> : <span className="placeholder">?</span>}
          <span className="hand-label">You</span>
        </div>
        <span className="vs">vs</span>
        <div className={handClass("cpu")}>
          {round ? <Icon name={round.cpu} /> : <span className="placeholder">?</span>}
          <span className="hand-label">Computer</span>
        </div>
      </div>

      <p className="status" aria-live="polite">{status}</p>

      <div className="picks">
        {CHOICES.map((c) => (
          <button key={c} className="pick" onClick={() => play(c)}>
            <Icon name={c} />
            <span>{cap(c)}</span>
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-ghost" onClick={resetScores}>
          Reset scores
        </button>
      </div>
    </main>
  );
}
