import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar   from '../../components/Sidebar';
import StatCard  from '../../components/StatCard';
import { SpinnerPage } from '../../components/Spinner';
import { useAuth }  from '../../context/AuthContext';
import { api, fmtDT } from '../../api';
import { useToast } from '../../hooks/useToast';

export default function LibrarianDashboard() {
  const { token } = useAuth();
  const { toast, ToastContainer } = useToast();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('GET', '/librarian/stats', null, token)
      .then(setStats)
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-wrap">
      <Sidebar role="librarian" />
      <div className="main-content"><SpinnerPage /></div>
    </div>
  );

  const branchColors = {
    CSE:   { color:'var(--primary-lt)',  bg:'var(--primary-soft)' },
    EE:    { color:'var(--warning-lt)',  bg:'var(--warning-soft)' },
    Civil: { color:'var(--success-lt)', bg:'var(--success-soft)' },
  };

  const today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});

  return (
    <div className="page-wrap">
      <Sidebar role="librarian" />
      <ToastContainer />

      <main className="main-content">
        {/* Header */}
        <div className="top-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">{today}</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Link to="/librarian/scan"   className="btn btn-p">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M8 12h.01M12 12h.01M16 12h.01"/></svg>
              Issue Book
            </Link>
            <Link to="/librarian/return" className="btn btn-ghost">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 12l4-4m-4 4l4 4"/></svg>
              Return
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid stagger">
          {[
            { icon:'📚', value:stats.totalBooks,    label:'Total Books',    variant:'' },
            { icon:'👥', value:stats.totalStudents, label:'Students',       variant:'accent' },
            { icon:'📤', value:stats.issuedToday,   label:'Issued Today',   variant:'success' },
            { icon:'📋', value:stats.activeIssues,  label:'Books Out',      variant:'warn' },
            { icon:'🚨', value:stats.overdueCount,  label:'Overdue',        variant:'danger' },
          ].map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Grid row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

          {/* Branch overview */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">Branch Overview</h3>
              <Link to="/librarian/students" className="btn btn-ghost btn-sm">View All →</Link>
            </div>
            {stats.branchStats.length === 0
              ? <p style={{ color:'var(--text-4)', fontSize:13.5 }}>No branches with students yet.</p>
              : stats.branchStats.map(b => {
                  const c = branchColors[b.branch] ?? { color:'var(--text-1)', bg:'var(--bg-elevated)' };
                  const pct = b.students > 0 ? Math.round((b.active_issues / b.students) * 100) : 0;
                  return (
                    <div key={b.branch} style={{ marginBottom:18 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:c.color, display:'inline-block', boxShadow:`0 0 8px ${c.bg}` }} />
                          <span style={{ fontWeight:700, color:c.color, fontSize:14 }}>{b.branch}</span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--text-3)' }}>
                          <strong style={{ color:'var(--text-2)' }}>{b.active_issues}</strong> issued / {b.students} students
                        </div>
                      </div>
                      <div className="prog">
                        <div className="prog-fill safe" style={{ width:`${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            }
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">Quick Actions</h3>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { to:'/librarian/scan',     label:'Scan & Issue Book',    cls:'btn-p',     icon:'M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M8 12h.01M12 12h.01M16 12h.01' },
                { to:'/librarian/return',   label:'Mark Book Returned',   cls:'btn-a',     icon:'M3 12h18M3 12l4-4m-4 4l4 4' },
                { to:'/librarian/students', label:'Browse Students',       cls:'btn-ghost', icon:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z' },
                { to:'/librarian/books',    label:'Manage Books',          cls:'btn-ghost', icon:'M4 19.5A2.5 2.5 0 016.5 17H20M6.5 17H4V5a2 2 0 012-2h14a2 2 0 012 2v12' },
              ].map(a => (
                <Link key={a.to} to={a.to} className={`btn ${a.cls}`} style={{ justifyContent:'flex-start', gap:10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={a.icon}/></svg>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Recent Activity</h3>
            <span style={{ fontSize:12, color:'var(--text-4)', fontWeight:500 }}>Last 10 transactions</span>
          </div>
          {stats.recentActivity.length === 0
            ? <p style={{ color:'var(--text-4)', fontSize:13.5, textAlign:'center', padding:'28px 0' }}>No activity yet — issue a book to get started.</p>
            : (
              <div className="activity-list">
                {stats.recentActivity.map(a => (
                  <div key={a.id} className="activity-item">
                    <div className="activity-timeline">
                      <div className={`activity-dot ${a.returned_at ? 'returned' : a.status === 'overdue' ? 'overdue' : 'issued'}`} />
                    </div>
                    <div className="activity-text">
                      <strong>{a.student_name}</strong>
                      <span style={{ fontSize:11.5, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'1px 7px', margin:'0 6px', color:'var(--text-3)' }}>{a.student_branch}</span>
                      {a.returned_at ? 'returned' : 'borrowed'}{' '}
                      <strong>"{a.book_title}"</strong>
                    </div>
                    <div className="activity-time">{fmtDT(a.returned_at || a.issued_at)}</div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </main>
    </div>
  );
}
