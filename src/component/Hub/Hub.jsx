import PlayTogether from "./PlayTogether";
import "./Hub.css";

export default function Hub({ games, onPick }) {
  return (
    <main className="hub">
      <header className="hub-header">
        <h1 className="hub-title">
          Game <span>Hub</span>
        </h1>
        <p className="hub-sub">Pick a game and start playing.</p>
      </header>

      <div className="hub-grid">
        {games.map(({ id, name, description, players, accent, Icon, featured }) => (
          <button
            key={id}
            className={`game-card ${featured ? "featured" : ""}`}
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

      <PlayTogether games={games} onStart={onPick} />
    </main>
  );
}
