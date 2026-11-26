import { useCallback, useEffect, useRef, useState } from "react";
import { openRoom, normaliseCode, isValidCode } from "./room";

const IDLE = { status: "idle", code: "", role: null, error: "", local: false };

// Room state for one game.
//   handlers.onMessage(kind, payload)   something arrived from the other player
//   handlers.onConnected(role)          the other player is here (host: send them the current state)
//   handlers.onDisconnected()           they left
// `intent` ({ mode: "create" } or { mode: "join", code }) comes from the main page and is
// carried out once when the game opens.
export default function useRoom(game, handlers, intent) {
  const [state, setState] = useState(IDLE);
  const roomRef = useRef(null);
  const h = useRef(handlers);
  h.current = handlers;

  const stop = useCallback(() => {
    if (roomRef.current) roomRef.current.close();
    roomRef.current = null;
  }, []);

  const start = useCallback(
    (role, code) => {
      stop();
      setState({ ...IDLE, status: "connecting", role, code: code || "" });
      let me = null;
      me = openRoom({
        role,
        code,
        game,
        onReady: ({ code: c, local }) => roomRef.current === me && setState((s) => ({ ...s, status: "waiting", code: c, local })),
        onConnected: () => {
          if (roomRef.current !== me) return;
          setState((s) => ({ ...s, status: "connected", error: "" }));
          h.current.onConnected && h.current.onConnected(role);
        },
        onDisconnected: () => {
          if (roomRef.current !== me) return;
          setState((s) => ({ ...s, status: role === "host" ? "waiting" : "ended" }));
          h.current.onDisconnected && h.current.onDisconnected(role);
        },
        onMessage: (k, p) => roomRef.current === me && h.current.onMessage && h.current.onMessage(k, p),
        onError: (text) => {
          if (roomRef.current !== me) return;
          stop();
          setState({ ...IDLE, status: "error", error: text });
        },
      });
      roomRef.current = me;
    },
    [game, stop]
  );

  const create = useCallback(() => start("host"), [start]);

  const join = useCallback(
    (raw) => {
      const code = normaliseCode(raw);
      if (!isValidCode(code)) {
        setState({ ...IDLE, status: "error", error: "Room codes are 5 letters or numbers." });
        return;
      }
      start("guest", code);
    },
    [start]
  );

  const leave = useCallback(() => {
    stop();
    setState(IDLE);
  }, [stop]);

  const send = useCallback((kind, payload) => roomRef.current && roomRef.current.send(kind, payload), []);

  useEffect(() => {
    if (intent && intent.mode === "create") create();
    else if (intent && intent.mode === "join") join(intent.code);
    const bye = () => stop();
    window.addEventListener("pagehide", bye);
    return () => {
      window.removeEventListener("pagehide", bye);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, connected: state.status === "connected", create, join, leave, send };
}
