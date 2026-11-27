import { useCallback, useEffect, useRef, useState } from "react";
import Levels, { useLevel } from "../Levels/Levels";
import "./Arcade.css";

// One full-screen canvas game. The game itself is an "engine": plain functions that move and draw it.
//   engine.newGame(level, w, h) -> g      engine.update(g, dt)       engine.draw(ctx, g, t)
//   engine.resize(g, w, h)                engine.idle(g, dt)  (optional, start screen)
//   engine.key(g, key, isDown, isRepeat)  engine.pointer(g, x, y, phase, pointerType)   (optional)
//   engine.result(g) -> [[label, value], ...]      g.score, g.state ("play" | "over")
const loadBest = (id, level) => {
  try {
    return Number(localStorage.getItem(`gamehub-${id}-best-${level}`)) || 0;
  } catch {
    return 0;
  }
};

export default function ArcadeShell({ id, title, blurb, keys, hints, engine, hideCursor = true }) {
  const canvasRef = useRef(null);
  const gRef = useRef(null);
  const phaseRef = useRef("ready");
  const dimRef = useRef({ w: 1280, h: 720 });
  const [level, setLevel] = useLevel(id);
  const levelRef = useRef(level);
  levelRef.current = level;
  const [phase, setPhase] = useState("ready");
  const [dim, setDim] = useState(dimRef.current);
  const [best, setBest] = useState(() => loadBest(id, level));
  const bestRef = useRef(best);
  bestRef.current = best;
  useEffect(() => setBest(loadBest(id, level)), [id, level]);
  const [result, setResult] = useState(null);

  const setPhaseBoth = useCallback((p) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => {
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const d = { w: Math.round(window.innerWidth * dpr), h: Math.round(window.innerHeight * dpr) };
      dimRef.current = d;
      setDim(d);
      if (!gRef.current) gRef.current = engine.newGame(levelRef.current, d.w, d.h);
      else engine.resize(gRef.current, d.w, d.h);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [engine]);

  const begin = useCallback(() => {
    const d = dimRef.current;
    const g = engine.newGame(levelRef.current, d.w, d.h);
    g.started = true;
    gRef.current = g;
    setResult(null);
    setPhaseBoth("running");
  }, [engine, setPhaseBoth]);

  const finish = useCallback(
    (g) => {
      const isBest = g.score > 0 && g.score > bestRef.current;
      if (isBest) {
        try {
          localStorage.setItem(`gamehub-${id}-best-${levelRef.current}`, String(g.score));
        } catch {
          /* not saved */
        }
        setBest(g.score);
      }
      setResult({ score: g.score, rows: engine.result(g), isBest });
      setPhaseBoth("over");
    },
    [engine, id, setPhaseBoth]
  );

  useEffect(() => {
    let raf;
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const g = gRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas && canvas.getContext && canvas.getContext("2d");
      if (g && ctx) {
        if (phaseRef.current === "running") {
          engine.update(g, dt);
          if (g.state === "over") finish(g);
        } else if (engine.idle) engine.idle(g, dt);
        engine.draw(ctx, g, now / 1000);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine, finish]);

  useEffect(() => {
    const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "];
    const down = (e) => {
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        if (phaseRef.current === "running") setPhaseBoth("paused");
        else if (phaseRef.current === "paused") setPhaseBoth("running");
        return;
      }
      if ((e.key === "Enter" || e.key === " ") && (phaseRef.current === "ready" || phaseRef.current === "over")) {
        e.preventDefault();
        begin();
        return;
      }
      if (phaseRef.current === "running" && gRef.current) {
        if (GAME_KEYS.includes(e.key)) e.preventDefault();
        if (engine.key) engine.key(gRef.current, e.key, true, e.repeat);
      }
    };
    const up = (e) => {
      if (gRef.current && engine.key) engine.key(gRef.current, e.key, false, false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [begin, engine, setPhaseBoth]);

  const onPointer = (phaseName) => (e) => {
    const g = gRef.current;
    if (!g || phaseRef.current !== "running" || !engine.pointer) return;
    const r = e.currentTarget.getBoundingClientRect();
    const k = dimRef.current.w / r.width;
    engine.pointer(g, (e.clientX - r.left) * k, (e.clientY - r.top) * k, phaseName, e.pointerType);
  };

  return (
    <main className="game temple arcade">
      <div
        className={`temple-stage ${phase === "running" && hideCursor ? "playing" : ""}`}
        onPointerDown={onPointer("down")}
        onPointerMove={onPointer("move")}
        onPointerUp={onPointer("up")}
        onPointerCancel={onPointer("up")}
      >
        <canvas ref={canvasRef} width={dim.w} height={dim.h} className="temple-canvas" role="img" aria-label={`${title}, a game.`} />

        {phase === "ready" && (
          <div className="temple-overlay menu">
            <div className="menu-info">
              <h2>{title}</h2>
              <p>{blurb}</p>
              <ul className="temple-keys">
                {keys.map(([k, what]) => (
                  <li key={what}><kbd>{k}</kbd> {what}</li>
                ))}
              </ul>
            </div>
            <div className="menu-play">
              <Levels value={level} onChange={setLevel} hints={hints} />
              <button className="btn btn-primary" onClick={begin}>Play</button>
              {best > 0 && <small>Best on {level}: {best}</small>}
            </div>
          </div>
        )}
        {phase === "paused" && (
          <div className="temple-overlay">
            <h2>Paused</h2>
            <button className="btn btn-primary" onClick={() => setPhaseBoth("running")}>Resume</button>
          </div>
        )}
        {phase === "over" && result && (
          <div className="temple-overlay">
            <h2>Game over</h2>
            <div className="temple-result">
              <div><small>Score</small><b>{result.score}</b></div>
              {result.rows.map(([label, value]) => (
                <div key={label}><small>{label}</small><b>{value}</b></div>
              ))}
            </div>
            {result.isBest && <p className="new-best">New best score!</p>}
            <Levels value={level} onChange={setLevel} />
            <button className="btn btn-primary" onClick={begin}>Play again</button>
          </div>
        )}
      </div>

      {phase === "running" && (
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => setPhaseBoth("paused")}>Pause</button>
        </div>
      )}
    </main>
  );
}
