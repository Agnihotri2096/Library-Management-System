import { useState, useEffect, lazy, Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Sidebar    from '../../components/Sidebar';
import Modal      from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { SpinnerPage, Spinner } from '../../components/Spinner';
import { useAuth }  from '../../context/AuthContext';
import { api } from '../../api';
import { useToast } from '../../hooks/useToast';

const ISBNScanner = lazy(() => import('../../components/ISBNScanner'));

const CATS   = ['All', 'CSE', 'EE', 'Civil', 'General'];
const COLORS = ['#7c3aed','#a855f7','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#0284c7'];
const empty  = { id:'', title:'', author:'', isbn:'', total_copies:1, shelf_location:'', category:'General', cover_color:'#7c3aed' };

const catBadgeMap = { CSE:'badge-cse', EE:'badge-ee', Civil:'badge-civil', General:'badge-p' };

/* ── Google Books API lookup ── */
async function fetchBookByISBN(isbn) {
  const clean = isbn.replace(/[^0-9X]/gi, '');
  const res   = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`);
  const data  = await res.json();
  if (!data.items?.length) return null;
  const info  = data.items[0].volumeInfo;

  // Guess category from subjects
  const subjects = (info.categories ?? []).join(' ').toLowerCase();
  let category = 'General';
  if (subjects.includes('computer') || subjects.includes('software') || subjects.includes('programming')) category = 'CSE';
  else if (subjects.includes('electrical') || subjects.includes('electronics') || subjects.includes('circuit')) category = 'EE';
  else if (subjects.includes('civil') || subjects.includes('structural') || subjects.includes('construction')) category = 'Civil';

  return {
    title:  info.title ?? '',
    author: (info.authors ?? []).join(', '),
    isbn:   clean,
    category,
  };
}

export default function Books() {
  const { token } = useAuth();
  const { toast, ToastContainer } = useToast();
  const [books,    setBooks]    = useState([]);
  const [search,   setSearch]   = useState('');
  const [cat,      setCat]      = useState('All');
  const [loading,  setLoading]  = useState(true);
  const [addOpen,  setAddOpen]  = useState(false);
  const [qrBook,   setQrBook]   = useState(null);
  const [form,     setForm]     = useState(empty);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  // ISBN / barcode lookup state
  // scanMode: null | 'camera' | 'manual'
  const [scanMode,     setScanMode]     = useState(null);
  const [showScanner,  setShowScanner]  = useState(false);
  const [fetchingISBN, setFetchingISBN] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setBooks(await api('GET', '/books', null, token)); }
    catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  /* Called when ISBNScanner detects a barcode */
  async function handleISBNScan(code) {
    setShowScanner(false);
    setFetchingISBN(true);
    toast('Barcode detected — looking up book…', 'info');
    try {
      const info = await fetchBookByISBN(code);
      if (!info) {
        toast('Book not found in Google Books. Fill in manually.', 'warning');
        setForm(f => ({ ...f, isbn: code }));
      } else {
        setForm(f => ({ ...f, ...info }));
        toast(`Found: "${info.title}"`, 'success');
      }
    } catch {
      toast('Lookup failed — please fill in manually.', 'error');
      setForm(f => ({ ...f, isbn: code }));
    } finally {
      setFetchingISBN(false);
    }
  }

  async function addBook(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api('POST', '/books', { ...form, total_copies: parseInt(form.total_copies) }, token);
      toast(`"${form.title}" added!`, 'success');
      setForm(empty); setAddOpen(false); setShowScanner(false); load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function deleteBook(id) {
    if (!confirm('Delete this book? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api('DELETE', `/books/${id}`, null, token);
      toast('Book deleted', 'success');
      setBooks(b => b.filter(x => x.id !== id));
    } catch (e) { toast(e.message, 'error'); }
    finally { setDeleting(null); }
  }

  const filtered = books.filter(b => {
    const matchCat    = cat === 'All' || b.category === cat;
    const q           = search.toLowerCase();
    const matchSearch = !search ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.isbn?.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const totalAvail = books.reduce((a, b) => a + b.available_copies, 0);

  return (
    <div className="page-wrap">
      <Sidebar role="librarian" />
      <ToastContainer />

      <main className="main-content">
        {/* Header */}
        <div className="top-header">
          <div>
            <h1 className="page-title">Books Inventory</h1>
            <p className="page-sub">{books.length} titles · {totalAvail} copies available</p>
          </div>
          <button className="btn btn-p" onClick={() => { setAddOpen(true); setShowScanner(false); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Book
          </button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:14, marginBottom:22, flexWrap:'wrap', alignItems:'center' }}>
          <div className="filter-tabs">
            {CATS.map(c => (
              <button key={c} className={`ftab ${cat===c?'active':''}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <div className="search-bar" style={{ flex:1, minWidth:220 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, color:'var(--text-4)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, ISBN, Book ID…" />
            {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:16 }}>×</button>}
          </div>
        </div>

        {/* Table */}
        {loading ? <SpinnerPage /> : filtered.length === 0 ? (
          <EmptyState icon="📖" title="No books found"
            desc={search ? `No results for "${search}"` : 'Add your first book to get started.'}
            action={<button className="btn btn-p" onClick={() => setAddOpen(true)}>+ Add Book</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book</th><th>ID / ISBN</th><th>Category</th>
                  <th>Shelf</th><th>Availability</th><th>QR</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const pct     = b.total_copies > 0 ? (b.available_copies / b.total_copies) * 100 : 0;
                  const fillCls = b.available_copies === 0 ? 'danger' : pct < 50 ? 'warn' : 'safe';
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                          <div style={{ width:30, height:42, borderRadius:'4px 6px 6px 4px', background:b.cover_color||'#7c3aed', flexShrink:0, position:'relative', overflow:'hidden', boxShadow:'2px 2px 6px rgba(0,0,0,.4)' }}>
                            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:'rgba(0,0,0,.25)' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight:600, color:'var(--text-1)', fontSize:13.5 }}>{b.title}</div>
                            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>{b.author}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily:'var(--font-m)', fontSize:12, color:'var(--text-1)', fontWeight:600 }}>{b.id}</div>
                        {b.isbn && <div style={{ fontFamily:'var(--font-m)', fontSize:11, color:'var(--text-4)', marginTop:2 }}>{b.isbn}</div>}
                      </td>
                      <td><span className={`badge ${catBadgeMap[b.category]??'badge-p'}`}>{b.category}</span></td>
                      <td>
                        <span style={{ fontFamily:'var(--font-m)', fontSize:12.5, color:'var(--text-2)', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'2px 8px' }}>
                          {b.shelf_location||'—'}
                        </span>
                      </td>
                      <td style={{ minWidth:100 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                          <span style={{ fontWeight:700, fontSize:14, color:b.available_copies===0?'var(--danger-lt)':'var(--success-lt)' }}>{b.available_copies}</span>
                          <span style={{ color:'var(--text-4)', fontSize:12 }}>/ {b.total_copies}</span>
                        </div>
                        <div className="prog" style={{ width:64 }}>
                          <div className={`prog-fill ${fillCls}`} style={{ width:`${pct}%` }} />
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setQrBook(b)} title="View QR label">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                            <path d="M14 14h.01M14 17h3M17 14v3M20 17v.01M20 14v.01"/>
                          </svg>
                          QR
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteBook(b.id)} disabled={deleting===b.id}
                          style={{ color:'var(--danger-lt)', borderColor:'rgba(239,68,68,.2)' }}>
                          {deleting===b.id ? <Spinner size="sm" /> : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Add Book Modal ── */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setScanMode(null); setShowScanner(false); }} title="Add New Book" maxWidth={540}>

        {/* Step 1 — choose lookup method */}
        {!scanMode && !fetchingISBN && (
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:12.5, color:'var(--text-3)', marginBottom:10 }}>Auto-fill title &amp; author from Google Books — optional, or fill manually below.</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {/* Camera option */}
              <button type="button"
                onClick={() => { setScanMode('camera'); setShowScanner(true); }}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 12px', background:'rgba(14,165,233,.07)', border:'2px solid rgba(14,165,233,.25)', borderRadius:'var(--r-lg)', cursor:'pointer', transition:'all var(--tr-f)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#0ea5e9'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(14,165,233,.25)'}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(14,165,233,.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9V6a2 2 0 012-2h3M15 4h3a2 2 0 012 2v3M21 15v3a2 2 0 01-2 2h-3M9 20H6a2 2 0 01-2-2v-3"/>
                    <rect x="7" y="7" width="10" height="10" rx="1"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight:700, color:'#0ea5e9', fontSize:13 }}>Scan QR / Barcode</div>
                  <div style={{ fontSize:11.5, color:'var(--text-3)', marginTop:2 }}>Use camera to scan</div>
                </div>
              </button>

              {/* Manual ISBN option */}
              <button type="button"
                onClick={() => setScanMode('manual')}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 12px', background:'rgba(124,58,237,.07)', border:'2px solid rgba(124,58,237,.25)', borderRadius:'var(--r-lg)', cursor:'pointer', transition:'all var(--tr-f)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#7c3aed'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(124,58,237,.25)'}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(124,58,237,.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    <line x1="6" y1="8" x2="6" y2="8.01"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="6" y1="11" x2="14" y2="11"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight:700, color:'#7c3aed', fontSize:13 }}>Enter ISBN</div>
                  <div style={{ fontSize:11.5, color:'var(--text-3)', marginTop:2 }}>Type the ISBN number on the book</div>
                </div>
              </button>
            </div>
            <p style={{ fontSize:11.5, color:'var(--text-4)', marginTop:10, textAlign:'center' }}>
              No camera / no ISBN? Skip this and fill in the form below manually.
            </p>
          </div>
        )}

        {/* Camera scanner */}
        {scanMode === 'camera' && showScanner && !fetchingISBN && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13.5, fontWeight:600, color:'var(--text-2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight:6, verticalAlign:'middle' }}>
                  <path d="M3 9V6a2 2 0 012-2h3M15 4h3a2 2 0 012 2v3M21 15v3a2 2 0 01-2 2h-3M9 20H6a2 2 0 01-2-2v-3"/><rect x="7" y="7" width="10" height="10" rx="1"/>
                </svg>
                Point at QR code or ISBN barcode
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setScanMode(null); setShowScanner(false); }}>← Back</button>
            </div>
            <Suspense fallback={<div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>}>
              <ISBNScanner onScan={handleISBNScan} />
            </Suspense>
          </div>
        )}

        {/* Manual ISBN input */}
        {scanMode === 'manual' && !fetchingISBN && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <label className="form-label" style={{ margin:0 }}>ISBN Number</label>
              <button className="btn btn-ghost btn-sm" onClick={() => setScanMode(null)}>← Back</button>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input
                className="form-input"
                autoFocus
                value={form.isbn}
                onChange={set('isbn')}
                placeholder="e.g. 9789332901384 — find it on the back cover"
                style={{ fontFamily:'var(--font-m)', flex:1 }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (form.isbn) handleISBNScan(form.isbn); } }}
              />
              <button type="button" className="btn btn-p" onClick={() => { if (form.isbn) handleISBNScan(form.isbn); }}
                disabled={!form.isbn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Lookup
              </button>
            </div>
            <p style={{ fontSize:11.5, color:'var(--text-4)', marginTop:6 }}>Press Enter or click Lookup to auto-fill from Google Books</p>
          </div>
        )}

        {/* Fetching spinner */}
        {fetchingISBN && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', background:'var(--bg-elevated)', borderRadius:'var(--r-lg)', marginBottom:16 }}>
            <Spinner size="sm" />
            <span style={{ fontSize:13, color:'var(--text-2)' }}>Looking up in Google Books…</span>
          </div>
        )}

        {/* Auto-filled success */}
        {form.title && form.isbn && !fetchingISBN && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:'var(--r-lg)', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
              <span style={{ fontSize:12.5, color:'var(--success-lt)', fontWeight:600 }}>Auto-filled from Google Books</span>
            </div>
            <button type="button" onClick={() => { setScanMode(null); setShowScanner(false); }}
              style={{ fontSize:11.5, color:'var(--text-4)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Scan another</button>
          </div>
        )}


        <form onSubmit={addBook}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Book ID *</label>
              <input className="form-input" value={form.id} onChange={set('id')}
                placeholder="BK015" required style={{ fontFamily:'var(--font-m)' }} />
              <p className="form-hint">Unique ID — printed on QR label</p>
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={form.category} onChange={set('category')}>
                {['CSE','EE','Civil','General'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="Book title" required />
          </div>
          <div className="form-group">
            <label className="form-label">Author *</label>
            <input className="form-input" value={form.author} onChange={set('author')} placeholder="Author name" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ISBN</label>
              <input className="form-input" value={form.isbn} onChange={set('isbn')}
                placeholder="978-…" style={{ fontFamily:'var(--font-m)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Copies</label>
              <input className="form-input" type="number" min="1" value={form.total_copies} onChange={set('total_copies')} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Shelf Location</label>
              <input className="form-input" value={form.shelf_location} onChange={set('shelf_location')}
                placeholder="A-01" style={{ fontFamily:'var(--font-m)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Cover Colour</label>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:6 }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, cover_color:c }))}
                    style={{ width:26, height:26, borderRadius:6, background:c, cursor:'pointer', transition:'all var(--tr-f)',
                      border:`3px solid ${form.cover_color===c?'#fff':'transparent'}`,
                      outline: form.cover_color===c?`2px solid ${c}`:'none', outlineOffset:1 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--bg-elevated)', borderRadius:'var(--r-lg)', border:'1px solid var(--border)', marginBottom:16 }}>
            <div style={{ width:28, height:40, borderRadius:'3px 5px 5px 3px', background:form.cover_color, flexShrink:0, position:'relative', overflow:'hidden', boxShadow:'2px 2px 6px rgba(0,0,0,.4)' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:'rgba(0,0,0,.25)' }} />
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{form.title||'Book Title'}</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>{form.author||'Author'}</div>
            </div>
            <span className={`badge ${catBadgeMap[form.category]??'badge-p'}`} style={{ marginLeft:'auto', flexShrink:0 }}>{form.category}</span>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button type="submit" className="btn btn-p" style={{ flex:1 }} disabled={saving}>
              {saving ? <Spinner size="sm" /> : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Book</>
              )}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setAddOpen(false); setShowScanner(false); setForm(empty); }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── QR Label Modal ── */}
      <Modal open={!!qrBook} onClose={() => setQrBook(null)} title={`QR Label — ${qrBook?.id}`} maxWidth={360}>
        {qrBook && (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ background:'#fff', display:'inline-block', padding:'16px 20px', borderRadius:14, marginBottom:14, boxShadow:'0 4px 20px rgba(0,0,0,.3)' }}>
              <div style={{ fontSize:8.5, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'#555', marginBottom:10, lineHeight:1.4 }}>
                Govt. Hydro Engineering College<br />
                <span style={{ fontWeight:400, fontSize:7.5 }}>Bandla, Bilaspur — H.P. · ghec.ac.in</span>
              </div>
              <QRCodeSVG value={qrBook.id} size={170} />
            </div>
            <div style={{ fontFamily:'var(--font-m)', fontSize:20, fontWeight:800, letterSpacing:3, color:'var(--text-1)', marginBottom:4 }}>{qrBook.id}</div>
            <div style={{ fontSize:14, color:'var(--text-2)', fontWeight:600, marginBottom:3 }}>{qrBook.title}</div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>{qrBook.author}</div>
            {qrBook.isbn && <div style={{ fontSize:11.5, color:'var(--text-4)', marginTop:4, fontFamily:'var(--font-m)' }}>ISBN: {qrBook.isbn}</div>}
            {qrBook.shelf_location && (
              <div style={{ marginTop:8 }}>
                <span style={{ fontFamily:'var(--font-m)', fontSize:11.5, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'2px 9px', color:'var(--text-2)' }}>
                  Shelf: {qrBook.shelf_location}
                </span>
              </div>
            )}
            <p style={{ fontSize:11, color:'var(--text-4)', marginTop:16 }}>Right-click · long-press on mobile to save</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
