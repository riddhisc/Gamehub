import "./Landing.css";

const INK = "#0b0b0b";

function Controller() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <path d="M25 12h70c14 0 25 30 22 50-2 12-14 12-20 2l-8-12H31l-8 12C17 74 5 74 3 62 0 42 11 12 25 12z" fill="#ff4fa3" stroke={INK} strokeWidth="4" />
      <path d="M30 32h16M38 24v16" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <circle cx="82" cy="30" r="5.5" fill="#ffe600" />
      <circle cx="94" cy="41" r="5.5" fill="#00d9b5" />
    </svg>
  );
}

function Dice() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#ffe600" stroke={INK} strokeWidth="4" />
      {[[24, 24], [56, 24], [40, 40], [24, 56], [56, 56]].map(([x, y]) => (
        <circle key={x + "-" + y} cx={x} cy={y} r="6" fill={INK} />
      ))}
    </svg>
  );
}

function Ghost() {
  return (
    <svg viewBox="0 0 80 90" aria-hidden="true">
      <path d="M8 84V38C8 16 22 4 40 4s32 12 32 34v46l-12-10-10 10-10-10-10 10-10-10z" fill="#00d9b5" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="29" cy="38" r="10" fill="#fff" /><circle cx="54" cy="38" r="10" fill="#fff" />
      <circle cx="32" cy="40" r="5" fill="#0a5bd8" /><circle cx="57" cy="40" r="5" fill="#0a5bd8" />
    </svg>
  );
}

function Coil() {
  return (
    <svg viewBox="0 0 110 90" aria-hidden="true">
      <ellipse cx="55" cy="72" rx="50" ry="16" fill="#0a5bd8" stroke={INK} strokeWidth="4" />
      <ellipse cx="55" cy="48" rx="38" ry="14" fill="#1b7cff" stroke={INK} strokeWidth="4" />
      <ellipse cx="55" cy="26" rx="24" ry="12" fill="#0a5bd8" stroke={INK} strokeWidth="4" />
      <circle cx="62" cy="22" r="3" fill="#fff" />
      <path d="M55 38l-6 14h12z" fill="#ff4fa3" />
    </svg>
  );
}

function Eyes() {
  return (
    <svg viewBox="0 0 90 50" aria-hidden="true">
      <circle cx="24" cy="25" r="20" fill="#fff" stroke={INK} strokeWidth="4" /><circle cx="66" cy="25" r="20" fill="#fff" stroke={INK} strokeWidth="4" />
      <circle cx="28" cy="27" r="8" fill="#0a5bd8" /><circle cx="70" cy="27" r="8" fill="#0a5bd8" />
    </svg>
  );
}

function Burst() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 4l10 28 30-6-20 24 24 20-32 0-12 30-12-30-32 0 24-20L10 26l30 6z" fill="#ff8a00" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="50" cy="48" r="9" fill="#ffe600" stroke={INK} strokeWidth="3" />
    </svg>
  );
}

export default function Landing({ onGames, onTogether, onFeatured, featuredName }) {
  return (
    <main className="landing">
      <nav className="l-nav">
        <button className="l-menu" onClick={onGames} aria-label="See all games">
          <span /><span />
        </button>
        <span className="l-brand">THE <b>GAME HUB</b></span>
        <svg className="l-logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 22h20z" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="12" cy="15" r="2.5" fill="#ffe600" /></svg>
      </nav>

      <span className="l-side l-left">EST</span>
      <span className="l-side l-right">2026</span>

      <h1 className="l-hero">
        <span>LET'S PLAY</span>
        <span>AT THE</span>
        <span>GAME<em>HUB</em></span>
      </h1>

      <div className="l-doodle d-eyes"><Eyes /></div>
      <div className="l-doodle d-burst"><Burst /></div>
      <div className="l-doodle d-pad"><Controller /></div>
      <div className="l-doodle d-dice"><Dice /></div>
      <div className="l-doodle d-ghost"><Ghost /></div>
      <div className="l-doodle d-coil"><Coil /></div>

      <div className="l-actions">
        <button onClick={onGames}>ALL GAMES</button>
        <button onClick={onFeatured}>{featuredName || "FEATURED"}</button>
        <button onClick={onTogether}>PLAY TOGETHER</button>
      </div>
    </main>
  );
}
