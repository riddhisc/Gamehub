import { useCallback, useEffect, useRef, useState } from "react";
import { newGame, update, updateStars, draw, resizeGame, applyUpgrade } from "./engine";
import Levels, { useLevel } from "../Levels/Levels";
import "./SpaceShooter.css";

const BEST_KEY = "gamehub-shooter-best-v1";
const loadBest = (level) => {
  try {
    return Number(localStorage.getItem(`${BEST_KEY}-${level}`)) || 0;
  } catch {
    return 0;
  }
};

export default function SpaceShooter() {
  const canvasRef = useRef(null);
  const gRef = useRef(null);
  const phaseRef = useRef("ready");
  const dimRef = useRef({ w: 1280, h: 720 });
  const [level, setLevel] = useLevel("shooter");
  const levelRef = useRef(level);
  levelRef.current = level;
  const [phase, setPhase] = useState("ready"); // ready | running | paused | pick | over
  const [dim, setDim] = useState(dimRef.current);
  const [best, setBest] = useState(() => loadBest(level));
  const bestRef = useRef(best);
  bestRef.current = best;
  useEffect(() => setBest(loadBest(level)), [level]);
  const [result, setResult] = useState(null);
  const [opts, setOpts] = useState([]);

  const setPhaseBoth = useCallback((p) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // the game fills the whole window
  useEffect(() => {
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const d = { w: Math.round(window.innerWidth * dpr), h: Math.round(window.innerHeight * dpr) };
      dimRef.current = d;
      setDim(d);
      if (gRef.current) resizeGame(gRef.current, d.w, d.h);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // a quiet starfield behind the start screen
  useEffect(() => {
    if (!gRef.current) {
      gRef.current = newGame(levelRef.current, dimRef.current.w, dimRef.current.h);
    }
  }, []);

  const begin = useCallback(() => {
    const d = dimRef.current;
    const g = newGame(levelRef.current, d.w, d.h);
    g.started = true;
    gRef.current = g;
    setResult(null);
    setPhaseBoth("running");
  }, [setPhaseBoth]);

  const finish = useCallback(
    (g) => {
      const isBest = g.score > 0 && g.score > bestRef.current;
      if (isBest) {
        try {
          localStorage.setItem(`${BEST_KEY}-${levelRef.current}`, String(g.score));
        } catch {
          /* not saved */
        }
        setBest(g.score);
      }
      setResult({ score: g.score, wave: g.wave, kills: g.kills, isBest });
      setPhaseBoth("over");
    },
    [setPhaseBoth]
  );

  // the game loop
  useEffect(() => {
    let raf;
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const g = gRef.current;
      const canvas = canvasRef.current;
      if (g && canvas && typeof window.CanvasRenderingContext2D !== "undefined") {
        const ph = phaseRef.current;
        if (ph === "running") {
          update(g, dt);
          if (g.state === "over") finish(g);
          else if (g.state === "pick") {
            setOpts(g.opts);
            setPhaseBoth("pick");
          }
        } else {
          updateStars(g, dt * 0.5);
        }
        const ctx = canvas.getContext("2d");
        if (ctx) draw(ctx, g, now / 1000);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [finish, setPhaseBoth]);

  // keyboard
  useEffect(() => {
    const MAP = { ArrowLeft: "l", a: "l", A: "l", ArrowRight: "r", d: "r", D: "r", ArrowUp: "u", w: "u", W: "u", ArrowDown: "d", s: "d", S: "d" };
    const set = (e, v) => {
      const k = MAP[e.key];
      const g = gRef.current;
      if (k && g) {
        g.input[k] = v;
        e.preventDefault();
      }
    };
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
      set(e, 1);
    };
    const up = (e) => set(e, 0);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [begin, setPhaseBoth]);

  // pointer: the ship follows your mouse or finger
  function onPointer(e) {
    const g = gRef.current;
    if (!g || phaseRef.current !== "running") return;
    const r = e.currentTarget.getBoundingClientRect();
    const sx = dimRef.current.w / r.width;
    g.player.tx = (e.clientX - r.left) * sx;
    g.player.ty = (e.clientY - r.top) * sx - (e.pointerType === "touch" ? 80 * g.sc : 0);
  }

  function choose(id) {
    if (gRef.current) applyUpgrade(gRef.current, id);
    setPhaseBoth("running");
  }

  return (
    <main className="game temple shooter">
      <div className={`temple-stage ${phase === "running" ? "playing" : ""}`} onPointerMove={onPointer} onPointerDown={onPointer}>
        <canvas ref={canvasRef} width={dim.w} height={dim.h} className="temple-canvas" role="img" aria-label="Star Strike, a space shooter." />

        {phase === "ready" && (
          <div className="temple-overlay">
            <h2>Star Strike</h2>
            <p>Blast through alien waves, take down a boss every fifth wave and grab power-ups. Your ship fires by itself, so just dodge and aim.</p>
            <ul className="temple-keys">
              <li><kbd>Mouse</kbd> or finger: move the ship</li>
              <li><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> or <kbd>WASD</kbd> move</li>
              <li><kbd>P</kbd> pause</li>
            </ul>
            <Levels value={level} onChange={setLevel} hints={{ easy: "5 lives, slower enemies.", medium: "The standard mission.", hard: "Tough, fast and relentless." }} />
            <button className="btn btn-primary" onClick={begin}>Launch</button>
            {best > 0 && <small>Best on {level}: {best}</small>}
          </div>
        )}

        {phase === "paused" && (
          <div className="temple-overlay">
            <h2>Paused</h2>
            <button className="btn btn-primary" onClick={() => setPhaseBoth("running")}>Resume</button>
          </div>
        )}

        {phase === "pick" && (
          <div className="temple-overlay">
            <h2>Boss destroyed!</h2>
            <p>Choose an upgrade for your ship.</p>
            <div className="pick-grid">
              {opts.map((o) => (
                <button key={o.id} className="btn btn-primary pick-btn" onClick={() => choose(o.id)}>
                  <b>{o.name}</b>
                  <span>{o.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "over" && result && (
          <div className="temple-overlay">
            <h2>Ship destroyed</h2>
            <div className="temple-result">
              <div><small>Score</small><b>{result.score}</b></div>
              <div><small>Wave</small><b>{result.wave}</b></div>
              <div><small>Kills</small><b>{result.kills}</b></div>
            </div>
            {result.isBest && <p className="new-best">New best score!</p>}
            <Levels value={level} onChange={setLevel} />
            <button className="btn btn-primary" onClick={begin}>Fly again</button>
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
