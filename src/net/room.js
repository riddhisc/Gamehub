// Room connection layer.
//
// One player creates a room and gets a short code; the other enters it.
// Players are linked directly (WebRTC through PeerJS, which uses a free public
// broker only to introduce the two browsers). No game server of our own.
//
// If PeerJS can't be loaded or the broker can't be reached, rooms fall back to
// a "same browser" mode (tabs on one device) so the feature still works.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1: easy to read aloud
const CODE_LENGTH = 5;
const PEER_PREFIX = "gamehub-v1-";
const CHANNEL_PREFIX = "gamehub-room-";
const CONNECT_TIMEOUT = 15000;

// The first letter of a code says which game the room is for, so a friend can just type the
// code on the main page and land in the right game.
export const CODE_GAMES = { T: "tictactoe", C: "connect4", P: "coloring", D: "ludo", S: "sudoku" };
const LETTER_FOR = Object.fromEntries(Object.entries(CODE_GAMES).map(([l, g]) => [g, l]));

export const gameForCode = (code) => CODE_GAMES[code[0]] || null;

export function makeCode(game) {
  const bytes = new Uint32Array(CODE_LENGTH - 1);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  const rest = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return (LETTER_FOR[game] || "T") + rest;
}

export const normaliseCode = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const isValidCode = (code) =>
  code.length === CODE_LENGTH && [...code].every((ch) => ALPHABET.includes(ch));

export const CODE_LENGTH_CHARS = CODE_LENGTH;

const forceLocal = () => {
  try {
    return new URLSearchParams(window.location.search).get("transport") === "local";
  } catch {
    return false;
  }
};

async function loadPeer() {
  // a page can preload PeerJS with a <script> tag (the single-file version does this)
  if (window.peerjs && window.peerjs.Peer) return window.peerjs.Peer;
  try {
    const mod = await import("peerjs");
    return mod.Peer || mod.default?.Peer || mod.default;
  } catch {
    return null;
  }
}

// ---------- transports ----------
// host(code, { onReady, onConnection(conn), onError(msg, canFallBack) }) -> { close }
// join(code, { onOpen(conn), onError(msg, canFallBack) })               -> { close }
// conn: { send(obj), close(), onmessage, onclose }

function wrapPeerConn(c) {
  const conn = {
    send: (d) => c.send(d),
    close: () => c.close(),
    onmessage: null,
    onclose: null,
  };
  c.on("data", (d) => conn.onmessage && conn.onmessage(d));
  c.on("close", () => conn.onclose && conn.onclose());
  c.on("error", () => conn.onclose && conn.onclose());
  return conn;
}

const BROKER_ERRORS = ["network", "server-error", "socket-error", "socket-closed", "browser-incompatible"];

function peerTransport(Peer) {
  return {
    local: false,
    host(code, cb) {
      const peer = new Peer(PEER_PREFIX + code);
      peer.on("open", () => cb.onReady());
      peer.on("connection", (c) => c.on("open", () => cb.onConnection(wrapPeerConn(c))));
      peer.on("error", (e) => {
        if (e.type === "unavailable-id") cb.onError("code-taken");
        else cb.onError("Couldn't reach the online service.", BROKER_ERRORS.includes(e.type));
      });
      return { close: () => peer.destroy() };
    },
    join(code, cb) {
      const peer = new Peer();
      peer.on("open", () => {
        const c = peer.connect(PEER_PREFIX + code, { reliable: true });
        c.on("open", () => cb.onOpen(wrapPeerConn(c)));
        c.on("error", () => cb.onError("Couldn't connect to that room."));
      });
      peer.on("error", (e) => {
        if (e.type === "peer-unavailable") cb.onError("No room found with that code.");
        else cb.onError("Couldn't reach the online service.", BROKER_ERRORS.includes(e.type));
      });
      return { close: () => peer.destroy() };
    },
  };
}

const rid = () => Math.random().toString(36).slice(2);

function bcConn(ch, self, other) {
  const conn = {
    send: (d) => ch.postMessage({ k: "data", from: self, to: other, d }),
    close: () => {
      try {
        ch.postMessage({ k: "close", from: self, to: other });
      } catch {
        /* channel already closed */
      }
    },
    onmessage: null,
    onclose: null,
  };
  return conn;
}

