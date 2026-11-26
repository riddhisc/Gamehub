import { useEffect, useState } from "react";
import {
  SEATS, TRACK, SAFE, HOME_STRETCH, BASE_SLOTS, FINISH,
  seatsFrom, newGame, rollDice, moveToken, movable, botPick, cellOf,
} from "./rules";
import useRoom from "../../net/useRoom";
import Levels, { useLevel } from "../Levels/Levels";
import RoomBar from "../Room/RoomBar";
import "./Ludo.css";

const roll = () => 1 + Math.floor(Math.random() * 6);
const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function Dice({ value, color, rolling }) {
  const shown = rolling ? 1 + Math.floor(Math.random() * 6) : value;
  return (
    <div className={`die ${rolling ? "rolling" : ""}`} style={{ "--die": color || "var(--muted)" }} role="img" aria-label={shown ? `Dice shows ${shown}` : "Dice"}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={shown && PIPS[shown].includes(i) ? "pip on" : "pip"} />
      ))}
    </div>
  );
}

function placeOf(pos) {
  if (pos === -1) return "at home";
  if (pos === FINISH) return "finished";
  return pos > 50 ? "on the home stretch" : `${pos + 1} squares from the start`;
}

function Board({ game, pickable, onPick }) {
  // pieces sharing a square are drawn smaller and spread out
  const spots = {};
  game.seats.forEach((s) =>
    game.pos[s].forEach((p, i) => {
      if (p < 0 || p === FINISH) return;
      const [x, y] = cellOf(s, p, i);
      const k = `${x},${y}`;
      (spots[k] = spots[k] || []).push(`${s}-${i}`);
    })
  );
  const pieces = [];
  game.seats.forEach((s) =>
    game.pos[s].forEach((p, i) => {
      let [x, y] = cellOf(s, p, i);
      let r = 0.36;
      const group = spots[`${x},${y}`];
      if (p >= 0 && p !== FINISH && group && group.length > 1) {
        const n = group.indexOf(`${s}-${i}`);
        const a = (n / group.length) * Math.PI * 2;
        x += Math.cos(a) * 0.17;
        y += Math.sin(a) * 0.17;
        r = 0.26;
      }
      if (p === FINISH) r = 0.2;
      pieces.push({ s, i, p, x, y, r, can: pickable.includes(`${s}-${i}`) });
    })
  );
  pieces.sort((a, b) => Number(a.can) - Number(b.can));

  return (
    <svg className="ludo-board" viewBox="0 0 15 15" role="group" aria-label="Ludo board">
      <defs>
        {SEATS.map((s) => (
          <linearGradient key={s.id} id={`pin-${s.id}`} x1="0" y1="-0.4" x2="0" y2="0.42" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={s.color} />
            <stop offset="1" stopColor={s.dark} />
          </linearGradient>
        ))}
      </defs>
      {SEATS.map((s) => {
        const [bx, by] = [[0, 0], [9, 0], [9, 9], [0, 9]][s.id];
        const active = game.seats.includes(s.id);
        return (
          <g key={s.id} opacity={active ? 1 : 0.35}>
            <rect x={bx} y={by} width="6" height="6" fill={s.color} />
            <rect x={bx + 0.9} y={by + 0.9} width="4.2" height="4.2" rx="0.5" fill="#fff" opacity="0.92" />
            {BASE_SLOTS[s.id].map(([cx, cy], k) => (
              <circle key={k} cx={cx} cy={cy} r="0.5" fill={s.soft} stroke={s.dark} strokeWidth="0.06" />
            ))}
          </g>
        );
      })}

      {TRACK.map(([c, r], i) => {
        const startOf = [0, 13, 26, 39].indexOf(i);
        return (
          <g key={i}>
            <rect x={c} y={r} width="1" height="1" fill={startOf >= 0 ? SEATS[startOf].color : "#fff"} stroke="#9fb3bb" strokeWidth="0.05" />
            {startOf < 0 && SAFE.has(i) && (
              <text x={c + 0.5} y={r + 0.52} fontSize="0.7" textAnchor="middle" dominantBaseline="central" fill="#7b8d95">★</text>
            )}
          </g>
        );
      })}

      {SEATS.map((s) =>
        [1, 2, 3, 4, 5].map((k) => {
          const [c, r] = HOME_STRETCH[s.id](k);
          return <rect key={`${s.id}-${k}`} x={c} y={r} width="1" height="1" fill={s.color} stroke="#fff" strokeWidth="0.05" opacity="0.9" />;
        })
      )}

      <polygon points="6,6 6,9 7.5,7.5" fill={SEATS[0].color} />
      <polygon points="6,6 9,6 7.5,7.5" fill={SEATS[1].color} />
      <polygon points="9,6 9,9 7.5,7.5" fill={SEATS[2].color} />
      <polygon points="6,9 9,9 7.5,7.5" fill={SEATS[3].color} />
      <rect x="6" y="6" width="3" height="3" fill="none" stroke="#fff" strokeWidth="0.06" />

      {pieces.map((t) => {
        const seat = SEATS[t.s];
        const Tag = t.can ? "g" : "g";
        return (
          <Tag
            key={`${t.s}-${t.i}`}
            className={`piece ${t.can ? "can" : ""}`}
            style={{ transform: `translate(${t.x}px, ${t.y}px)` }}
            role={t.can ? "button" : undefined}
            tabIndex={t.can ? 0 : undefined}
            aria-label={`${seat.name} piece ${t.i + 1}, ${placeOf(t.p)}${t.can ? ". Tap to move it" : ""}`}
            onClick={t.can ? () => onPick(t.i) : undefined}
            onKeyDown={t.can ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(t.i)) : undefined}
          >
            <g transform={`scale(${(t.r / 0.36) * 1.05})`}>
              {t.can && <circle className="halo" cy="-0.02" r="0.52" fill="rgba(255,255,255,0.4)" stroke="#111" strokeWidth="0.07" />}
              <ellipse cx="0.03" cy="0.4" rx="0.2" ry="0.06" fill="rgba(0,0,0,0.3)" />
              <path
                d="M0 0.42 C-0.1 0.24 -0.29 0.12 -0.29 -0.12 A0.29 0.29 0 0 1 0.29 -0.12 C0.29 0.12 0.1 0.24 0 0.42 Z"
                fill={`url(#pin-${t.s})`}
                stroke={seat.dark}
                strokeWidth="0.05"
                strokeLinejoin="round"
              />
              <circle cy="-0.12" r="0.12" fill="#fff" opacity="0.95" />
              <circle cy="-0.12" r="0.12" fill="none" stroke={seat.dark} strokeWidth="0.03" opacity="0.5" />
              <path d="M-0.2 -0.2 A0.22 0.22 0 0 1 -0.05 -0.33" stroke="#fff" strokeWidth="0.045" strokeLinecap="round" fill="none" opacity="0.7" />
            </g>
          </Tag>
        );
      })}
    </svg>
  );
}

