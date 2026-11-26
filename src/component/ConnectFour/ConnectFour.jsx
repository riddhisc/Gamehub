import { useEffect, useState } from "react";
import useRoom from "../../net/useRoom";
import Levels, { useLevel } from "../Levels/Levels";
import { computerMove } from "./ai";
import RoomBar from "../Room/RoomBar";
import "./ConnectFour.css";

const COLS = 7;
const ROWS = 6;
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]]; // right, down, and both diagonals

function findWinner(board) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const player = board[r * COLS + c];
      if (!player) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const cells = [];
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
          if (board[rr * COLS + cc] !== player) break;
          cells.push(rr * COLS + cc);
        }
        if (cells.length === 4) return { player, cells };
      }
    }
  }
  return null;
}

const fresh = () => ({ board: Array(ROWS * COLS).fill(0), turn: 1, score: { 1: 0, 2: 0, draws: 0 } });

export default function ConnectFour({ intent, onExit }) {
  const [game, setGame] = useState(fresh);
  const [vs, setVs] = useState("friend"); // friend | computer
  const [level, setLevel] = useLevel("connect4");
  const { board, turn, score } = game;

  // online: the host is Player 1, the guest is Player 2
  const room = useRoom("connect4", {
    onMessage: (kind, payload) => kind === "state" && setGame(payload),
    onConnected: (role) => role === "host" && room.send("state", game),
  }, intent);
  const myPlayer = room.connected ? (room.role === "host" ? 1 : 2) : null;
  const cpu = vs === "computer" && !room.connected; // you are Player 1

  const result = findWinner(board);
  const isDraw = !result && board.every(Boolean);
  const gameOver = Boolean(result) || isDraw;
  const myTurn = (!myPlayer || myPlayer === turn) && !(cpu && turn === 2);

  function apply(next) {
    setGame(next);
    room.send("state", next);
  }

  // the computer answers after a short pause
  useEffect(() => {
    if (!cpu || turn !== 2 || gameOver) return;
    const id = setTimeout(() => {
      const col = computerMove(board, level);
      let row = ROWS - 1;
      while (row >= 0 && board[row * COLS + col] !== 0) row--;
      if (row < 0) return;
      const next = board.slice();
      next[row * COLS + col] = 2;
      const won = findWinner(next);
      let nextScore = score;
      if (won) nextScore = { ...score, 2: score[2] + 1 };
      else if (next.every(Boolean)) nextScore = { ...score, draws: score.draws + 1 };
      setGame({ board: next, turn: 1, score: nextScore });
    }, 600);
    return () => clearTimeout(id);
  }, [cpu, turn, gameOver, board, level, score]);

  function drop(col) {
    if (gameOver || !myTurn) return;
    // the disc falls to the lowest empty row in this column
    let row = ROWS - 1;
    while (row >= 0 && board[row * COLS + col] !== 0) row--;
    if (row < 0) return;

    const next = board.slice();
    next[row * COLS + col] = turn;
    let nextScore = score;
    const won = findWinner(next);
    if (won) nextScore = { ...score, [won.player]: score[won.player] + 1 };
    else if (next.every(Boolean)) nextScore = { ...score, draws: score.draws + 1 };

    apply({ board: next, turn: turn === 1 ? 2 : 1, score: nextScore });
  }

  function newGame() {
    apply({ ...game, board: Array(ROWS * COLS).fill(0), turn: 1 });
  }

  function resetScores() {
    apply(fresh());
  }

  let status;
  if (result) status = <><strong>Player {result.player}</strong> wins!</>;
  else if (isDraw) status = <>It's a draw</>;
  else if (cpu && turn === 2) status = <>The computer is thinking…</>;
  else if (myPlayer && !myTurn) status = <>Waiting for <strong>Player {turn}</strong>…</>;
  else status = <>Your turn, <strong>Player {turn}</strong></>;

  return (
    <main className="game">
      <h1 className="title">
        Connect <span>Four</span>
      </h1>

      <RoomBar room={room} onExit={onExit} youAre={myPlayer && `You are Player ${myPlayer}`} />

      {!room.connected && (
        <div className="vs-pick">
          <div className="levels-row" role="radiogroup" aria-label="Opponent">
            <button role="radio" aria-checked={vs === "friend"} className="mode-opt" onClick={() => { setVs("friend"); setGame(fresh()); }}>2 players</button>
            <button role="radio" aria-checked={vs === "computer"} className="mode-opt" onClick={() => { setVs("computer"); setGame(fresh()); }}>Vs computer</button>
          </div>
          {vs === "computer" && (
            <Levels value={level} onChange={setLevel} hints={{ easy: "The computer drops discs almost at random.", medium: "Blocks and wins, but misses long plans.", hard: "Thinks six moves ahead. Tough!" }} />
          )}
        </div>
      )}

      <section className="scoreboard" aria-label="Scoreboard">
        <div className={`score score-x ${!gameOver && turn === 1 ? "active" : ""}`}>
          <span className="score-label">Player 1</span>
          <span className="score-value">{score[1]}</span>
        </div>
        <div className="score">
          <span className="score-label">Draws</span>
          <span className="score-value">{score.draws}</span>
        </div>
        <div className={`score score-o ${!gameOver && turn === 2 ? "active" : ""}`}>
          <span className="score-label">{cpu ? "Computer" : "Player 2"}</span>
          <span className="score-value">{score[2]}</span>
        </div>
      </section>

      <p className="status" aria-live="polite">{status}</p>

      <div className="c4-board">
        {Array.from({ length: COLS }, (_, c) => (
          <button
            key={c}
            className="column"
            onClick={() => drop(c)}
            disabled={gameOver || board[c] !== 0 || !myTurn}
            aria-label={`Drop a disc in column ${c + 1}`}
          >
            {Array.from({ length: ROWS }, (_, r) => {
              const i = r * COLS + c;
              const value = board[i];
              const isWin = result?.cells.includes(i);
              return (
                <span
                  key={r}
                  className={`disc ${value ? `p${value}` : "empty"} ${isWin ? "win" : ""}`}
                />
              );
            })}
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={newGame}>
          New game
        </button>
        <button className="btn btn-ghost" onClick={resetScores}>
          Reset scores
        </button>
      </div>
    </main>
  );
}
