import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar      from '../../components/Sidebar';
import BookCard     from '../../components/BookCard';
import EmptyState   from '../../components/EmptyState';
import { SpinnerPage } from '../../components/Spinner';
import { useAuth }  from '../../context/AuthContext';
import { api, fmtDate } from '../../api';
import { useToast } from '../../hooks/useToast';

export default function StudentDashboard() {
  const { token, user } = useAuth();
  const { toast, ToastContainer } = useToast();
  const [books,   setBooks]   = useState([]);
  const [notifs,  setNotifs]  = useState([]);
  const [tab,     setTab]     = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [b, n] = await Promise.all([
          api('GET', '/students/me/books', null, token),
          api('GET', '/students/me/notifications', null, token),
        ]);
        setBooks(b); setNotifs(n);
      } catch (e) { toast(e.message, 'error'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const active   = books.filter(b => b.status !== 'returned');
  const history  = books.filter(b => b.status === 'returned');
  const overdue  = active.filter(b => b.status === 'overdue');
  const totalFine = active.reduce((a, b) => a + (b.fine_amount || 0), 0);
  const displayed = tab === 'active' ? active : history;

  if (loading) return (
    <div className="page-wrap">
      <Sidebar role="student" />
      <div className="main-content"><SpinnerPage /></div>
    </div>
  );

  return (
    <div className="page-wrap">
      <Sidebar role="student" />
      <ToastContainer />

      <main className="main-content">
        {/* Header */}
        <div className="top-header">
          <div>
            <h1 className="page-title">My Library</h1>
            <p className="page-sub">Welcome back, {user?.name?.split(' ')[0]}  •  {user?.branch} · Sem {user?.semester}</p>
          </div>
          <Link to="/student/id-card" className="btn btn-outline">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0M9 14h6"/></svg>
            My ID Card
          </Link>
        </div>

        {/* Overdue alerts */}
        {notifs.length > 0 && (
          <div style={{ marginBottom:24, display:'flex', flexDirection:'column', gap:8 }}>
            {notifs.map(n => (
              <div key={n.id} className={`notif-item ${n.priority}`}>
                <span className="notif-icon">{n.type === 'overdue' ? '🚨' : '⚠️'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text-1)' }}>{n.message}</div>
                  <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Due: {fmtDate(n.due_date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stat cards */}
        <div className="stats-grid stagger" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', marginBottom:28 }}>
          <MiniStat icon="📖" val={active.length}  label="Currently Borrowed" />
          <MiniStat icon="🚨" val={overdue.length} label="Overdue Books"       variant="danger" />
          <MiniStat icon="✅" val={history.length} label="Books Returned"      variant="success" />
          <MiniStat icon="💰" val={`₹${totalFine}`} label="Total Fine"        variant={overdue.length > 0 ? 'danger' : ''} />
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div className="filter-tabs">
            <button className={`ftab ${tab==='active'?'active':''}`}  onClick={() => setTab('active')}>
              Currently Issued ({active.length})
            </button>
            <button className={`ftab ${tab==='history'?'active':''}`} onClick={() => setTab('history')}>
              History ({history.length})
            </button>
          </div>
          {tab === 'active' && active.length > 0 && (
            <span style={{ fontSize:12.5, color:'var(--text-4)' }}>Loan period: 14 days • ₹2/day fine</span>
          )}
        </div>

        {/* Book list */}
        {displayed.length === 0 ? (
          <EmptyState
            icon={tab === 'active' ? '📭' : '📋'}
            title={tab === 'active' ? 'No books currently issued' : 'No history yet'}
            desc={tab === 'active' ? 'Visit the library and ask the librarian to issue a book.' : 'Books you return will appear here.'}
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {displayed.map(b => <BookCard key={b.id} book={b} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function MiniStat({ icon, val, label, variant = '' }) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-icon-wrap">
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{val}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
