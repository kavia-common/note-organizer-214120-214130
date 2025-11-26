import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { notesApi, tagsApi } from "../api/client";

/**
 * Store shape:
 * {
 *   notes: [],
 *   tags: [],
 *   selectedId: number|null,
 *   filters: { search, tag, pinned, archived, trashed, page, limit },
 *   loading: boolean,
 *   error: string|null
 * }
 */

const initialState = {
  notes: [],
  tags: [],
  selectedId: null,
  filters: {
    search: "",
    tag: null,
    pinned: null,
    archived: null,
    trashed: null,
    page: 1,
    limit: 50,
  },
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: action.payload ? null : state.error };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_NOTES":
      return { ...state, notes: action.payload, loading: false, error: null };
    case "APPEND_NOTE":
      return { ...state, notes: [action.payload, ...state.notes] };
    case "UPDATE_NOTE":
      return {
        ...state,
        notes: state.notes.map((n) => (n.id === action.payload.id ? action.payload : n)),
      };
    case "REMOVE_NOTE":
      return { ...state, notes: state.notes.filter((n) => n.id !== action.payload) };
    case "SET_TAGS":
      return { ...state, tags: action.payload };
    case "SET_SELECTED":
      return { ...state, selectedId: action.payload };
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload } };
    default:
      return state;
  }
}

const NotesContext = createContext(undefined);

// PUBLIC_INTERFACE
export function NotesProvider({ children, initial = {} }) {
  /** Provides global notes state and actions. */
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...initial });

  const fetchNotes = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await notesApi.list(state.filters);
      dispatch({ type: "SET_NOTES", payload: data || [] });
    } catch (e) {
      dispatch({ type: "SET_ERROR", payload: e?.message || "Failed to load notes" });
    }
  }, [state.filters]);

  const fetchTags = useCallback(async () => {
    try {
      const data = await tagsApi.list();
      dispatch({ type: "SET_TAGS", payload: data || [] });
    } catch {
      // ignore tags failure in initial load
    }
  }, []);

  // Keep list in sync with filters
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Initial tags
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const actions = useMemo(
    () => ({
      // Filters and selection
      setSearch: (search) => dispatch({ type: "SET_FILTERS", payload: { search, page: 1 } }),
      setTag: (tag) => dispatch({ type: "SET_FILTERS", payload: { tag, page: 1 } }),
      setPinned: (pinned) => dispatch({ type: "SET_FILTERS", payload: { pinned, page: 1 } }),
      setArchived: (archived) => dispatch({ type: "SET_FILTERS", payload: { archived, page: 1 } }),
      setTrashed: (trashed) => dispatch({ type: "SET_FILTERS", payload: { trashed, page: 1 } }),
      setPage: (page) => dispatch({ type: "SET_FILTERS", payload: { page } }),
      setLimit: (limit) => dispatch({ type: "SET_FILTERS", payload: { limit, page: 1 } }),
      select: (id) => dispatch({ type: "SET_SELECTED", payload: id }),

      // CRUD
      createNote: async ({ title = "Untitled", content = "", tag_ids = [] } = {}) => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
          const created = await notesApi.create({ title, content, tag_ids });
          dispatch({ type: "APPEND_NOTE", payload: created });
          dispatch({ type: "SET_SELECTED", payload: created?.id ?? null });
          dispatch({ type: "SET_LOADING", payload: false });
          return created;
        } catch (e) {
          dispatch({ type: "SET_ERROR", payload: e?.message || "Failed to create note" });
          throw e;
        }
      },

      updateNote: async (id, patch) => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
          const updated = await notesApi.update(id, patch);
          dispatch({ type: "UPDATE_NOTE", payload: updated });
          dispatch({ type: "SET_LOADING", payload: false });
          return updated;
        } catch (e) {
          dispatch({ type: "SET_ERROR", payload: e?.message || "Failed to update note" });
          throw e;
        }
      },

      deleteNote: async (id) => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
          await notesApi.remove(id);
          dispatch({ type: "REMOVE_NOTE", payload: id });
          dispatch({ type: "SET_SELECTED", payload: null });
          dispatch({ type: "SET_LOADING", payload: false });
        } catch (e) {
          dispatch({ type: "SET_ERROR", payload: e?.message || "Failed to delete note" });
          throw e;
        }
      },

      archiveNote: async (id) => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
          const updated = await notesApi.archive(id);
          dispatch({ type: "UPDATE_NOTE", payload: updated });
          dispatch({ type: "SET_LOADING", payload: false });
          return updated;
        } catch (e) {
          dispatch({ type: "SET_ERROR", payload: e?.message || "Failed to archive note" });
          throw e;
        }
      },

      restoreNote: async (id) => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
          const updated = await notesApi.restore(id);
          dispatch({ type: "UPDATE_NOTE", payload: updated });
          dispatch({ type: "SET_LOADING", payload: false });
          return updated;
        } catch (e) {
          dispatch({ type: "SET_ERROR", payload: e?.message || "Failed to restore note" });
          throw e;
        }
      },

      togglePin: async (id) => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
          const updated = await notesApi.togglePin(id);
          dispatch({ type: "UPDATE_NOTE", payload: updated });
          dispatch({ type: "SET_LOADING", payload: false });
          return updated;
        } catch (e) {
          dispatch({ type: "SET_ERROR", payload: e?.message || "Failed to toggle pin" });
          throw e;
        }
      },

      // Tags
      createTag: async (name) => {
        const created = await tagsApi.create({ name });
        dispatch({ type: "SET_TAGS", payload: [...(state.tags || []), created] });
        return created;
      },
      deleteTag: async (id) => {
        await tagsApi.remove(id);
        dispatch({ type: "SET_TAGS", payload: (state.tags || []).filter((t) => t.id !== id) });
      },

      // Refresh lists
      refresh: fetchNotes,
    }),
    [fetchNotes, state.tags]
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

// PUBLIC_INTERFACE
export function useNotesStore() {
  /** Hook to access notes store state and actions. */
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotesStore must be used within NotesProvider");
  return ctx;
}