const toBots = (kinds) => Object.fromEntries(Object.entries(kinds).map(([s, k]) => [s, k === "remote" ? "bot" : k]));

export default function Ludo({ intent, onExit }) {
  const [game, setGame] = useState(null); // null = choosing who plays
  const [setup, setSetup] = useState({ n: 4, me: 0, easy: false, kinds: { 0: "bot", 1: "bot", 2: "bot", 3: "bot" } });
  const [rolling, setRolling] = useState(false);
  const [level, setLevel] = useLevel("ludo");

  const room = useRoom("ludo", {
    onMessage: (kind, p) => {
      if (kind === "state") setGame(p);
      else if (kind === "menu") setGame(null);
    },
    onConnected: (role) => role === "host" && game && room.send("state", game),
    onDisconnected: (role) => role === "host" && setGame((g) => (g ? { ...g, kinds: toBots(g.kinds) } : g)),
  }, intent);

  function apply(next) {
    setGame(next);
    room.send("state", next);
  }

  const online = room.connected;
  const iRunBots = room.role !== "guest";
  const mine = (seat) =>
    Boolean(game) && (online ? (room.role === "host" ? game.kinds[seat] === "human" : game.kinds[seat] === "remote") : game.kinds[seat] === "human");

  // bots roll and move on their own; a lone possible move is made for you
  useEffect(() => {
    if (!game || game.phase === "over") return;
    const kind = game.kinds[game.turn];
    const drive = kind === "bot" ? iRunBots : mine(game.turn);
    if (!drive) return;
    const options = movable(game);
    let t;
    if (game.phase === "roll" && kind === "bot") t = setTimeout(() => apply(rollDice(game, roll())), 850);
    else if (game.phase === "move" && kind === "bot") t = setTimeout(() => apply(moveToken(game, botPick(game, game.level))), 950);
    else if (game.phase === "move" && options.length === 1) t = setTimeout(() => apply(moveToken(game, options[0])), 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, online]);

  function start() {
    const seats = seatsFrom(setup.me, setup.n);
    const friend = online ? seats[seats.length === 2 ? 1 : 2] : null;
    const kinds = {};
    seats.forEach((s) => {
      kinds[s] = s === setup.me ? "human" : s === friend ? "remote" : setup.kinds[s] === "person" ? "human" : "bot";
    });
    apply(newGame(seats, kinds, setup.easy, setup.me, friend, level));
  }

  function backToSetup() {
    setGame(null);
    room.send("menu", {});
  }

  function rollNow() {
    if (rolling) return;
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      setGame((g) => {
        const next = rollDice(g, roll());
        room.send("state", next);
        return next;
      });
    }, 500);
  }

  /* ----- choosing who plays ----- */
  if (!game) {
    const waiting = room.status === "waiting" || room.status === "connecting";
    const isGuest = room.role === "guest";
    const seatsNow = seatsFrom(setup.me, setup.n);
    const friendSeat = online ? seatsNow[seatsNow.length === 2 ? 1 : 2] : null;
    const kindName = (s) => (s === setup.me ? "You" : s === friendSeat ? "Your friend (online)" : setup.kinds[s] === "person" ? "Person on this device" : "Computer");
    return (
      <main className="game">
        <h1 className="title">
          Lu<span>do</span>
        </h1>
        <RoomBar room={room} onExit={onExit} youAre={online && !isGuest ? `You are ${SEATS[setup.me].name}` : null} />

        {isGuest ? (
          <p className="status">{online ? "Waiting for the host to start the game…" : "Connecting…"}</p>
        ) : (
          <>
            <div className="ludo-setup">
              <h2>Pick your colour</h2>
              <div className="color-pick" role="radiogroup" aria-label="Your colour">
                {SEATS.map((c) => (
                  <button
                    key={c.id}
                    role="radio"
                    aria-checked={setup.me === c.id}
                    aria-label={c.name}
                    className="color-opt"
                    style={{ "--c": c.color }}
                    onClick={() => setSetup({ ...setup, me: c.id })}
                  >
                    <i /> {c.name}
                  </button>
                ))}
              </div>
              <h2>Who is playing?</h2>
              <div className="sd-levels" role="radiogroup" aria-label="Number of players">
                {[2, 3, 4].map((n) => (
                  <button key={n} role="radio" aria-checked={setup.n === n} className="mode-opt" onClick={() => setSetup({ ...setup, n })}>
                    {n} players
                  </button>
                ))}
              </div>
              <ul className="ludo-seats">
                {seatsNow.map((s) => {
                  const fixed = s === setup.me || s === friendSeat;
                  return (
                    <li key={s}>
                      <i className="seat-dot" style={{ background: SEATS[s].color }} />
                      <span className="seat-name">{SEATS[s].name}</span>
                      <span className="seat-kind">{kindName(s)}</span>
                      {!fixed && (
                        <button
                          className="chip"
                          onClick={() => setSetup({ ...setup, kinds: { ...setup.kinds, [s]: setup.kinds[s] === "bot" ? "person" : "bot" } })}
                          aria-label={`${SEATS[s].name}: switch between computer and person`}
                        >
                          Change
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Levels value={level} onChange={setLevel} label="Computer level" hints={{ easy: "The computer moves almost at random.", medium: "The computer plays sensibly, but slips up.", hard: "The computer plays to win." }} />
              <div className="sd-levels" role="radiogroup" aria-label="How to start">
                <button role="radio" aria-checked={!setup.easy} className="mode-opt" onClick={() => setSetup({ ...setup, easy: false })}>Classic: need a 6</button>
                <button role="radio" aria-checked={setup.easy} className="mode-opt" onClick={() => setSetup({ ...setup, easy: true })}>Easy: one piece starts out</button>
              </div>
              <p className="ludo-rules">
                Roll a 6 to bring a piece out. Land on another colour to send it home (★ squares are safe). A 6, a capture or a piece getting home gives another turn. You need the exact number to finish.
              </p>
              <button className="btn btn-primary" onClick={start} disabled={waiting}>
                {waiting ? "Waiting for your friend to join…" : "Start game"}
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  /* ----- playing ----- */
  const seat = SEATS[game.turn];
  const myTurn = mine(game.turn);
  const options = movable(game);
  const pickable = myTurn && game.phase === "move" ? options.map((i) => `${game.turn}-${i}`) : [];
  const over = game.phase === "over";

  const label = (s) => {
    const k = game.kinds[s];
    if (online) return k === "remote" ? (room.role === "host" ? "Friend" : "You") : k === "human" ? (room.role === "host" ? "You" : "Friend") : "Computer";
    return k === "bot" ? "Computer" : game.seats.filter((x) => game.kinds[x] === "human").length > 1 ? "Player" : "You";
  };

  let status;
  if (over) status = <><strong>{SEATS[game.winner].name} wins!</strong> {label(game.winner) === "You" ? "Well played." : ""}</>;
  else if (game.phase === "move" && myTurn) status = options.length > 1 ? <>You rolled {game.dice}. Tap a glowing piece to move it</> : <>Moving…</>;
  else if (myTurn) status = <>Your turn, <strong>{seat.name}</strong>. Roll the dice!{game.pos[game.turn].every((p) => p === -1) ? " You need a 6 to bring a piece out." : ""}</>;
  else status = <><strong>{seat.name}</strong> ({label(game.turn)}) is playing…</>;

  return (
    <main className="game">
      <h1 className="title">
        Lu<span>do</span>
      </h1>
      <RoomBar room={room} onExit={onExit} youAre={online ? `You are ${SEATS[room.role === "host" ? game.host : game.guest].name}` : null} />

      <ul className="ludo-players" aria-label="Players">
        {game.seats.map((s) => {
          const done = game.pos[s].filter((p) => p === FINISH).length;
          return (
            <li key={s} className={s === game.turn && !over ? "turn" : ""} style={{ "--seat": SEATS[s].color }}>
              <i className="seat-dot" style={{ background: SEATS[s].color }} />
              <b>{SEATS[s].name}</b>
              <small>{label(s)} · {done}/4 home</small>
            </li>
          );
        })}
      </ul>

      <p className="status" aria-live="polite">{game.msg ? <>{game.msg}. </> : null}{status}</p>

      <Board game={game} pickable={pickable} onPick={(i) => apply(moveToken(game, i))} />

      <div className="ludo-dice">
        <Dice value={game.last ? game.last.value : null} color={game.last ? SEATS[game.last.seat].color : null} rolling={rolling} />
        <button
          className="btn btn-primary"
          onClick={rollNow}
          disabled={over || !myTurn || game.phase !== "roll" || rolling}
        >
          {rolling ? "Rolling…" : "Roll dice"}
        </button>
      </div>

      <div className="actions">
        {over && (
          <button className="btn btn-primary" onClick={() => apply(newGame(game.seats, game.kinds, game.easy, game.host, game.guest, game.level))}>Play again</button>
        )}
        <button className="btn btn-ghost" onClick={backToSetup}>{over ? "Change players" : "New game"}</button>
      </div>
    </main>
  );
}
