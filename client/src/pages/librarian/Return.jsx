import { useState, lazy, Suspense } from 'react';
import Sidebar from '../../components/Sidebar';
import { Spinner } from '../../components/Spinner';
import { useAuth }  from '../../context/AuthContext';
import { api, fmtDate } from '../../api';
import { useToast } from '../../hooks/useToast';

const QRScanner = lazy(() => import('../../components/QRScanner'));

function InfoRow({ label, val, highlight }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:12.5, color:'var(--text-3)', fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:13.5, fontWeight:600, color: highlight || 'var(--text-1)' }}>{val}</span>
    </div>
  );
}

export default function ReturnBook() {
  const { token } = useAuth();
  const { toast, ToastContainer } = useToast();
  const [bookId,   setBookId]   = useState('');
  const [issue,    setIssue]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [returned, setReturned] = useState(null);
  const [useCamera, setUseCamera] = useState(true);

  async function lookup(id) {
    if (!id?.trim()) return;
    setLoading(true);
    try {
      const res = await api('GET', `/issues/book/${id.trim().toUpperCase()}`, null, token);
      setIssue(res);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function markReturned() {
    if (!issue) return;
    setLoading(true);
    try {
      const res = await api('PUT', `/issues/${issue.id}/return`, {}, token);
      setReturned(res);
      toast(res.fine_amount > 0 ? `Returned! Fine: ₹${res.fine_amount}` : 'Book returned successfully!', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  function reset() { setIssue(null); setReturned(null); setBookId(''); }

  const now = new Date();
  const daysOver = issue ? Math.max(0, Math.ceil((now - new Date(issue.due_date)) / 86400000)) : 0;
  const fine = daysOver * 2;

  /* ── Success screen ── */
  if (returned) return (
    <div className="page-wrap">
      <Sidebar role="librarian" />
      <ToastContainer />
      <main className="main-content">
        <div style={{ maxWidth:480, margin:'64px auto', textAlign:'center' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background: returned.fine_amount > 0 ? 'var(--warning-soft)' : 'var(--success-soft)', border:`2px solid ${returned.fine_amount > 0 ? 'rgba(245,158,11,.3)' : 'rgba(16,185,129,.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 24px', boxShadow: returned.fine_amount > 0 ? '0 0 32px var(--warning-glow)' : '0 0 32px var(--success-glow)' }}>
            {returned.fine_amount > 0 ? '⚠️' : '✅'}
          </div>
          <h2 style={{ fontFamily:'var(--font-h)', fontSize:'1.8rem', marginBottom:8, letterSpacing:'-.03em' }}>
            {returned.fine_amount > 0 ? 'Returned with Fine' : 'Book Returned!'}
          </h2>
          {returned.fine_amount > 0 && (
            <div className="alert alert-warning" style={{ justifyContent:'center', marginBottom:24 }}>
              Fine collected:&nbsp;<strong style={{ fontSize:18 }}>₹{returned.fine_amount}</strong>
            </div>
          )}
          <button className="btn btn-a btn-lg" onClick={reset}>Return Another Book</button>
        </div>
      </main>
    </div>
  );

  return (
    <div className="page-wrap">
      <Sidebar role="librarian" />
      <ToastContainer />
      <main className="main-content">

        {/* Header */}
        <div className="top-header">
          <div>
            <h1 className="page-title">Return Book</h1>
            <p className="page-sub">Scan or enter the book ID — fine calculated automatically</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setUseCamera(c => !c)}>
            {useCamera ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Manual Input
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Use Camera
              </>
            )}
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22, alignItems:'start' }}>

          {/* Scan panel */}
          <div className="card">
            <h3 style={{ fontFamily:'var(--font-h)', marginBottom:16, fontSize:'1rem' }}>Scan / Enter Book ID</h3>
            {useCamera && (
              <Suspense fallback={<div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>}>
                <QRScanner onScan={id => { setBookId(id); lookup(id); }} title="Scan the book's QR label" />
              </Suspense>
            )}
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <input className="form-input" value={bookId} onChange={e => setBookId(e.target.value)}
                placeholder="Book ID (e.g. BK001)"
                onKeyDown={e => e.key === 'Enter' && lookup(bookId)}
                style={{ fontFamily:'var(--font-m)' }} />
              <button className="btn btn-a" onClick={() => lookup(bookId)} disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Find'}
              </button>
            </div>
          </div>

          {/* Issue details */}
          {issue ? (
            <div className="card">
              <h3 style={{ fontFamily:'var(--font-h)', marginBottom:16, fontSize:'1rem' }}>Issue Details</h3>
              <InfoRow label="Student"   val={`${issue.student_name} (${issue.student_branch})`} />
              <InfoRow label="Email"     val={issue.student_email} />
              <InfoRow label="Book"      val={issue.book_title} />
              <InfoRow label="Author"    val={issue.book_author} />
              <InfoRow label="Issued On" val={fmtDate(issue.issued_at)} />
              <InfoRow label="Due Date"  val={fmtDate(issue.due_date)} />

              {daysOver > 0 ? (
                <div className="alert alert-error" style={{ marginTop:16 }}>
                  <span>🚨</span>
                  <div>
                    <strong>Overdue by {daysOver} day{daysOver > 1 ? 's' : ''}</strong>
                    <div>Fine to collect: <strong>₹{fine}</strong></div>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success" style={{ marginTop:16 }}>
                  <span>✅</span> On time — no fine
                </div>
              )}

              <button className="btn btn-s btn-lg" style={{ width:'100%', marginTop:18 }} onClick={markReturned} disabled={loading}>
                {loading ? <Spinner size="sm" /> : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Mark as Returned
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:240, textAlign:'center' }}>
              <div style={{ fontSize:48, opacity:.15, marginBottom:14 }}>📖</div>
              <p style={{ color:'var(--text-4)', fontSize:13.5 }}>Scan or enter a Book ID<br />to see issue details</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
