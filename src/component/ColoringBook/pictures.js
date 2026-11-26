// Colour-by-number pictures.
//
// Every picture is a list of small numbered regions drawn back to front.
// A region only accepts the colour that matches its number, so the player
// can always see what is left. The shapes are generated from a few helpers
// (rings, petals, leaves, mirrored wings) rather than typed out by hand.

export const PALETTE = [
  { n: 1, name: "Navy", hex: "#2f3d94", ink: "#ffffff" },
  { n: 2, name: "Sky blue", hex: "#5cc8ff", ink: "#0f1b21" },
  { n: 3, name: "Green", hex: "#5ed67b", ink: "#0f1b21" },
  { n: 4, name: "Yellow", hex: "#ffe066", ink: "#0f1b21" },
  { n: 5, name: "Orange", hex: "#ffa24c", ink: "#0f1b21" },
  { n: 6, name: "Red", hex: "#ff5d6c", ink: "#0f1b21" },
  { n: 7, name: "Pink", hex: "#ff8ad4", ink: "#0f1b21" },
  { n: 8, name: "Purple", hex: "#b074ff", ink: "#0f1b21" },
  { n: 9, name: "Brown", hex: "#a9744f", ink: "#ffffff" },
];

/* ---------- geometry helpers ---------- */

const f = (v) => Math.round(v * 100) / 100;
const P = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;

const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
const circle = (cx, cy, r) =>
  `M${f(cx - r)} ${f(cy)}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0z`;
const ellipse = (cx, cy, rx, ry) =>
  `M${f(cx - rx)} ${f(cy)}a${rx} ${ry} 0 1 0 ${f(2 * rx)} 0a${rx} ${ry} 0 1 0 ${f(-2 * rx)} 0z`;
const poly = (...points) => `M${points.map(pt).join("L")}z`;

