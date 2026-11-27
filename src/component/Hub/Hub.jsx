import { useState } from "react";
import PlayTogether from "./PlayTogether";
import Landing from "./Landing";
import "./Hub.css";
import "./HubTheme.css";

// Show the landing screen once per visit; coming back from a game goes straight to the list.
let seenLanding = false;

export default function Hub({ games, onPick }) {
  const [landing, setLanding] = useState(!seenLanding);
  const featured = games.find((g) => g.featured);
  const premium = games.filter((g) => g.tier !== "basic");
  const basic = games.filter((g) => g.tier === "basic");

  const enter = (after) => {
    seenLanding = true;
    setLanding(false);
    if (after) setTimeout(after, 0);
  };

  if (landing) {
    return (
      <Landing
        featuredName={featured && featured.name}
        onGames={() => enter()}
        onFeatured={() => enter(() => featured && onPick(featured.id))}
        onTogether={() => enter(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }))}
      />
    );
  }

  return (
    <div className="hub-wrap">
    <main className="hub">
      <nav className="hub-nav">
        <button className="back" onClick={() => setLanding(true)}>
          <span aria-hidden="true">←</span> Home
        </button>
        <span className="hub-brand">THE <b>GAME HUB</b></span>
      </nav>
      <header className="hub-header">
        <h1 className="hub-title">
          Game <span>Hub</span>
        </h1>
        <p className="hub-sub">Pick a game and start playing.</p>
      </header>

      {[
        ["premium", "Premium games", "Full-screen games with levels, bosses and power-ups.", premium],
        ["basic", "Basic games", "Quick classics for a short break.", basic],
      ].map(([tier, title, sub, list]) => (
        <section key={tier} className="hub-section">
          <h2 className="hub-section-title">{title}</h2>
          <p className="hub-section-sub">{sub}</p>
          <div className="hub-grid">
            {list.map(({ id, name, description, players, accent, Icon, featured }) => (
              <button
                key={id}
                className={`game-card ${featured ? "featured" : ""} ${tier === "basic" ? "basic" : ""}`}
                style={{ "--accent": accent }}
                onClick={() => onPick(id)}
              >
                {featured && <span className="card-badge">New · Featured</span>}
                <Icon />
                <span className="card-name">{name}</span>
                <span className="card-desc">{description}</span>
                <span className="card-meta">{players}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <PlayTogether games={games} onStart={onPick} />
    </main>
    </div>
  );
}
