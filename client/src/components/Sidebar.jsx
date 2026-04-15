import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/* ── SVG Icon Components ── */
function Icon({ d, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink:0 }}>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  dashboard:  "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  scan:       "M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M8 12h.01M12 12h.01M16 12h.01",
  return:     "M3 12h18M3 12l4-4m-4 4l4 4",
  students:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z",
  books:      "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 17V5a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H6.5",
  mybooks:    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  idcard:     "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0M9 14h6M9 17h3",
  logout:     "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
};

function NavIcon({ name }) {
  return <Icon d={ICONS[name] || ICONS.dashboard} size={17} />;
}

export default function Sidebar({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const studentLinks = [
    { to: '/student/dashboard', icon: 'mybooks', label: 'My Books' },
    { to: '/student/id-card',   icon: 'idcard',  label: 'ID Card' },
  ];

  const libLinks = [
    { to: '/librarian/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/librarian/scan',      icon: 'scan',      label: 'Issue Book' },
    { to: '/librarian/return',    icon: 'return',    label: 'Return Book' },
    { to: '/librarian/students',  icon: 'students',  label: 'Students' },
    { to: '/librarian/books',     icon: 'books',     label: 'Books' },
  ];

  const links = role === 'librarian' ? libLinks : studentLinks;

  function handleLogout() {
    logout();
    navigate('/');
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
    : '?';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Hamburger — mobile */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:'none', position:'fixed', top:14, left:14, zIndex:300,
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'var(--r-md)', padding:'8px 10px', cursor:'pointer',
          color:'var(--text-1)', lineHeight:1,
        }}
        className="menu-toggle"
        id="menu-toggle"
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📚</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">GHEC Library</div>
            <div className="sidebar-logo-sub">{role === 'librarian' ? 'Librarian Portal' : 'Student Portal'}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <p className="nav-section">Menu</p>
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon"><NavIcon name={l.icon} /></span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* User chip */}
        <div className="sidebar-footer">
          <div className="user-chip" onClick={handleLogout} title="Click to logout" role="button">
            <div className="user-chip-av">{initials}</div>
            <div style={{ minWidth:0, flex:1 }}>
              <div className="user-chip-name">{user?.name || user?.email}</div>
              <div className="user-chip-role">
                {role === 'student'
                  ? `${user?.branch} • Sem ${user?.semester ?? '?'}`
                  : 'Librarian'}
              </div>
            </div>
            <span style={{ color:'var(--text-4)', flexShrink:0 }}>
              <Icon d={ICONS.logout} size={15} />
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