const localTransport = {
  local: true,
  host(code, cb) {
    const ch = new BroadcastChannel(CHANNEL_PREFIX + code);
    const id = rid();
    const conns = new Map();
    ch.onmessage = (e) => {
      const m = e.data;
      if (m.to && m.to !== id) return;
      if (m.k === "connect") {
        const c = bcConn(ch, id, m.from);
        conns.set(m.from, c);
        ch.postMessage({ k: "ack", from: id, to: m.from });
        cb.onConnection(c);
      } else if (m.k === "data") {
        const c = conns.get(m.from);
        if (c && c.onmessage) c.onmessage(m.d);
      } else if (m.k === "close") {
        const c = conns.get(m.from);
        conns.delete(m.from);
        if (c && c.onclose) c.onclose();
      }
    };
    setTimeout(cb.onReady, 0);
    return {
      close() {
        conns.forEach((c) => c.close());
        ch.close();
      },
    };
  },
  join(code, cb) {
    const ch = new BroadcastChannel(CHANNEL_PREFIX + code);
    const id = rid();
    let conn = null;
    const timer = setTimeout(() => cb.onError("No room found with that code."), 1500);
    ch.onmessage = (e) => {
      const m = e.data;
      if (m.to !== id) return;
      if (m.k === "ack") {
        clearTimeout(timer);
        conn = bcConn(ch, id, m.from);
        cb.onOpen(conn);
      } else if (m.k === "data" && conn && conn.onmessage) conn.onmessage(m.d);
      else if (m.k === "close" && conn && conn.onclose) conn.onclose();
    };
    ch.postMessage({ k: "connect", from: id });
    return {
      close() {
        clearTimeout(timer);
        if (conn) conn.close();
        ch.close();
      },
    };
  },
};

// ---------- the room ----------
// openRoom({ role: "host" | "guest", code?, game, handlers }) -> { close, send(kind, payload) }
// handlers: onReady({code, local}), onConnected(), onDisconnected(), onMessage(kind, payload), onError(text)

export function openRoom({ role, code: givenCode, game, onReady, onConnected, onDisconnected, onMessage, onError }) {
  let closed = false;
  let conn = null;
  let transport = null;
  let handle = null;
  let timer = null;
  let code = givenCode || makeCode(game);
  let attempts = 0;

  const fail = (text) => {
    if (closed) return;
    clearTimeout(timer);
    onError(text);
  };

  const reject = (c, reason) => {
    try {
      c.send({ t: "reject", reason });
    } catch {
      /* ignore */
    }
    setTimeout(() => c.close(), 300);
  };

  function hostCallbacks() {
    return {
      onReady: () => {
        if (!closed) onReady({ code, local: transport.local });
      },
      onConnection: (c) => {
        if (closed) return;
        c.onmessage = (m) => {
          if (closed || !m) return;
          if (m.t === "hello") {
            if (m.game !== game) return reject(c, "That room is for a different game.");
            if (conn) return reject(c, "That room already has two players.");
            conn = c;
            c.send({ t: "welcome" });
            onConnected();
          } else if (m.t === "msg" && conn === c) onMessage(m.k, m.p);
        };
        c.onclose = () => {
          if (conn === c) {
            conn = null;
            if (!closed) onDisconnected();
          }
        };
      },
      onError: (text, canFallBack) => {
        if (text === "code-taken" && attempts < 4) {
          attempts++;
          code = makeCode(game);
          handle.close();
          handle = transport.host(code, hostCallbacks());
        } else if (canFallBack && !transport.local) fallBack();
        else fail(text === "code-taken" ? "Couldn't make a room code. Try again." : text);
      },
    };
  }

  function guestCallbacks() {
    return {
      onOpen: (c) => {
        if (closed) return;
        clearTimeout(timer);
        c.onmessage = (m) => {
          if (closed || !m) return;
          if (m.t === "welcome") {
            conn = c;
            onConnected();
          } else if (m.t === "reject") fail(m.reason);
          else if (m.t === "msg" && conn === c) onMessage(m.k, m.p);
        };
        c.onclose = () => {
          if (closed) return;
          if (conn === c) {
            conn = null;
            onDisconnected();
          }
        };
        c.send({ t: "hello", game });
      },
      onError: (text, canFallBack) => {
        if (canFallBack && !transport.local) fallBack();
        else fail(text);
      },
    };
  }

  function begin() {
    handle = role === "host" ? transport.host(code, hostCallbacks()) : transport.join(code, guestCallbacks());
  }

  function fallBack() {
    if (handle) handle.close();
    transport = localTransport;
    begin();
  }

  (async () => {
    const Peer = forceLocal() ? null : await loadPeer();
    if (closed) return;
    transport = Peer ? peerTransport(Peer) : localTransport;
    timer = setTimeout(() => {
      if (!conn && role === "guest") fail("Couldn't reach that room. Check the code and try again.");
    }, CONNECT_TIMEOUT);
    begin();
  })();

  return {
    send(kind, payload) {
      if (conn && !closed) conn.send({ t: "msg", k: kind, p: payload });
    },
    close() {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      try {
        if (conn) conn.close();
      } catch {
        /* ignore */
      }
      if (handle) handle.close();
    },
  };
}
