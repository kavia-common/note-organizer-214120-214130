//
// PUBLIC_INTERFACE
// getWebSocketUrl
/** Returns the WebSocket URL derived from REACT_APP_API_URL, unless REACT_APP_WS_URL is explicitly set. */
export function getWebSocketUrl() {
  const explicit = process.env.REACT_APP_WS_URL;
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }
  const apiBase = (process.env.REACT_APP_API_URL || "").trim() || "http://localhost:3001";
  try {
    const u = new URL(apiBase);
    const wsProtocol = u.protocol === "https:" ? "wss:" : "ws:";
    // Default WS path is /ws on the same host/port
    return `${wsProtocol}//${u.host}/ws`;
  } catch (e) {
    // Fallback sensible default
    return "ws://localhost:3001/ws";
  }
}
