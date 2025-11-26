const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "");

// PUBLIC_INTERFACE
// getApiBase
/** Returns the configured API base URL for HTTP calls. */
export function getApiBase() {
  return API_BASE;
}

// PUBLIC_INTERFACE
// createNote
/** Create a new note. Body: { title: string, content?: string, tag_ids?: number[] } */
export async function createNote(body) {
  const res = await fetch(`${API_BASE}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Create note failed (${res.status}): ${text}`);
  }
  return res.json();
}

// PUBLIC_INTERFACE
// listNotes
/** List notes. Optional query params: search, tag, pinned, archived, trashed */
export async function listNotes(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  });
  const res = await fetch(`${API_BASE}/api/notes${qs.toString() ? `?${qs.toString()}` : ""}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`List notes failed (${res.status}): ${text}`);
  }
  return res.json();
}
