import { useState } from "react";
import Hub from "./component/Hub/Hub";
import { GAMES } from "./games";
import { gameForCode, isValidCode, normaliseCode } from "./net/room";
import "./App.css";
import "./GameTheme.css";

// An invite link (?room=PABCD) opens the right game and joins that room.
function roomFromLink() {
  try {
    const code = normaliseCode(new URLSearchParams(window.location.search).get("room"));
    const id = gameForCode(code);
    return isValidCode(code) && id ? { id, intent: { mode: "join", code } } : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [open, setOpen] = useState(roomFromLink); // { id, intent } or null = show the hub
  const active = open && GAMES.find((g) => g.id === open.id);

  if (!active) {
    return <Hub games={GAMES} onPick={(id, intent) => setOpen({ id, intent })} />;
  }

  const { Component } = active;
  const back = () => setOpen(null);
  const fullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };
  return (
    <div className="app">
      <div className="topbar">
        <button className="back" onClick={back}>
          <span aria-hidden="true">←</span> All games
        </button>
        <button className="back fs-btn" onClick={fullscreen}>
          <span aria-hidden="true">⛶</span> Full screen
        </button>
      </div>
      <Component intent={open.intent} onExit={back} />
    </div>
  );
}
