import { useState } from "react";

export const LEVELS = ["easy", "medium", "hard"];
export const LEVEL_NAMES = { easy: "Easy", medium: "Medium", hard: "Hard" };

// The chosen level is remembered per game on this device.
export function useLevel(game, fallback = "medium") {
  const key = `gamehub-level-${game}`;
  const [level, setLevel] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return LEVELS.includes(v) ? v : fallback;
    } catch {
      return fallback;
    }
  });
  const change = (v) => {
    setLevel(v);
    try {
      localStorage.setItem(key, v);
    } catch {
      /* not remembered */
    }
  };
  return [level, change];
}

// Easy / Medium / Hard buttons. `hints` is an optional { easy, medium, hard } of short descriptions.
export default function Levels({ value, onChange, label = "Level", hints, disabled }) {
  return (
    <div className="levels">
      <div className="levels-row" role="radiogroup" aria-label={label}>
        <span className="levels-label">{label}</span>
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={value === l}
            className="mode-opt"
            disabled={disabled}
            onClick={() => onChange(l)}
          >
            {LEVEL_NAMES[l]}
          </button>
        ))}
      </div>
      {hints && <p className="levels-hint">{hints[value]}</p>}
    </div>
  );
}
