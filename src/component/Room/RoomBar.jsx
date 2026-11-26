import { useState } from "react";
import "./Room.css";

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// A slim strip shown only while a room is active (rooms are made and joined from the main page).
export default function RoomBar({ room, onExit, youAre }) {
  const [copied, setCopied] = useState("");

  if (room.status === "idle") return null;

  const canLink = /^https?:$/.test(window.location.protocol);
  const link = canLink ? `${window.location.origin}${window.location.pathname}?room=${room.code}` : "";

  async function doCopy(what, text) {
    const ok = await copy(text);
    setCopied(ok ? what : "failed");
    setTimeout(() => setCopied(""), 1800);
  }

  if (room.status === "error") {
    return (
      <section className="room-strip error" aria-label="Online room">
        <span className="room-error" role="alert">{room.error}</span>
        <button className="chip" onClick={onExit}>Back to games</button>
      </section>
    );
  }

  if (room.status === "connecting") {
    return (
      <section className="room-strip" aria-label="Online room">
        <span role="status">Connecting…</span>
        <button className="chip" onClick={room.leave}>Cancel</button>
      </section>
    );
  }

  const live = room.status === "connected";

  return (
    <section className={`room-strip ${live ? "live" : ""}`} aria-label="Online room">
      <span className="strip-code" aria-label={`Room code ${room.code.split("").join(" ")}`}>{room.code}</span>
      <span className="strip-text" role="status">
        {live && <><span className="dot-live" aria-hidden="true" />Connected{youAre ? ` · ${youAre}` : ""}</>}
        {room.status === "waiting" && "Waiting for your friend"}
        {room.status === "ended" && "Your friend left"}
      </span>
      {room.status !== "ended" && (
        <button className="chip" onClick={() => doCopy("code", room.code)}>
          {copied === "code" ? "Copied!" : "Copy code"}
        </button>
      )}
      {room.status !== "ended" && canLink && (
        <button className="chip" onClick={() => doCopy("link", link)}>
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
      )}
      <button className="chip" onClick={room.leave}>Leave</button>
      {room.local && room.status !== "ended" && (
        <span className="strip-note">Online service unreachable: works between tabs of this browser only.</span>
      )}
      {copied === "failed" && <span className="strip-note">Couldn't copy. Select the code and copy it by hand.</span>}
    </section>
  );
}
