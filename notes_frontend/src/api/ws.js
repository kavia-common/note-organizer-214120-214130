const HTTP_BASE =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:3001";

// Convert http/https to ws/wss
function toWsUrl(baseUrl) {
  try {
    const u = new URL(baseUrl);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = (u.pathname && u.pathname !== "/" ? u.pathname : "") + "/ws";
    return u.toString();
  } catch {
    // Fallback
    const isHttps = String(baseUrl).startsWith("https");
    const proto = isHttps ? "wss" : "ws";
    return `${proto}://${baseUrl.replace(/^https?:\/\//, "")}/ws`;
  }
}

const WS_URL =
  process.env.REACT_APP_WS_URL ||
  toWsUrl(HTTP_BASE);

/**
 * Backoff helper returning milliseconds for attempt number (capped).
 */
function backoffDelay(attempt, base = 500, max = 8000) {
  const jitter = Math.random() * 200;
  const exp = Math.min(max, base * Math.pow(2, attempt));
  return Math.floor(exp + jitter);
}

/**
 * Normalize server-sent event payloads for the app.
 * Expecting messages like:
 * { type: 'note.created'|'note.updated'|'note.deleted'|'tag.created'|'tag.deleted', data: {...} }
 */
function parseMessage(ev) {
  try {
    const msg = JSON.parse(ev.data);
    if (msg && typeof msg.type === "string") return msg;
    return null;
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function createRealtimeClient({ onOpen, onClose, onError, onEvent } = {}) {
  /** Create a resilient WebSocket client connected to the backend /ws endpoint.
   * - Uses environment variables to compute base URL
   * - Auto-reconnects with exponential backoff
   * - Provides cleanup to close and stop retries
   */
  let ws = null;
  let closed = false;
  let reconnectAttempt = 0;
  let reconnectTimer = null;

  const url = WS_URL;

  function cleanupTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (closed) return;
    cleanupTimer();
    const delay = backoffDelay(reconnectAttempt);
    reconnectTimer = setTimeout(() => {
      reconnectAttempt += 1;
      connect();
    }, delay);
  }

  function connect() {
    if (closed) return;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      if (onError) onError(e);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempt = 0;
      if (onOpen) onOpen();
      // Optional: subscribe/init handshake if server expects it
      try {
        ws.send(JSON.stringify({ type: "subscribe", channel: "notes" }));
      } catch {
        // ignore
      }
    };

    ws.onmessage = (ev) => {
      const msg = parseMessage(ev);
      if (!msg) return;
      if (onEvent) onEvent(msg);
    };

    ws.onerror = (err) => {
      if (onError) onError(err);
    };

    ws.onclose = () => {
      if (onClose) onClose();
      if (!closed) {
        scheduleReconnect();
      }
    };
  }

  connect();

  return {
    /** Stop the client and prevent further reconnect attempts. */
    close() {
      closed = true;
      cleanupTimer();
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close(1000, "client closing");
        } else if (ws) {
          ws.close();
        }
      } catch {
        // ignore
      }
      ws = null;
    },
    /** Send a message to the server (no-op if socket not open). */
    send(obj) {
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(obj));
        }
      } catch {
        // ignore
      }
    },
    /** For introspection/testing */
    get url() {
      return url;
    },
  };
}

export { WS_URL, HTTP_BASE };
