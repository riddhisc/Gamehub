import { useState } from "react";
import { gameForCode, isValidCode, normaliseCode, CODE_LENGTH_CHARS } from "../../net/room";
import "../Room/Room.css";

// The "Play together" section of the main page: make a room or join one with a code.
export default function PlayTogether({ games, onStart }) {
  const online = games.filter((g) => g.online);
  const [gameId, setGameId] = useState(online[0].id);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");

  function join(e) {
    e.preventDefault();
    const code = normaliseCode(typed);
    const id = gameForCode(code);
    if (!isValidCode(code) || !id) {
      setError("That doesn't look like a room code. Codes are 5 letters or numbers.");
      return;
    }
    setError("");
    onStart(id, { mode: "join", code });
  }

  return (
    <section className="together" aria-labelledby="together-title">
      <div>
        <h2 id="together-title">Play together</h2>
        <p className="together-sub">Play with a friend on their own device. Make a room and share the code, or enter a code you were given.</p>
      </div>

      <div className="together-cols">
        <div className="together-box">
          <h3>Make a room</h3>
          <div className="room-pick" role="radiogroup" aria-label="Game for the room">
            {online.map((g) => (
              <button
                key={g.id}
                role="radio"
                aria-checked={g.id === gameId}
                className="room-pick-opt"
                onClick={() => setGameId(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => onStart(gameId, { mode: "create" })}>
            Create room
          </button>
        </div>

        <form className="together-box" onSubmit={join}>
          <h3>Join a room</h3>
          <div className="join-form">
            <input
              className="room-input"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value.toUpperCase());
                setError("");
              }}
              maxLength={CODE_LENGTH_CHARS}
              placeholder="CODE"
              aria-label="Room code"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn btn-ghost" type="submit" disabled={typed.length === 0}>Join</button>
          </div>
          {error && <p className="together-error" role="alert">{error}</p>}
        </form>
      </div>
    </section>
  );
}
