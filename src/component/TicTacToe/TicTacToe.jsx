import { useEffect, useState } from "react";
import useRoom from "../../net/useRoom";
import Levels, { useLevel } from "../Levels/Levels";
import { computerMove } from "./ai";
import RoomBar from "../Room/RoomBar";
import "./TicTacToe.css";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

function getWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}

function Mark({ player }) {
  if (player === "X") {
    return (
      <svg className="mark mark-x" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M24 24 L76 76 M76 24 L24 76" />
      </svg>
    );
  }
  return (
    <svg className="mark mark-o" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="27" />
    </svg>
  );
}

const fresh = () => ({ board: Array(9).fill(null), xIsNext: true, score: { X: 0, O: 0, draws: 0 } });

export default function TicTacToe({ intent, onExit }) {
  const [game, setGame] = useState(fresh);
  const [vs, setVs] = useState("friend"); // friend | computer
  const [level, setLevel] = useLevel("tictactoe");
  const { board, xIsNext, score } = game;

  // online: the host plays X, the guest plays O. Every change is sent as the full game state.
  const room = useRoom("tictactoe", {
    onMessage: (kind, payload) => kind === "state" && setGame(payload),
    onConnected: (role) => role === "host" && room.send("state", game),
  }, intent);
  const myMark = room.connected ? (room.role === "host" ? "X" : "O") : null;
  const cpu = vs === "computer" && !room.connected; // you are X, the computer is O

  const result = getWinner(board);
  const isDraw = !result && board.every(Boolean);
  const gameOver = Boolean(result) || isDraw;
  const currentPlayer = xIsNext ? "X" : "O";
  const myTurn = (!myMark || myMark === currentPlayer) && !(cpu && currentPlayer === "O");

  function apply(next) {
    setGame(next);
    room.send("state", next);
  }

  // the computer answers after a short pause
  useEffect(() => {
    if (!cpu || xIsNext || gameOver) return;
    const id = setTimeout(() => {
      const i = computerMove(board, level);
      const nextBoard = board.slice();
      nextBoard[i] = "O";
      const r = getWinner(nextBoard);
      let nextScore = score;
      if (r) nextScore = { ...score, O: score.O + 1 };
      else if (nextBoard.every(Boolean)) nextScore = { ...score, draws: score.draws + 1 };
      setGame({ board: nextBoard, xIsNext: true, score: nextScore });
    }, 450);
    return () => clearTimeout(id);
  }, [cpu, xIsNext, gameOver, board, level, score]);

  function handleClick(i) {
    if (board[i] || gameOver || !myTurn) return;

    const nextBoard = board.slice();
    nextBoard[i] = currentPlayer;
    let nextScore = score;
    const nextResult = getWinner(nextBoard);
    if (nextResult) nextScore = { ...score, [nextResult.player]: score[nextResult.player] + 1 };
    else if (nextBoard.every(Boolean)) nextScore = { ...score, draws: score.draws + 1 };

    apply({ board: nextBoard, xIsNext: !xIsNext, score: nextScore });
  }

  function newGame() {
    apply({ ...game, board: Array(9).fill(null), xIsNext: true });
  }

  function resetScores() {
    apply(fresh());
  }

  let status;
  if (result) status = <><strong>{result.player}</strong> wins!</>;
  else if (isDraw) status = <>It's a draw</>;
  else if (cpu && !xIsNext) status = <>The computer is thinking…</>;
  else if (myMark && !myTurn) status = <>Waiting for <strong>{currentPlayer}</strong>…</>;
  else status = <>Your turn, <strong>{currentPlayer}</strong></>;

  return (
    <main className="game">
      <h1 className="title">
        Tic Tac <span>Toe</span>
      </h1>

      <RoomBar room={room} onExit={onExit} youAre={myMark && `You are ${myMark}`} />

      {!room.connected && (
        <div className="vs-pick">
          <div className="levels-row" role="radiogroup" aria-label="Opponent">
            <button role="radio" aria-checked={vs === "friend"} className="mode-opt" onClick={() => { setVs("friend"); setGame(fresh()); }}>2 players</button>
            <button role="radio" aria-checked={vs === "computer"} className="mode-opt" onClick={() => { setVs("computer"); setGame(fresh()); }}>Vs computer</button>
          </div>
          {vs === "computer" && (
            <Levels value={level} onChange={setLevel} hints={{ easy: "The computer plays almost randomly.", medium: "Blocks and wins, but you can trick it.", hard: "Plays perfectly. The best you can do is draw." }} />
          )}
        </div>
      )}

      <section className="scoreboard" aria-label="Scoreboard">
        <div className={`score score-x ${!gameOver && currentPlayer === "X" ? "active" : ""}`}>
          <span className="score-label">Player X</span>
          <span className="score-value">{score.X}</span>
        </div>
        <div className="score score-draw">
          <span className="score-label">Draws</span>
          <span className="score-value">{score.draws}</span>
        </div>
        <div className={`score score-o ${!gameOver && currentPlayer === "O" ? "active" : ""}`}>
          <span className="score-label">{cpu ? "Computer" : "Player O"}</span>
          <span className="score-value">{score.O}</span>
        </div>
      </section>

      <p className="status" aria-live="polite">{status}</p>

      <div className="board" role="grid" aria-label="Tic Tac Toe board">
        {board.map((cell, i) => {
          const isWinning = result?.line.includes(i);
          const dimmed = result && !isWinning;
          return (
            <button
              key={i}
              className={`cell ${isWinning ? `win win-${cell.toLowerCase()}` : ""} ${dimmed ? "dim" : ""}`}
              onClick={() => handleClick(i)}
              disabled={Boolean(cell) || gameOver || !myTurn}
              aria-label={`Square ${i + 1}${cell ? `, ${cell}` : ", empty"}`}
            >
              {cell && <Mark player={cell} />}
            </button>
          );
        })}
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