// A slice of a ring between two radii and two angles (clockwise).
function sector(cx, cy, r0, r1, a0, a1) {
  const [x0, y0] = P(cx, cy, r1, a0);
  const [x1, y1] = P(cx, cy, r1, a1);
  const [x2, y2] = P(cx, cy, r0, a1);
  const [x3, y3] = P(cx, cy, r0, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${f(x0)} ${f(y0)}A${r1} ${r1} 0 ${large} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 ${large} 0 ${f(x3)} ${f(y3)}Z`;
}

// A pointed leaf or petal from point B to point T, w wide.
function leaf(B, T, w) {
  const dx = T[0] - B[0];
  const dy = T[1] - B[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const at = (t, s) => [B[0] + dx * t + nx * w * s, B[1] + dy * t + ny * w * s];
  return `M${pt(B)}C${pt(at(0.25, 1))} ${pt(at(0.8, 0.9))} ${pt(T)}C${pt(at(0.8, -0.9))} ${pt(at(0.25, -1))} ${pt(B)}Z`;
}
const radialLeaf = (cx, cy, a, r0, r1, w) => leaf(P(cx, cy, r0, a), P(cx, cy, r1, a), w);
const along = (B, T, t) => [B[0] + (T[0] - B[0]) * t, B[1] + (T[1] - B[1]) * t];

/* ---------- picture builder ---------- */

function build(id, name, make) {
  const regions = [];
  const deco = [];
  const counts = {};

  // add(group, path, number, label position(s), label size)
  const add = (group, d, n, labels, fs) => {
    counts[group] = (counts[group] || 0) + 1;
    regions.push({
      id: `${id}-${regions.length + 1}`,
      name: `${group} ${counts[group]}`,
      d,
      n,
      labels: typeof labels[0] === "number" ? [labels] : labels,
      fs,
    });
  };

  make(add, deco);
  return { id, name, regions, deco };
}

/* ---------- 1. Mandala flower ---------- */

const mandala = build("mandala", "Mandala", (add) => {
  const C = 200;
  const top = -Math.PI / 2;

  add("Background", rect(0, 0, 400, 400), 1, [[46, 46], [354, 46], [46, 354], [354, 354]], 10);

  for (let i = 0; i < 24; i++) {
    const a0 = top + (i * TAU) / 24;
    const a1 = a0 + TAU / 24;
    add("Outer ring", sector(C, C, 172, 192, a0, a1), i % 2 ? 3 : 2, P(C, C, 182, (a0 + a1) / 2), 9);
  }

  // the purple disc that shows between the petals
  add(
    "Garden disc",
    circle(C, C, 172),
    8,
    [0, 4, 8, 12].map((j) => P(C, C, 152, top + ((j + 0.5) * Math.PI) / 8)),
    9
  );

  for (let j = 0; j < 16; j++) {
    const a = top + (j * Math.PI) / 8;
    add("Scallop", radialLeaf(C, C, a, 140, 172, 15), j % 2 ? 4 : 7, P(C, C, 158, a), 8);
  }

  for (let k = 0; k < 8; k++) {
    const a = top + Math.PI / 8 + (k * Math.PI) / 4;
    add("Leaf", radialLeaf(C, C, a, 62, 118, 14), 3, P(C, C, 92, a), 8);
  }

  for (let k = 0; k < 8; k++) {
    const a = top + (k * Math.PI) / 4;
    add("Big petal", radialLeaf(C, C, a, 58, 150, 34), 6, P(C, C, 142, a), 7);
  }

  for (let k = 0; k < 8; k++) {
    const a = top + (k * Math.PI) / 4;
    add("Inner petal", radialLeaf(C, C, a, 76, 134, 17), 5, P(C, C, 105, a), 9);
  }

  for (let i = 0; i < 12; i++) {
    const a0 = top + (i * TAU) / 12;
    const a1 = a0 + TAU / 12;
    add("Centre ring", sector(C, C, 40, 58, a0, a1), i % 2 ? 7 : 4, P(C, C, 49, (a0 + a1) / 2), 8);
  }

  add("Centre", circle(C, C, 38), 9, P(C, C, 31, top), 8);
  add("Centre", circle(C, C, 24), 5, [C, C - 17], 7);
  add("Centre", circle(C, C, 10), 4, [C, C], 8);
});

/* ---------- 2. Tulip garden at sunset ---------- */

const tulips = build("tulips", "Tulip Garden", (add) => {
  const SX = 310;
  const SY = 118;

  [
    [0, 70, 8, 35],
    [70, 50, 7, 95],
    [120, 45, 5, 142],
    [165, 235, 4, 185],
  ].forEach(([y, h, n, ly]) => {
    add("Sky", rect(0, y, 400, h), n, [[18, ly], [382, ly]], 9);
  });

  // sun rays, then the sun itself
  for (let k = 0; k < 12; k++) {
    const a = deg(k * 30 + 15);
    add(
      "Sun ray",
      poly(P(SX, SY, 36, a - deg(9)), P(SX, SY, 66, a), P(SX, SY, 36, a + deg(9))),
      5,
      P(SX, SY, 44, a),
      5
    );
  }
  add("Sun", circle(SX, SY, 34), 6, P(SX, SY, 27, -Math.PI / 2), 8);
  add("Sun", circle(SX, SY, 20), 5, P(SX, SY, 14, -Math.PI / 2), 7);
  add("Sun", circle(SX, SY, 8), 4, [SX, SY], 6);

  // two clouds, three puffs each (centre puff drawn last so it sits in front)
  [
    [[72, 104, 16, 7, [66, 106]], [116, 103, 16, 7, [122, 106]], [92, 92, 21, 2, [92, 92]]],
    [[200, 53, 13, 7, [196, 56]], [239, 55, 13, 7, [243, 58]], [219, 45, 18, 2, [219, 45]]],
  ].forEach((cloud) =>
    cloud.forEach(([cx, cy, r, n, label]) => add("Cloud", circle(cx, cy, r), n, label, 8))
  );

  add(
    "Far hill",
    "M0 250C60 190 120 190 190 235C250 270 300 200 400 215L400 400L0 400Z",
    8,
    [[30, 252], [334, 248]],
    9
  );
  add(
    "Near hill",
    "M0 285C80 250 170 255 250 280C320 300 360 270 400 262L400 400L0 400Z",
    1,
    [[15, 312], [110, 304], [270, 306], [378, 296]],
    9
  );
  add("Soil", rect(0, 330, 400, 70), 9, [[25, 378], [135, 380], [245, 378], [375, 380]], 9);

  const heads = [
    { x: 70, hy: 215, left: 6, mid: 7 },
    { x: 150, hy: 195, left: 8, mid: 2 },
    { x: 230, hy: 215, left: 5, mid: 4 },
    { x: 310, hy: 232, left: 7, mid: 8 },
  ];

  heads.forEach(({ x, hy, left, mid }) => {
    add("Stem", rect(x - 4.5, hy, 9, 346 - hy), 3, [x, (hy + 340) / 2 + 8], 7);

    [-1, 1].forEach((side) => {
      const B = [x + side * 2, 340];
      const T = [x + side * 32, 298];
      add("Leaf", leaf(B, T, 7), 3, along(B, T, 0.5), 6);
    });

    [-1, 1].forEach((side) => {
      const B = [x + side, hy + 4];
      const T = [x + side * 16, hy - 46];
      const [lx, ly] = along(B, T, 0.55);
      add("Petal", leaf(B, T, 17), left, [lx + side * 7, ly], 8);
    });

    const B = [x, hy + 6];
    const T = [x, hy - 54];
    add("Petal", leaf(B, T, 16), mid, along(B, T, 0.45), 8);
  });

  [[90, 366], [190, 358], [290, 368], [362, 356], [20, 354], [215, 372]].forEach(([x, y]) =>
    add("Pebble", circle(x, y, 5), 4, [x, y], 6)
  );
});

/* ---------- 3. Butterfly (left and right wings mirror each other) ---------- */

const butterfly = build("butterfly", "Butterfly", (add, deco) => {
  const mirror = ([x, y]) => [400 - x, y];
  const scaleAbout = (p, c, s) => [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s];

  // Each wing is three cubic curves: [start, control 1, control 2, end]
  const UPPER = [
    [[192, 190], [176, 118], [112, 38], [52, 60]],
    [[52, 60], [8, 78], [16, 152], [60, 192]],
    [[60, 192], [104, 226], [160, 214], [192, 190]],
  ];
  const LOWER = [
    [[192, 196], [160, 214], [96, 206], [72, 246]],
    [[72, 246], [46, 288], [84, 346], [132, 332]],
    [[132, 332], [176, 320], [196, 262], [192, 196]],
  ];
  const PIVOT_UPPER = [125, 130];
  const PIVOT_LOWER = [130, 268];
  const SCALES = [1, 0.74, 0.5, 0.26];

  const bezier = ([p0, c1, c2, p1], t) => {
    const u = 1 - t;
    const k = (i) => u * u * u * p0[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t * t * t * p1[i];
    return [k(0), k(1)];
  };

  const wingPath = (segs, c, s, flip) => {
    const tr = (p) => (flip ? mirror(scaleAbout(p, c, s)) : scaleAbout(p, c, s));
    let d = `M${pt(tr(segs[0][0]))}`;
    segs.forEach(([, c1, c2, p1]) => {
      d += `C${pt(tr(c1))} ${pt(tr(c2))} ${pt(tr(p1))}`;
    });
    return `${d}Z`;
  };

  // a point on the outline of the full-size wing, pulled in towards the pivot
  const onWing = (segs, c, segIndex, t, factor, flip) => {
    const q = scaleAbout(bezier(segs[segIndex], t), c, factor);
    return flip ? mirror(q) : q;
  };

  add("Background", rect(0, 0, 400, 400), 1, [[46, 46], [354, 46], [46, 354], [354, 354]], 9);
  add("Outer glow", circle(200, 200, 192), 8, [[200, 24], [200, 376], [24, 200], [376, 200]], 9);
  add("Inner glow", circle(200, 200, 160), 2, [[200, 50], [200, 350]], 9);

  [[28, 28], [372, 28], [28, 372], [372, 372], [60, 18], [340, 18], [18, 60], [382, 60], [18, 340], [382, 340], [60, 382], [340, 382]]
    .forEach(([x, y]) => add("Sparkle", circle(x, y, 5), 4, [x, y], 5.5));

  const lowerNumbers = [6, 5, 7, 8];
  const upperNumbers = [5, 6, 8, 7];

  const wing = (group, segs, pivot, numbers, labelSeg, flip) => {
    SCALES.forEach((s, k) => {
      const mid = k < SCALES.length - 1 ? (s + SCALES[k + 1]) / 2 : 0;
      const label = k < SCALES.length - 1 ? onWing(segs, pivot, labelSeg, 0.5, mid, flip) : flip ? mirror(pivot) : pivot;
      add(group, wingPath(segs, pivot, s, flip), numbers[k], label, 8);
    });
  };

  [false, true].forEach((flip) => wing("Lower wing", LOWER, PIVOT_LOWER, lowerNumbers, 1, flip));
  [false, true].forEach((flip) => wing("Upper wing", UPPER, PIVOT_UPPER, upperNumbers, 2, flip));

  // spots on the outer band of each wing
  [false, true].forEach((flip) => {
    [[0, 0.35], [0, 0.7], [1, 0.3], [1, 0.6], [1, 0.85]].forEach(([seg, t]) => {
      const [x, y] = onWing(UPPER, PIVOT_UPPER, seg, t, 0.87, flip);
      add("Wing spot", circle(x, y, 5), 4, [x, y], 6.5);
    });
    [[0, 0.55], [1, 0.35], [1, 0.7], [2, 0.25]].forEach(([seg, t]) => {
      const [x, y] = onWing(LOWER, PIVOT_LOWER, seg, t, 0.87, flip);
      add("Wing spot", circle(x, y, 5), 2, [x, y], 6.5);
    });
  });

  // body
  [[222, 8, 11], [241, 7.5, 10], [259, 7, 9], [275, 6, 8], [290, 5, 7]].forEach(([y, rx, ry], i) =>
    add("Body segment", ellipse(200, y, rx, ry), i % 2 ? 9 : 3, [200, y], 6)
  );
  add("Thorax", ellipse(200, 190, 10, 22), 9, [200, 190], 8);
  add("Head", circle(200, 160, 9), 9, [200, 160], 6);

  // antennae are drawn lines, not fillable parts
  deco.push({ d: "M196 153C192 138 186 128 178 118" });
  deco.push({ d: "M204 153C208 138 214 128 222 118" });
  deco.push({ d: circle(178, 118, 3), solid: true });
  deco.push({ d: circle(222, 118, 3), solid: true });
});

export const PICTURES = [mandala, tulips, butterfly];

/* ---------- 4. Random mandala ---------- */
// A new picture for every seed. The same seed always gives the same picture, so two players
// in a room can share one. It is built ring by ring from the outside in; each ring is one of
// a few kinds (coloured segments, petals, dots or points) with random sizes and colours.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The level is stored in the seed (seed % 3), so a room shares it along with the picture.
export const SEED_LEVELS = ["easy", "medium", "hard"];
export const seedLevel = (seed) => SEED_LEVELS[seed % 3];
export const newSeed = (level = "medium") => {
  const base = 1 + Math.floor(Math.random() * 300000);
  return base * 3 + Math.max(0, SEED_LEVELS.indexOf(level));
};

export function randomPicture(seed) {
  const id = `random-${seed}`;
  const pic = build(id, "Random", (add) => {
    const rand = rng(seed);
    const pick = (list) => list[Math.floor(rand() * list.length)];
    const between = (a, b) => a + rand() * (b - a);
    const C = 200;
    const top = -Math.PI / 2;
    const lvl = seed % 3; // 0 easy, 1 medium, 2 hard
    // easy: a bold pattern with fewer, bigger parts. hard: many small parts.
    const sym = pick([[6, 6, 8], [8, 8, 10, 12], [12, 12, 14, 16]][lvl]); // how many times the pattern repeats around

    // colours: never the same as the one just used
    let last = 0;
    const colour = (not = []) => {
      const options = PALETTE.map((c) => c.n).filter((n) => n !== last && !not.includes(n));
      last = pick(options);
      return last;
    };

    const bg = colour();
    add("Background", rect(0, 0, 400, 400), bg, [[46, 46], [354, 46], [46, 354], [354, 354]], 10);

    let r = 192;
    const edge = colour([bg]);
    // outer border: coloured segments in two alternating colours
    const segs = sym * 3;
    const second = colour([bg, edge]);
    for (let i = 0; i < segs; i++) {
      const a0 = top + (i * TAU) / segs;
      const a1 = a0 + TAU / segs;
      add("Border", sector(C, C, r - 20, r, a0, a1), i % 2 ? second : edge, P(C, C, r - 10, (a0 + a1) / 2), 9);
    }
    r -= 20;

    let lastType = "";
    const layers = pick([[3, 4, 4], [5, 6, 6], [7, 8, 8]][lvl]);
    for (let k = 0; k < layers && r > 80; k++) {
      // more flowers than plain rings; never two plain rings in a row; a petal ring early on
      let type = k === 1 ? "petals" : pick(["petals", "petals", "dots", "points", "ring"]);
      if (type === "ring" && lastType === "ring") type = "petals";
      const room = r - 50;
      const thick = Math.min(room, type === "petals" ? between(46, 58) : between(30, 44));
      const r1 = r;
      const r0 = r - thick;
      const mid = (r0 + r1) / 2;
      const spacing = (TAU * mid) / sym;
      // too cramped for numbers to fit: use plain coloured segments instead
      if (type === "petals" && Math.min(spacing * 0.3, thick * 0.42) < 11) type = "ring";
      const offset = top + (k % 2 ? Math.PI / sym : 0);
      const gapAngles = [0, 1, 2, 3].map((j) => offset + ((j * sym) / 4 | 0) * (TAU / sym) + Math.PI / sym);

      if (type === "ring") {
        const n = sym * 2;
        const cA = colour();
        const cB = colour([cA]);
        for (let i = 0; i < n; i++) {
          const a0 = offset + (i * TAU) / n;
          const a1 = a0 + TAU / n;
          add("Band", sector(C, C, r0, r1, a0, a1), i % 2 ? cB : cA, P(C, C, mid, (a0 + a1) / 2), 8);
        }
      } else {
        // a disc that shows between the shapes, labelled in the gaps
        const disc = colour();
        const shapeColour = colour([disc]);
        const wide = spacing * 0.6; // shape width at mid radius
        add("Disc", circle(C, C, r1), disc, gapAngles.map((a) => P(C, C, mid, a)), 8);
        if (type === "petals") {
          const w = Math.min(spacing * 0.3, thick * 0.42);
          const inner = colour([disc, shapeColour]);
          for (let i = 0; i < sym; i++) {
            const a = offset + (i * TAU) / sym;
            add("Petal", radialLeaf(C, C, a, r0 + 1, r1 - 2, w), shapeColour, P(C, C, r0 + thick * 0.76, a), 7);
          }
          for (let i = 0; i < sym; i++) {
            const a = offset + (i * TAU) / sym;
            add("Petal centre", radialLeaf(C, C, a, r0 + thick * 0.1, r0 + thick * 0.52, w * 0.5), inner, P(C, C, r0 + thick * 0.31, a), 7);
          }
        } else if (type === "dots") {
          const rr = Math.min(thick / 2 - 3, wide / 2, 13);
          const n = sym;
          for (let i = 0; i < n; i++) {
            const a = offset + (i * TAU) / n;
            const c = P(C, C, mid, a);
            add("Dot", circle(c[0], c[1], rr), shapeColour, c, Math.min(9, rr * 1.1));
          }
        } else {
          // points: triangles that point outward
          const half = Math.min(wide / 2, thick / 1.6);
          for (let i = 0; i < sym; i++) {
            const a = offset + (i * TAU) / sym;
            const tip = P(C, C, r1 - 2, a);
            const l = P(C, C, r0 + 2, a - half / mid);
            const rt = P(C, C, r0 + 2, a + half / mid);
            add("Point", poly(l, tip, rt), shapeColour, P(C, C, r0 + thick * 0.4, a), 7);
          }
        }
      }
      lastType = type;
      r = r0;
    }

    // centre: three stacked discs
    const R = Math.max(24, r - 4);
    const c1 = colour();
    const c2 = colour([c1]);
    const c3 = colour([c2]);
    add("Centre", circle(C, C, R), c1, [P(C, C, R * 0.82, top), P(C, C, R * 0.82, top + Math.PI), P(C, C, R * 0.82, top + Math.PI / 2), P(C, C, R * 0.82, top - Math.PI / 2)], 8);
    add("Centre", circle(C, C, R * 0.62), c2, [[C, C - R * 0.46], [C, C + R * 0.46]], 8);
    add("Centre", circle(C, C, R * 0.3), c3, [C, C], 8);
  });
  return pic;
}
