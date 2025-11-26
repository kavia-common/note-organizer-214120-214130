import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import './theme.css';
import { NotesProvider, useNotesStore } from './state/useNotesStore';

const categories = [
  { key: 'all', label: 'All Notes' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'archived', label: 'Archived' },
  { key: 'trash', label: 'Trash' },
];

// PUBLIC_INTERFACE
function Navbar({ onNewNote, onToggleTheme }) {
  /** Top navigation bar with brand, quick actions, and theme toggle. */
  return (
    <nav className="navbar" aria-label="Top Navigation">
      <div className="brand">
        <div className="brand-badge" aria-hidden="true" />
        <div className="brand-title">
          Ocean <span className="brand-accent">Notes</span>
        </div>
      </div>
      <div className="nav-actions">
        <button className="new-note-btn" onClick={onNewNote} aria-label="Create new note">＋ New</button>
        <button className="theme-switch" onClick={onToggleTheme} aria-label="Toggle theme">Theme</button>
      </div>
    </nav>
  );
}

// PUBLIC_INTERFACE
function Sidebar() {
  /** Sidebar with categories and tags. */
  const location = useLocation();

  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sidebar-section">
        <h4 className="sidebar-title">Browse</h4>
        <ul className="sidebar-list">
          {categories.map(c => {
            const path = c.key === 'all' ? '/' : `/${c.key}`;
            const active = location.pathname === path;
            return (
              <li key={c.key}>
                <Link className={`sidebar-item ${active ? 'active' : ''}`} to={path}>
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="sidebar-section">
        <h4 className="sidebar-title">Tags</h4>
        <ul className="sidebar-list">
          {['work', 'personal', 'meetings'].map(t => (
            <li key={t}>
              <Link className="sidebar-item" to={`/?tag=${encodeURIComponent(t)}`}>#{t}</Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

// PUBLIC_INTERFACE
function SearchBar({ value, onChange }) {
  /** Search input used to filter notes by title/content. */
  return (
    <div className="searchbar" role="search">
      <input
        className="search-input"
        placeholder="Search notes..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search notes"
      />
    </div>
  );
}

// PUBLIC_INTERFACE
function NoteList({ notes, activeId, onSelect }) {
  /** List of notes on the left of the editor. */
  return (
    <div className="note-list" role="list" aria-label="Notes list">
      {notes.map(n => (
        <article
          key={n.id}
          className={`note-card ${activeId === n.id ? 'active' : ''}`}
          onClick={() => onSelect(n.id)}
          role="listitem"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(n.id)}
        >
          <h3 className="note-title">{n.title?.replace(/^\[PIN\]\s*/,'') ?? ''}</h3>
          <div className="note-meta">
            <span>{n.updated_at ? new Date(n.updated_at).toLocaleString() : ''}</span>
            <span className="tag-pill">{Array.isArray(n.tags) && n.tags.length > 0 ? (n.tags[0].name || n.tags[0]) : 'note'}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

// PUBLIC_INTERFACE
function NoteEditor({ note, onChange, onSave, onDelete }) {
  /** Simple title + multiline content editor with actions. */
  if (!note) {
    return (
      <div className="editor" aria-live="polite">
        <div className="editor-surface">
          Select a note to start editing or create a new one.
        </div>
      </div>
    );
  }

  return (
    <div className="editor" aria-label="Note editor">
      <div className="editor-surface">
        <input
          className="editor-title"
          placeholder="Note title"
          value={note.title || ''}
          onChange={(e) => onChange({ ...note, title: e.target.value })}
        />
        <textarea
          className="editor-content"
          placeholder="Write your note..."
          value={note.content || ''}
          onChange={(e) => onChange({ ...note, content: e.target.value })}
          rows={14}
        />
        <div className="editor-actions">
          <button className="btn primary" onClick={onSave}>Save</button>
          <button className="btn secondary" onClick={() => onChange({ ...note, content: '' })}>Clear</button>
          <button className="btn danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function NotesScreenInner() {
  /** Main notes screen with responsive layout (navbar + sidebar + main), backed by store. */
  const [theme, setTheme] = useState('light');
  const { state, actions } = useNotesStore();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  // Sync filters with route (pinned/archived/trashed) and tag/search query
  useEffect(() => {
    const params = new URLSearchParams(search);
    const tag = params.get('tag');
    if (pathname === '/pinned') {
      actions.setPinned(true);
      actions.setArchived(null);
      actions.setTrashed(null);
    } else if (pathname === '/archived') {
      actions.setPinned(null);
      actions.setArchived(true);
      actions.setTrashed(null);
    } else if (pathname === '/trash') {
      actions.setPinned(null);
      actions.setArchived(null);
      actions.setTrashed(true);
    } else {
      actions.setPinned(null);
      actions.setArchived(null);
      actions.setTrashed(null);
    }
    actions.setTag(tag);
  }, [pathname, search, actions]);

  const activeNote = useMemo(
    () => state.notes.find((n) => n.id === state.selectedId) || null,
    [state.notes, state.selectedId]
  );

  const handleNewNote = async () => {
    const created = await actions.createNote({ title: 'Untitled', content: '' });
    if (pathname !== '/') navigate('/');
    actions.select(created?.id ?? null);
  };

  const handleChangeNote = (updated) => {
    // Optimistic local update; persisted on Save
    actions.select(updated.id);
  };

  const handleSave = async () => {
    const note = state.notes.find((n) => n.id === state.selectedId);
    if (!note) return;
    await actions.updateNote(note.id, { title: note.title, content: note.content });
    await actions.refresh();
  };

  const handleDelete = async () => {
    const note = state.notes.find((n) => n.id === state.selectedId);
    if (!note) return;
    await actions.deleteNote(note.id);
  };

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.style.setProperty('--background', next === 'dark' ? '#0b1220' : '#f9fafb');
    document.documentElement.style.setProperty('--surface', next === 'dark' ? '#0f172a' : '#ffffff');
    document.documentElement.style.setProperty('--text', next === 'dark' ? '#e5e7eb' : '#111827');
    document.documentElement.style.setProperty('--border', next === 'dark' ? '#1f2937' : '#E5E7EB');
  };

  // Derived list here is direct from server based on filters; local search value is in filters.search
  const list = state.notes;

  return (
    <div className="app-shell">
      <Navbar onNewNote={handleNewNote} onToggleTheme={handleToggleTheme} />
      <div className="app-body">
        <Sidebar />
        <main className="main">
          <div className="toolbar">
            <SearchBar value={state.filters.search || ''} onChange={actions.setSearch} />
          </div>
          <section className="content">
            <NoteList notes={list} activeId={state.selectedId} onSelect={actions.select} />
            <NoteEditor
              note={activeNote}
              onChange={(n) => actions.updateNote(n.id, { title: n.title, content: n.content })}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          </section>
        </main>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function NotesScreen() {
  return <NotesScreenInner />;
}

// PUBLIC_INTERFACE
function App() {
  /** App entry with routing and global store provider. */
  return (
    <NotesProvider>
      <Router>
        <Routes>
          <Route path="/" element={<NotesScreen />} />
          <Route path="/pinned" element={<NotesScreen />} />
          <Route path="/archived" element={<NotesScreen />} />
          <Route path="/trash" element={<NotesScreen />} />
        </Routes>
      </Router>
    </NotesProvider>
  );
}

export default App;
