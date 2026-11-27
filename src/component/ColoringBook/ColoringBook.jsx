import { useEffect, useMemo, useRef, useState } from "react";
import { PALETTE, PICTURES, randomPicture, newSeed, seedLevel } from "./pictures";
import Levels, { useLevel } from "../Levels/Levels";
import { downloadPicture } from "./exportImage";
import useRoom from "../../net/useRoom";
import RoomBar from "../Room/RoomBar";
import "./ColoringBook.css";

const BLANK = "#f4f7f8";
const ZOOMS = [1, 1.5, 2, 3];
const EMPTY = { done: {}, history: [] };

const colorOf = (n) => PALETTE.find((c) => c.n === n);

// Your work is kept on this device, so leaving the game or reloading the page doesn't lose it.
const SAVE_KEY = "gamehub-coloring-v1";

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    const art = {};
    PICTURES.forEach((p) => {
      const cur = saved && saved.art && saved.art[p.id];
      if (!cur) return;
      const ids = new Set(p.regions.map((r) => r.id));
      const done = {};
      Object.keys(cur.done || {}).forEach((id) => ids.has(id) && (done[id] = "me"));
      art[p.id] = { done, history: Object.keys(done).map((id) => ({ id, by: "me" })) };
    });
    const seed = saved && Number.isInteger(saved.seed) ? saved.seed : newSeed();
    // the random picture's saved work only counts if it belongs to the saved seed
    const cur = saved && saved.art && saved.art.random;
    if (cur) {
      const done = {};
      Object.keys(cur.done || {}).forEach((id) => id.startsWith(`random-${seed}-`) && (done[id] = "me"));
      art.random = { done, history: Object.keys(done).map((id) => ({ id, by: "me" })) };
    }
    const ok = saved && (saved.pictureId === "random" || PICTURES.some((p) => p.id === saved.pictureId));
    return { art, pictureId: ok ? saved.pictureId : PICTURES[0].id, seed };
  } catch {
    return { art: {}, pictureId: PICTURES[0].id, seed: newSeed() };
  }
}

// pure updates to the saved work (safe to apply twice, so both players can click the same part)
function fillIn(all, pic, id, by) {
  const cur = all[pic] || EMPTY;
  if (cur.done[id]) return all;
  return { ...all, [pic]: { done: { ...cur.done, [id]: by }, history: [...cur.history, { id, by }] } };
}

// work done before a room was opened ("me") belongs to the host
const owner = (by) => (by === "me" ? "host" : by);

function takeOut(all, pic, id) {
  const cur = all[pic] || EMPTY;
  if (!cur.done[id]) return all;
  const done = { ...cur.done };
  delete done[id];
  return { ...all, [pic]: { done, history: cur.history.filter((h) => h.id !== id) } };
}

