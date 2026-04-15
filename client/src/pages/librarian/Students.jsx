import { useState, useEffect } from 'react';
import Sidebar    from '../../components/Sidebar';
import Modal      from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { SpinnerPage } from '../../components/Spinner';
import { useAuth }  from '../../context/AuthContext';
import { api, fmtDate } from '../../api';
import { useToast } from '../../hooks/useToast';
import { branchBadge, statusBadge } from '../../components/BookCard';

const BRANCHES = ['all', 'CSE', 'EE', 'Civil'];

export default function Students() {
  const { token } = useAuth();
  const { toast, ToastContainer } = useToast();
  const [students, setStudents] = useState([]);
  const [search,   setSearch]   = useState('');
  const [branch,   setBranch]   = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail,   setDetail]   = useState(null);

  useEffect(() => { load(); }, [branch]);

  async function load() {
    setLoading(true);
    try {
      const q = branch !== 'all' ? `?branch=${branch}` : '';
      setStudents(await api('GET', `/librarian/students${q}`, null, token));
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function openStudent(s) {
    setSelected(s); setDetail(null);
    try {
      setDetail(await api('GET', `/librarian/students/${s.id}`, null, token));
    } catch (e) { toast(e.message, 'error'); }
  }

  const filtered = students.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const initials = name => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const branchBgMap = { CSE:'var(--primary-soft)', EE:'var(--warning-soft)', Civil:'var(--success-soft)' };
  const branchClrMap = { CSE:'var(--primary-lt)',  EE:'var(--warning-lt)',   Civil:'var(--success-lt)' };

  return (
    <div className="page-wrap">
      <Sidebar role="librarian" />
      <ToastContainer />

      <main className="main-content">
        {/* Header */}
        <div className="top-header">
          <div>
            <h1 className="page-title">Students</h1>
            <p className="page-sub">Branch-wise view of all registered students</p>
          </div>
          <span className="badge badge-p" style={{ fontSize:12, padding:'5px 14px' }}>
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters row */}
        <div style={{ display:'flex', gap:14, marginBottom:22, flexWrap:'wrap', alignItems:'center' }}>
          <div className="filter-tabs">
            {BRANCHES.map(b => (
              <button key={b} className={`ftab ${branch===b?'active':''}`} onClick={() => setBranch(b)}>
                {b === 'all' ? 'All Branches' : b}
              </button>
            ))}
          </div>
          <div className="search-bar" style={{ flex:1, minWidth:220 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, color:'var(--text-4)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or student ID…" />
          </div>
        </div>

        {loading ? <SpinnerPage /> : filtered.length === 0 ? (
          <EmptyState icon="👥" title="No students found" desc="Try a different search term or branch filter." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Branch</th>
                  <th>Semester</th>
                  <th>Email</th>
                  <th>Issued</th>
                  <th>Overdue</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ cursor:'pointer' }} onClick={() => openStudent(s)}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background: branchBgMap[s.branch] || 'var(--bg-elevated)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color: branchClrMap[s.branch] || 'var(--text-2)', flexShrink:0, border:'1px solid var(--border)' }}>
                          {initials(s.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:'var(--text-1)' }}>{s.name}</div>
                          <div style={{ fontSize:11.5, color:'var(--text-4)', fontFamily:'var(--font-m)', marginTop:1 }}>{s.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{branchBadge(s.branch)}</td>
                    <td>
                      <span style={{ fontSize:13, color:'var(--text-2)', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-full)', padding:'2px 10px', fontWeight:600 }}>
                        Sem {s.semester}
                      </span>
                    </td>
                    <td style={{ fontSize:12.5, color:'var(--text-3)' }}>{s.email}</td>
                    <td>
                      {s.active_books > 0
                        ? <span className="badge badge-active">{s.active_books} book{s.active_books>1?'s':''}</span>
                        : <span style={{ color:'var(--text-4)', fontSize:13 }}>—</span>}
                    </td>
                    <td>
                      {s.overdue_books > 0
                        ? <span className="badge badge-overdue">{s.overdue_books} overdue</span>
                        : <span style={{ color:'var(--text-4)', fontSize:13 }}>—</span>}
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-4)' }}>{fmtDate(s.created_at)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openStudent(s); }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Student detail modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title={selected?.name ?? ''} maxWidth={640}>
        {!detail ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20, padding:'16px', background:'var(--bg-elevated)', borderRadius:'var(--r-lg)', border:'1px solid var(--border)' }}>
              <div style={{ width:50, height:50, borderRadius:'50%', background: branchBgMap[detail.branch] || 'var(--primary-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color: branchClrMap[detail.branch] || 'var(--primary-lt)', flexShrink:0, border:'2px solid var(--border)' }}>
                {initials(detail.name)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:16, color:'var(--text-1)', marginBottom:4 }}>{detail.name}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {branchBadge(detail.branch)}
                  <span className="badge badge-p">Sem {detail.semester}</span>
                  {detail.books.filter(b => b.status !== 'returned').length > 0 && (
                    <span className="badge badge-active">{detail.books.filter(b => b.status !== 'returned').length} active</span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20, padding:'12px 16px', background:'var(--bg-elevated)', borderRadius:'var(--r-lg)', border:'1px solid var(--border)' }}>
              {[
                { icon:'✉️', val:detail.email },
                detail.phone && { icon:'📞', val:detail.phone },
                { icon:'🗓', val:`Joined ${fmtDate(detail.created_at)}` },
              ].filter(Boolean).map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13.5, color:'var(--text-2)' }}>
                  <span style={{ fontSize:14 }}>{r.icon}</span> {r.val}
                </div>
              ))}
            </div>

            {/* Book history */}
            <h4 style={{ fontFamily:'var(--font-h)', marginBottom:12, fontSize:'0.95rem', letterSpacing:'-.01em' }}>
              Book History <span style={{ color:'var(--text-4)', fontWeight:400 }}>({detail.books.length})</span>
            </h4>
            {detail.books.length === 0 ? (
              <p style={{ color:'var(--text-3)', fontSize:14, textAlign:'center', padding:'20px 0' }}>No books issued yet.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
                {detail.books.map(b => (
                  <div key={b.id} style={{ background:'var(--bg-elevated)', borderRadius:'var(--r-lg)', padding:'12px 14px', display:'flex', gap:12, alignItems:'center', border:'1px solid var(--border)' }}>
                    <div style={{ width:32, height:44, borderRadius:5, background:b.cover_color ?? '#7c3aed', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.title}</div>
                      <div style={{ fontSize:12, color:'var(--text-3)' }}>{b.author}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {statusBadge(b.status)}
                      <div style={{ fontSize:11, color:'var(--text-4)', marginTop:4 }}>Due {fmtDate(b.due_date)}</div>
                      {b.fine_amount > 0 && <div style={{ fontSize:11, color:'var(--danger-lt)', fontWeight:600 }}>₹{b.fine_amount}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
