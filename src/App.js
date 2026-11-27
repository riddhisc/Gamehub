import { useLayoutEffect, useRef, useState } from "react";
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


// Grows a game to use the screen: scales it up (never down) until it fills the window height or width.
function Fit({ children }) {
  const inner = useRef(null);
  const [box, setBox] = useState({ s: 1, h: 0 });
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return undefined;
    const calc = () => {
      const h = el.offsetHeight;
      if (!h) return;
      let s = Math.min((window.innerWidth - 16) / 500, (window.innerHeight - 70) / h);
      s = Math.max(1, Math.min(2.2, Math.round(s * 20) / 20));
      setBox((b) => (b.s === s && Math.abs(b.h - h) < 3 ? b : { s, h }));
    };
    calc();
    window.addEventListener("resize", calc);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(calc) : null;
    if (ro) ro.observe(el);
    return () => {
      window.removeEventListener("resize", calc);
      if (ro) ro.disconnect();
    };
  }, []);
  return (
    <div className="fit" style={box.h ? { height: box.h * box.s } : undefined}>
      <div ref={inner} className="fit-inner" style={{ transform: `scale(${box.s})` }}>
        {children}
      </div>
    </div>
  );
}

// These two lay themselves out across the whole window instead.
const OWN_LAYOUT = ["temple", "coloring"];

export default function App() {
  const [open, setOpen] = useState(roomFromLink); // { id, intent } or null = show the hub
  const active = open && GAMES.find((g) => g.id === open.id);

  if (!active) {
    return <Hub games={GAMES} onPick={(id, intent) => setOpen({ id, intent })} />;
  }

  const { Component } = active;
  const back = () => setOpen(null);
  return (
    <div className="app">
      <div className="topbar">
        <button className="back" onClick={back}>
          <span aria-hidden="true">←</span> All games
        </button>
      </div>
      {OWN_LAYOUT.includes(active.id) ? (
        <Component intent={open.intent} onExit={back} />
      ) : (
        <Fit>
          <Component intent={open.intent} onExit={back} />
        </Fit>
      )}
    </div>
  );
}