export default function ColoringBook({ intent, onExit }) {
  const [saved] = useState(loadSaved);
  const [pictureId, setPictureId] = useState(saved.pictureId);
  const [level, setLevel] = useLevel("coloring");
  const [seed, setSeed] = useState(saved.seed); // which random picture "Random" is showing
  const [sureNew, setSureNew] = useState(false);
  const [selected, setSelected] = useState(1); // the colour number being used
  const [zoomIndex, setZoomIndex] = useState(0);
  const [message, setMessage] = useState(null);
  // saved work per picture: { done: {regionId: "me"|"host"|"guest"}, history: [{id, by}, ...] }
  const [art, setArt] = useState(saved.art);
  const [partner, setPartner] = useState({ colour: null, flash: null }); // what the other player is doing
  const [sureClear, setSureClear] = useState(false);
  const [saving, setSaving] = useState(false);
  const flashTimer = useRef(null);

  // Online: both players edit the same picture. Changes travel as small messages
  // (fill / undo / clear / picture), and the host sends the whole picture when a friend joins.
  const room = useRoom("coloring", {
    onMessage: (kind, p) => {
      if (kind === "fill") {
        setArt((all) => fillIn(all, p.pic, p.id, p.by));
        setPartner((x) => ({ ...x, flash: p.id }));
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setPartner((x) => ({ ...x, flash: null })), 1400);
      } else if (kind === "undo") setArt((all) => takeOut(all, p.pic, p.id));
      else if (kind === "clear") setArt((all) => ({ ...all, [p.pic]: EMPTY }));
      else if (kind === "picture") setPictureId(p.id);
      else if (kind === "random") {
        setSeed(p.seed);
        setArt((all) => ({ ...all, random: EMPTY }));
        setPictureId("random");
      }
      else if (kind === "colour") setPartner((x) => ({ ...x, colour: p.n }));
      else if (kind === "sync") {
        setArt(p.art);
        setPictureId(p.pictureId);
        if (p.seed) setSeed(p.seed);
      }
    },
    onConnected: (role) => {
      if (role === "host") room.send("sync", { art, pictureId, seed });
      room.send("colour", { n: selected });
    },
    onDisconnected: () => setPartner({ colour: null, flash: null }),
  }, intent);
  const me = room.connected ? room.role : "me";
  const mate = room.connected ? (room.role === "host" ? "guest" : "host") : null;

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ art, pictureId, seed }));
    } catch {
      /* storage unavailable: the picture just isn't remembered */
    }
  }, [art, pictureId, seed]);

  function pickColour(n) {
    setSelected(n);
    room.send("colour", { n });
  }

  const randomPic = useMemo(() => randomPicture(seed), [seed]);
  const allPictures = [...PICTURES, { ...randomPic, id: "random" }];
  const picture = allPictures.find((p) => p.id === pictureId) || PICTURES[0];
  const { done, history } = art[pictureId] || EMPTY;
  const zoom = ZOOMS[zoomIndex];

  const total = picture.regions.length;
  const filled = picture.regions.filter((r) => done[r.id]).length;
  const finished = filled === total;

  // how many parts of each colour are still empty
  const left = {};
  picture.regions.forEach((r) => {
    if (!done[r.id]) left[r.n] = (left[r.n] || 0) + 1;
  });
  const colours = PALETTE.filter((c) => picture.regions.some((r) => r.n === c.n));

  // when the picture changes, start on a colour that picture actually uses
  useEffect(() => {
    if (!left[selected]) {
      const next = colours.find((c) => left[c.n]);
      if (next) pickColour(next.n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pictureId, seed]);

  function switchPicture(id) {
    setPictureId(id);
    setMessage(null);
    room.send("picture", { id });
  }

  // a brand new random picture (asks for a second click if you'd lose colouring)
  function makeRandom() {
    const hasWork = Object.keys((art.random || EMPTY).done).length > 0;
    if (hasWork && !sureNew) {
      setSureNew(true);
      setTimeout(() => setSureNew(false), 3000);
      return;
    }
    setSureNew(false);
    const next = newSeed(level);
    setSeed(next);
    setArt((all) => ({ ...all, random: EMPTY }));
    setPictureId("random");
    setMessage(null);
    room.send("random", { seed: next });
  }

  function paint(region) {
    if (done[region.id]) {
      setMessage("That part is already coloured.");
      return;
    }
    if (region.n !== selected) {
      const c = colorOf(region.n);
      setMessage(`That part is number ${region.n} (${c.name.toLowerCase()}). Pick ${region.n} to fill it.`);
      return;
    }

    setArt((all) => fillIn(all, pictureId, region.id, me));
    room.send("fill", { pic: pictureId, id: region.id, by: me });
    setMessage(null);

    // that was the last part of this colour: jump to the next colour with parts left
    if (left[selected] === 1) {
      const next =
        colours.find((c) => c.n > selected && left[c.n]) || colours.find((c) => c.n !== selected && left[c.n]);
      if (next) pickColour(next.n);
    }
  }

  // undo takes back your own last part (not your friend's)
  function undo() {
    const mine = [...history].reverse().find((h) => owner(h.by) === owner(me));
    if (!mine) return;
    setArt((all) => takeOut(all, pictureId, mine.id));
    room.send("undo", { pic: pictureId, id: mine.id });
    const region = picture.regions.find((r) => r.id === mine.id);
    if (region) pickColour(region.n);
    setMessage(null);
  }

  function clear() {
    if (room.connected && !sureClear) {
      setSureClear(true);
      setTimeout(() => setSureClear(false), 3000);
      return;
    }
    setSureClear(false);
    setArt((all) => ({ ...all, [pictureId]: EMPTY }));
    room.send("clear", { pic: pictureId });
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    try {
      await downloadPicture(picture, done, finished);
      setMessage(null);
    } catch {
      setMessage("Sorry, the image couldn't be created.");
    }
    setSaving(false);
  }

  function onKey(e, region) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      paint(region);
    }
  }

  const current = colorOf(selected);
  let status;
  if (message) status = <span className="warn">{message}</span>;
  else if (finished) status = <><strong>Finished!</strong> All {total} parts are coloured in. Save your picture below.</>;
  else
    status = (
      <>
        <strong>{total - filled}</strong> parts left. Colour <span className="sel-dot" style={{ background: current.hex }} />{selected} ({current.name.toLowerCase()}):{" "}
        <strong>{left[selected] || 0}</strong> left
      </>
    );

  return (
    <main className="game coloring">
      <h1 className="title">
        Coloring <span>Book</span>
      </h1>

      <RoomBar room={room} onExit={onExit} youAre={room.connected ? "Painting together" : null} />

      <div className="picker" role="tablist" aria-label="Choose a picture">
        {allPictures.map((p) => {
          const doneMap = (art[p.id] || EMPTY).done;
          const count = p.regions.filter((r) => doneMap[r.id]).length;
          return (
            <button
              key={p.id}
              role="tab"
              className="tab"
              aria-selected={p.id === pictureId}
              onClick={() => switchPicture(p.id)}
            >
              {p.name}
              <span className="tab-count">{count}/{p.regions.length}</span>
            </button>
          );
        })}
      </div>

      <p className="status" aria-live="polite">{status}</p>

      <div
        className="progress"
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={filled}
      >
        <div className="progress-bar" style={{ width: `${(filled / total) * 100}%` }} />
      </div>

      <div className="canvas" tabIndex={0} role="region" aria-label={`${picture.name} picture. Scrolls when zoomed in.`}>
        <svg viewBox="0 0 400 400" style={{ width: `${zoom * 100}%` }}>
          {picture.regions.map((r) => {
            const isDone = Boolean(done[r.id]);
            return (
              <path
                key={r.id}
                data-id={r.id}
                d={r.d}
                className={`region ${!isDone && r.n === selected ? "target" : ""} ${partner.flash === r.id ? "partner-flash" : ""}`}
                fill={isDone ? colorOf(r.n).hex : BLANK}
                role="button"
                tabIndex={0}
                aria-label={`${r.name}, number ${r.n}, ${isDone ? "coloured" : "not coloured"}`}
                onClick={() => paint(r)}
                onKeyDown={(e) => onKey(e, r)}
              />
            );
          })}

          {picture.deco.map((d, i) => (
            <path key={i} d={d.d} className={d.solid ? "deco solid" : "deco"} />
          ))}

          {picture.regions.map(
            (r) =>
              !done[r.id] &&
              r.labels.map(([x, y], i) => (
                <text key={`${r.id}-${i}`} data-owner={r.id} x={x} y={y} fontSize={r.fs} className={`num ${r.n === selected ? "num-target" : ""}`} aria-hidden="true">
                  {r.n}
                </text>
              ))
          )}
        </svg>
      </div>

      <div className="zoom" aria-label="Zoom">
        <button
          className="zoom-btn"
          aria-label="Zoom out"
          onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
          disabled={zoomIndex === 0}
        >
          −
        </button>
        <span className="zoom-level">Zoom {Math.round(zoom * 100)}%</span>
        <button
          className="zoom-btn"
          aria-label="Zoom in"
          onClick={() => setZoomIndex((i) => Math.min(ZOOMS.length - 1, i + 1))}
          disabled={zoomIndex === ZOOMS.length - 1}
        >
          +
        </button>
      </div>

      {room.connected && (
        <p className="teamwork" aria-live="off">
          You coloured <strong>{Object.values(done).filter((v) => owner(v) === me).length}</strong> · Friend coloured{" "}
          <strong>{Object.values(done).filter((v) => owner(v) === mate).length}</strong>
          {partner.colour && !finished && (
            <> · Friend is on <span className="mini-dot" style={{ background: colorOf(partner.colour).hex }} /> {partner.colour}</>
          )}
        </p>
      )}

      <div className="palette" role="radiogroup" aria-label="Colour numbers">
        {colours.map((c) => {
          const remaining = left[c.n] || 0;
          return (
            <button
              key={c.n}
              role="radio"
              aria-checked={c.n === selected}
              aria-label={`Color ${c.n}, ${c.name}, ${remaining === 0 ? "finished" : `${remaining} left`}`}
              className={`swatch ${c.n === selected ? "selected" : ""} ${remaining === 0 ? "finished" : ""} ${room.connected && partner.colour === c.n ? "partner-on" : ""}`}
              onClick={() => pickColour(c.n)}
            >
              <span className="dot" style={{ background: c.hex, color: c.ink }}>
                {remaining === 0 ? "✓" : c.n}
              </span>
              <span className="left">{remaining === 0 ? "done" : `${remaining} left`}</span>
            </button>
          );
        })}
      </div>

      {pictureId === "random" && (
        <Levels
          value={level}
          onChange={setLevel}
          label="Random picture"
          hints={{ easy: "Bold pattern, fewer parts. Press New random picture to use it.", medium: "A detailed pattern.", hard: "Many small parts. Press New random picture to use it." }}
        />
      )}
      {pictureId === "random" && <p className="levels-hint">This picture is {seedLevel(seed)}.</p>}

      <div className="actions">
        <button className={`btn ${finished ? "btn-primary" : "btn-ghost"}`} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Download image"}
        </button>
        <button className="btn btn-ghost" onClick={undo} disabled={!history.some((h) => owner(h.by) === owner(me))}>
          Undo
        </button>
        {pictureId === "random" && (
          <button className="btn btn-ghost" onClick={makeRandom}>
            {sureNew ? "Sure? Replace picture" : "New random picture"}
          </button>
        )}
        <button className="btn btn-ghost" onClick={clear} disabled={filled === 0}>
          {sureClear ? "Sure? Clear for both" : "Clear picture"}
        </button>
      </div>
    </main>
  );
}
