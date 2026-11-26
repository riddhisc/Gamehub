import { useCallback, useEffect, useRef, useState } from "react";
import { newRun, step, moveLane, jump, slide, score } from "./runner";
import { drawFrame, W, H } from "./draw";
import Levels, { useLevel } from "../Levels/Levels";
import "./TempleDash.css";

const BEST_KEY = "gamehub-temple-best-v1";
const bestKey = (level) => `${BEST_KEY}-${level}`;
const loadBest = (level) => {
  try {
    return Number(localStorage.getItem(bestKey(level))) || 0;
  } catch {
    return 0;
  }
};

export default function TempleDash() {
  const canvasRef = useRef(null);
  const run = useRef(newRun());
  const phaseRef = useRef("ready");
  const touch = useRef(null);
  const [level, setLevel] = useLevel("temple");
  const levelRef = useRef(level);
  levelRef.current = level;
  const [phase, setPhase] = useState("ready"); // ready | running | paused | over
  const [hud, setHud] = useState({ score: 0, coins: 0 });
  const [best, setBest] = useState(() => loadBest(level));
  useEffect(() => setBest(loadBest(level)), [level]);
  const [result, setResult] = useState(null);

  const setPhaseBoth = useCallback((p) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const paint = useCallback((t) => {
    const canvas = canvasRef.current;
    // (the test environment has no canvas)
    if (!canvas || typeof window.CanvasRenderingContext2D === "undefined") return;
    const ctx = canvas.getContext("2d");
    if (ctx) drawFrame(ctx, run.current, t);
  }, []);

  function begin() {
    run.current = newRun(Math.random, levelRef.current);
    setHud({ score: 0, coins: 0 });
    setResult(null);
    setPhaseBoth("running");
  }

  // the game loop
  useEffect(() => {
    if (phase !== "running") {
      paint(performance.now() / 1000);
      return;
    }
    let raf;
    let last = performance.now();
    let lastHud = 0;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = run.current;
      step(s, dt);
      paint(now / 1000);
      if (now - lastHud > 90) {
        lastHud = now;
        setHud({ score: score(s), coins: s.coins });
      }
      if (!s.alive) {
        const final = score(s);
        setHud({ score: final, coins: s.coins });
        setResult({ score: final, coins: s.coins, dist: Math.floor(s.dist), cause: s.cause });
        setBest((b) => {
          if (final <= b) return b;
          try {
            localStorage.setItem(bestKey(run.current.level), String(final));
          } catch {
            /* not remembered */
          }
          return final;
        });
        // let the last frame (with the hit effect) show for a moment
        setTimeout(() => setPhaseBoth("over"), 450);
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, paint, setPhaseBoth]);

  // pause if the page is hidden
  useEffect(() => {
    const onHide = () => document.hidden && phaseRef.current === "running" && setPhaseBoth("paused");
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [setPhaseBoth]);

  const act = useCallback(
    (what) => {
      const p = phaseRef.current;
      if (p === "ready" || p === "over") {
        if (p === "over" && what !== "start") return;
        begin();
      }
      if (phaseRef.current === "paused") setPhaseBoth("running");
      const s = run.current;
      if (what === "left") moveLane(s, -1);
      else if (what === "right") moveLane(s, 1);
      else if (what === "jump") jump(s);
      else if (what === "slide") slide(s);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const KEYS = {
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right",
      ArrowUp: "jump", w: "jump", W: "jump", " ": "jump",
      ArrowDown: "slide", s: "slide", S: "slide",
    };
    function onKey(e) {
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        if (phaseRef.current === "running") setPhaseBoth("paused");
        else if (phaseRef.current === "paused") setPhaseBoth("running");
        return;
      }
      if (e.key === "Enter" && (phaseRef.current === "ready" || phaseRef.current === "over")) {
        e.preventDefault();
        act("start");
        return;
      }
      const what = KEYS[e.key];
      if (!what || e.repeat) return;
      e.preventDefault();
      act(what);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, setPhaseBoth]);

  function onTouchStart(e) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) {
      if (phaseRef.current === "paused") setPhaseBoth("running");
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? "right" : "left");
    else act(dy > 0 ? "slide" : "jump");
  }

  const causeText = result && (result.cause === "fell" ? "You fell into a pit!" : "The demon caught you!");

  return (
    <main className="game temple">
      <h1 className="title">
        Temple <span>Dash</span>
      </h1>

      <div className="temple-hud" aria-label="Score">
        <div className="hud-box"><small>Score</small><b>{hud.score}</b></div>
        <div className="hud-box coins"><small>Coins</small><b>{hud.coins}</b></div>
        <div className="hud-box"><small>Best</small><b>{best}</b></div>
      </div>

      <div className="temple-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="temple-canvas"
          role="img"
          aria-label={`Temple Dash. Score ${hud.score}, ${hud.coins} coins.`}
        />

        {phase === "ready" && (
          <div className="temple-overlay">
            <h2>Run for your life!</h2>
            <p>Dodge the stones, jump the logs and pits, slide under the beams and grab the coins. If you stumble, the demon starts chasing you. Stumble again and he catches you.</p>
            <ul className="temple-keys">
              <li><kbd>←</kbd><kbd>→</kbd> change lane</li>
              <li><kbd>↑</kbd> or <kbd>Space</kbd> jump</li>
              <li><kbd>↓</kbd> slide</li>
            </ul>
            <Levels value={level} onChange={setLevel} hints={{ easy: "Slower, with more room between obstacles.", medium: "The classic run.", hard: "Fast and tight. Good luck!" }} />
            <button className="btn btn-primary" onClick={() => act("start")}>Start running</button>
            <small>On a phone: swipe left, right, up or down</small>
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
            <h2>{causeText}</h2>
            <div className="temple-result">
              <div><small>Score</small><b>{result.score}</b></div>
              <div><small>Distance</small><b>{result.dist} m</b></div>
              <div><small>Coins</small><b>{result.coins}</b></div>
            </div>
            {result.score > 0 && result.score >= best && <p className="new-best">New best score!</p>}
            <Levels value={level} onChange={setLevel} />
            <button className="btn btn-primary" onClick={() => act("start")}>Run again</button>
          </div>
        )}
      </div>

      <div className="temple-pad" aria-label="Controls">
        <button className="dpad-btn" aria-label="Move left" onClick={() => act("left")}>←</button>
        <button className="dpad-btn" aria-label="Jump" onClick={() => act("jump")}>↑</button>
        <button className="dpad-btn" aria-label="Slide" onClick={() => act("slide")}>↓</button>
        <button className="dpad-btn" aria-label="Move right" onClick={() => act("right")}>→</button>
      </div>

      {phase === "running" && (
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => setPhaseBoth("paused")}>Pause</button>
        </div>
      )}
    </main>
  );
}
