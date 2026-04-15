import { useState, lazy, Suspense } from 'react';
import Sidebar  from '../../components/Sidebar';
import { Spinner } from '../../components/Spinner';
import { useAuth }  from '../../context/AuthContext';
import { api, fmtDate } from '../../api';
import { useToast } from '../../hooks/useToast';
import { branchBadge } from '../../components/BookCard';

const QRScanner = lazy(() => import('../../components/QRScanner'));

const STEPS = ['Scan Student', 'Scan Book', 'Confirm & Issue'];

function StepIcon({ step, index, done }) {
  if (done) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  );
  return <span>{index + 1}</span>;
}

function InfoRow({ label, val }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:12.5, color:'var(--text-3)', fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)', textAlign:'right', maxWidth:'60%', wordBreak:'break-all' }}>{val}</span>
    </div>
  );
}

export default function Scan() {
  const { token } = useAuth();
  const { toast, ToastContainer } = useToast();

  const [step,    setStep]    = useState(0);
  const [student, setStudent] = useState(null);
  const [book,    setBook]    = useState(null);
  const [manualS, setManualS] = useState('');
  const [manualB, setManualB] = useState('');
  const [loading, setLoading] = useState(false);
  const [issued,  setIssued]  = useState(null);
  const [useCamera, setUseCamera] = useState(true);

  async function lookupStudent(id) {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const res = await api('GET', `/librarian/students/${id.trim().toUpperCase()}`, null, token);
      setStudent(res); setStep(1);
      toast(`Found: ${res.name}`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function lookupBook(id) {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const res = await api('GET', `/books/${id.trim().toUpperCase()}`, null, token);
      setBook(res); setStep(2);
      toast(`Found: ${res.title}`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function confirmIssue() {
    setLoading(true);
    try {
      const res = await api('POST', '/issues', { student_id: student.id, book_id: book.id }, token);
      setIssued(res);
      toast('Book issued! Due in 14 days.', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  function reset() { setStep(0); setStudent(null); setBook(null); setIssued(null); setManualS(''); setManualB(''); }

  /* ── Success screen ── */
  if (issued) return (
    <div className="page-wrap">
      <Sidebar role="librarian" />
      <ToastContainer />
      <main className="main-content">
        <div style={{ maxWidth:500, margin:'64px auto', textAlign:'center' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--success-soft)', border:'2px solid rgba(16,185,129,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 24px', boxShadow:'0 0 32px var(--success-glow)' }}>✅</div>
          <h2 style={{ fontFamily:'var(--font-h)', fontSize:'1.8rem', marginBottom:8, letterSpacing:'-.03em' }}>Book Issued!</h2>
          <p style={{ color:'var(--text-3)', marginBottom:28 }}>Successfully issued for 14 days</p>
          <div className="card" style={{ textAlign:'left', marginBottom:28 }}>
            <InfoRow label="Student"  val={`${issued.student.name} (${issued.student.branch})`} />
            <InfoRow label="Book"     val={issued.book.title} />
            <InfoRow label="Book ID"  val={issued.book.id} />
            <InfoRow label="Due Date" val={fmtDate(issued.due_date)} />
          </div>
          <button className="btn btn-p btn-lg" onClick={reset}>Issue Another Book</button>
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
            <h1 className="page-title">Issue Book</h1>
            <p className="page-sub">Scan student card → scan book → confirm</p>
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

        {/* Step bar */}
        <div className="steps" style={{ marginBottom:32 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`} style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <div className="step-num"><StepIcon step={s} index={i} done={i < step} /></div>
                <span className="step-label">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22, alignItems:'start' }}>

          {/* Left: scan panel */}
          <div className="card">
            {step === 0 && (
              <>
                <h3 style={{ fontFamily:'var(--font-h)', marginBottom:16, fontSize:'1rem' }}>Step 1 — Student Card</h3>
                {useCamera && (
                  <Suspense fallback={<div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>}>
                    <QRScanner onScan={lookupStudent} title="Scan student's ID card QR" />
                  </Suspense>
                )}
                <div style={{ display:'flex', gap:10, marginTop:16 }}>
                  <input className="form-input" value={manualS} onChange={e => setManualS(e.target.value)}
                    placeholder="Enter Student ID (e.g. 2022CSE042)"
                    onKeyDown={e => e.key === 'Enter' && lookupStudent(manualS)}
                    style={{ fontFamily:'var(--font-m)' }} />
                  <button className="btn btn-p" onClick={() => lookupStudent(manualS)} disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Find'}
                  </button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h3 style={{ fontFamily:'var(--font-h)', marginBottom:16, fontSize:'1rem' }}>Step 2 — Book QR / ID</h3>
                {useCamera && (
                  <Suspense fallback={<div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>}>
                    <QRScanner onScan={lookupBook} title="Scan the book's QR label" />
                  </Suspense>
                )}
                <div style={{ display:'flex', gap:10, marginTop:16 }}>
                  <input className="form-input" value={manualB} onChange={e => setManualB(e.target.value)}
                    placeholder="Enter Book ID (e.g. BK001)"
                    onKeyDown={e => e.key === 'Enter' && lookupBook(manualB)}
                    style={{ fontFamily:'var(--font-m)' }} />
                  <button className="btn btn-a" onClick={() => lookupBook(manualB)} disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Find'}
                  </button>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop:12 }}
                  onClick={() => { setStep(0); setStudent(null); }}>
                  ← Back
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <h3 style={{ fontFamily:'var(--font-h)', marginBottom:16, fontSize:'1rem' }}>Step 3 — Confirm Issue</h3>
                <InfoRow label="Student"   val={`${student?.name} — ${student?.id}`} />
                <InfoRow label="Branch"    val={student?.branch} />
                <InfoRow label="Book"      val={book?.title} />
                <InfoRow label="Author"    val={book?.author} />
                <InfoRow label="Available" val={`${book?.available_copies} of ${book?.total_copies} copies`} />
                <InfoRow label="Due Date"  val={fmtDate(new Date(Date.now() + 14 * 86400000))} />
                <div style={{ display:'flex', gap:10, marginTop:18, flexWrap:'wrap' }}>
                  <button className="btn btn-s btn-lg" onClick={confirmIssue} disabled={loading} style={{ flex:1 }}>
                    {loading ? <Spinner size="sm" /> : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Confirm & Issue
                      </>
                    )}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setStep(1); setBook(null); }}>← Back</button>
                </div>
              </>
            )}
          </div>

          {/* Right: context panels */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {student ? (
              <div className="card">
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <div style={{ width:42, height:42, borderRadius:'50%', background:'var(--grad-p)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {student.name[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:'var(--text-1)' }}>{student.name}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:'var(--font-m)' }}>{student.id}</div>
                  </div>
                  {branchBadge(student.branch)}
                </div>
                <InfoRow label="Email"        val={student.email} />
                <InfoRow label="Books Issued" val={student.books?.filter(b => b.status !== 'returned').length ?? '0'} />
              </div>
            ) : (
              <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:140, textAlign:'center' }}>
                <div style={{ fontSize:36, opacity:.2, marginBottom:10 }}>🎓</div>
                <p style={{ color:'var(--text-4)', fontSize:13.5 }}>Student details appear here</p>
              </div>
            )}

            {book ? (
              <div className="card">
                <div style={{ display:'flex', gap:14, marginBottom:14, alignItems:'flex-start' }}>
                  <div style={{ width:44, height:60, borderRadius:6, background:book.cover_color || '#7c3aed', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📖</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--text-1)', marginBottom:4 }}>{book.title}</div>
                    <div style={{ fontSize:12.5, color:'var(--text-3)', marginBottom:4 }}>{book.author}</div>
                    <div style={{ fontSize:12, color:'var(--text-4)' }}>Shelf: {book.shelf_location}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <span className="badge badge-active">{book.available_copies} available</span>
                  <span className="badge badge-p">{book.category}</span>
                </div>
              </div>
            ) : (
              <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:140, textAlign:'center' }}>
                <div style={{ fontSize:36, opacity:.2, marginBottom:10 }}>📚</div>
                <p style={{ color:'var(--text-4)', fontSize:13.5 }}>Book details appear here</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
