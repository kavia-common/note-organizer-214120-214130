import React, { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import './theme.css';

/**
 * Simple local data mocks until backend wiring.
 */
const mockNotes = [
  { id: 1, title: 'Project kickoff notes', content: 'Define scope, stakeholders, and timeline.', tags: ['work'], updated_at: new Date().toISOString() },
  { id: 2, title: 'Grocery list', content: 'Milk, eggs, bread, coffee.', tags: ['personal'], updated_at: new Date().toISOString() },
  { id: 3, title: '[PIN] Meeting summary', content: 'Action items: A, B, C.', tags: ['work','meetings'], updated_at: new Date().toISOString() },
];

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
          <h3 className="note-title">{n.title.replace(/^\[PIN\]\s*/,'')}</h3>
          <div className="note-meta">
            <span>{new Date(n.updated_at).toLocaleString()}</span>
            <span className="tag-pill">{n.tags?.[0] ?? 'note'}</span>
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
          value={note.title}
          onChange={(e) => onChange({ ...note, title: e.target.value })}
        />
        <textarea
          className="editor-content"
          placeholder="Write your note..."
          value={note.content}
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
function NotesScreen() {
  /** Main notes screen with responsive layout (navbar + sidebar + main). */
  const [theme, setTheme] = useState('light');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState(mockNotes);
  const [activeId, setActiveId] = useState(notes[0]?.id || null);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const currentTag = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get('tag');
  }, [search]);

  const filtered = useMemo(() => {
    let res = [...notes];
    if (pathname === '/pinned') res = res.filter(n => n.title.startsWith('[PIN]'));
    if (pathname === '/archived') res = res.filter(n => n.title.startsWith('[ARCH]'));
    if (pathname === '/trash') res = res.filter(n => n.title.startsWith('[TRASH]'));
    if (currentTag) res = res.filter(n => n.tags?.includes(currentTag));
    if (query.trim()) {
      const q = query.toLowerCase();
      res = res.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }
    return res;
  }, [notes, pathname, currentTag, query]);

  const activeNote = useMemo(() => notes.find(n => n.id === activeId) || null, [notes, activeId]);

  const handleNewNote = () => {
    const id = Math.max(0, ...notes.map(n => n.id)) + 1;
    const newNote = { id, title: 'Untitled', content: '', tags: [], updated_at: new Date().toISOString() };
    setNotes([newNote, ...notes]);
    setActiveId(id);
    if (pathname !== '/') navigate('/');
  };

  const handleChangeNote = (updated) => {
    setNotes(prev => prev.map(n => n.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : n));
  };

  const handleSave = () => {
    // Placeholder for backend integration
  };

  const handleDelete = () => {
    if (!activeNote) return;
    setNotes(prev => prev.filter(n => n.id !== activeNote.id));
    setActiveId(null);
  };

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.style.setProperty('--background', next === 'dark' ? '#0b1220' : '#f9fafb');
    document.documentElement.style.setProperty('--surface', next === 'dark' ? '#0f172a' : '#ffffff');
    document.documentElement.style.setProperty('--text', next === 'dark' ? '#e5e7eb' : '#111827');
    document.documentElement.style.setProperty('--border', next === 'dark' ? '#1f2937' : '#E5E7EB');
  };

  return (
    <div className="app-shell">
      <Navbar onNewNote={handleNewNote} onToggleTheme={handleToggleTheme} />
      <div className="app-body">
        <Sidebar />
        <main className="main">
          <div className="toolbar">
            <SearchBar value={query} onChange={setQuery} />
          </div>
          <section className="content">
            <NoteList notes={filtered} activeId={activeId} onSelect={setActiveId} />
            <NoteEditor note={activeNote} onChange={handleChangeNote} onSave={handleSave} onDelete={handleDelete} />
          </section>
        </main>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** App entry with optional routing; single Notes screen routes. */
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NotesScreen />} />
        <Route path="/pinned" element={<NotesScreen />} />
        <Route path="/archived" element={<NotesScreen />} />
        <Route path="/trash" element={<NotesScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
