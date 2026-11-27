import ArcadeShell from "./ArcadeShell";
import * as racer from "./racer";
import * as breaker from "./breaker";
import * as blocks from "./blocks";

export const NeonRush = () => (
  <ArcadeShell
    id="racer"
    engine={racer}
    title="Neon Rush"
    blurb="A night highway at full speed. Weave through traffic, hit checkpoints for extra time and beat the clock."
    keys={[["←", "→ or mouse: steer"], ["Space", "or hold click: nitro"], ["↓", "brake"]]}
    hints={{ easy: "75s clock, lighter traffic.", medium: "60s clock.", hard: "50s clock, fast and busy." }}
  />
);

export const NeonBreaker = () => (
  <ArcadeShell
    id="breaker"
    engine={breaker}
    title="Neon Breaker"
    blurb="Smash every brick. Catch power-ups for lasers, fireballs, multi-ball and more. Every level is a new layout."
    keys={[["Mouse", "or ← →: move the paddle"], ["Space", "or click: launch the ball"]]}
    hints={{ easy: "5 lives, wide paddle.", medium: "3 lives.", hard: "Fast ball, small paddle." }}
  />
);

export const BlockBlitz = () => (
  <ArcadeShell
    id="blocks"
    engine={blocks}
    hideCursor={false}
    title="Block Blitz"
    blurb="Stack the falling blocks and clear lines. Use hold, plan with the ghost piece and chain combos."
    keys={[["←", "→ move"], ["↑", "rotate · Z other way"], ["↓", "soft drop · Space slam"], ["C", "hold piece"]]}
    hints={{ easy: "Start slow.", medium: "Normal speed.", hard: "Start at level 5." }}
  />
);
