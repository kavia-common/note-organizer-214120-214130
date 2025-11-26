const BASE_URL =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:3001";

/**
 * Build a query string from a params object, skipping null/undefined.
 */
function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    // Convert booleans to string "true"/"false"
    if (typeof v === "boolean") {
      q.set(k, v ? "true" : "false");
    } else {
      q.set(k, String(v));
    }
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Handle fetch responses, throwing on non-2xx ranges.
 */
async function handle(res) {
  if (!res.ok) {
    let detail;
    try {
      detail = await res.json();
    } catch {
      detail = { message: res.statusText };
    }
    const err = new Error(detail?.message || res.statusText || "Request failed");
    err.status = res.status;
    err.details = detail;
    throw err;
  }
  // Handle 204/empty
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

// PUBLIC_INTERFACE
export const notesApi = {
  /** List notes with optional filters and pagination. */
  async list({ search, tag, pinned, archived, trashed, page, limit } = {}) {
    const params = { search, tag, pinned, archived, trashed, page, limit };
    const res = await fetch(`${BASE_URL}/api/notes${toQuery(params)}`);
    return handle(res);
  },
  /** Get a note by ID. */
  async get(noteId) {
    const res = await fetch(`${BASE_URL}/api/notes/${noteId}`);
    return handle(res);
  },
  /** Create a note. body: { title, content?, tag_ids? } */
  async create(body) {
    const res = await fetch(`${BASE_URL}/api/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handle(res);
  },
  /** Update a note. body: { title?, content?, tag_ids? } */
  async update(noteId, body) {
    const res = await fetch(`${BASE_URL}/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handle(res);
  },
  /** Soft delete a note. */
  async remove(noteId) {
    const res = await fetch(`${BASE_URL}/api/notes/${noteId}`, {
      method: "DELETE",
    });
    return handle(res);
  },
  /** Archive a note. */
  async archive(noteId) {
    const res = await fetch(`${BASE_URL}/api/notes/${noteId}/archive`, {
      method: "POST",
    });
    return handle(res);
  },
  /** Restore a note. */
  async restore(noteId) {
    const res = await fetch(`${BASE_URL}/api/notes/${noteId}/restore`, {
      method: "POST",
    });
    return handle(res);
  },
  /** Toggle pin on a note. */
  async togglePin(noteId) {
    const res = await fetch(`${BASE_URL}/api/notes/${noteId}/pin`, {
      method: "POST",
    });
    return handle(res);
  },
};

// PUBLIC_INTERFACE
export const tagsApi = {
  /** List tags. */
  async list() {
    const res = await fetch(`${BASE_URL}/api/tags`);
    return handle(res);
  },
  /** Create tag. body: { name } */
  async create(body) {
    const res = await fetch(`${BASE_URL}/api/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handle(res);
  },
  /** Delete tag. */
  async remove(tagId) {
    const res = await fetch(`${BASE_URL}/api/tags/${tagId}`, {
      method: "DELETE",
    });
    return handle(res);
  },
};

export { BASE_URL };
