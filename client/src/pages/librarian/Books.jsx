import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Sidebar    from '../../components/Sidebar';
import Modal      from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { SpinnerPage, Spinner } from '../../components/Spinner';
import { useAuth }  from '../../context/AuthContext';
import { api } from '../../api';
import { useToast } from '../../hooks/useToast';

const ISBNScanner = lazy(() => import('../../components/ISBNScanner'));

/* ─── Constants ─────────────────────────────────────── */
const BRANCH_ORDER = ['CSE', 'EE', 'Civil', 'General'];
const BRANCH_META  = {
  CSE    : { label:'Computer Science & AI/DS', color:'#7c3aed', bg:'rgba(124,58,237,.1)',  border:'rgba(124,58,237,.3)'  },
  EE     : { label:'Electrical Engineering',   color:'#d97706', bg:'rgba(217,119,6,.1)',   border:'rgba(217,119,6,.3)'   },
  Civil  : { label:'Civil Engineering',        color:'#16a34a', bg:'rgba(22,163,74,.1)',   border:'rgba(22,163,74,.3)'   },
  General: { label:'General & Mathematics',    color:'#0ea5e9', bg:'rgba(14,165,233,.1)',  border:'rgba(14,165,233,.3)'  },
};
const SPINE_COLORS = ['#7c3aed','#a855f7','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#0284c7'];
const EMPTY_FORM   = { id:'', title:'', author:'', isbn:'', total_copies:1, shelf_location:'', category:'General', cover_color:'#7c3aed' };
const CAT_BADGE    = { CSE:'badge-cse', EE:'badge-ee', Civil:'badge-civil', General:'badge-p' };

/* ─── Helpers ──────────────────────────────────────── */
async function fetchBookByISBN(isbn) {
  const clean = isbn.replace(/[^0-9X]/gi, '');
  const res   = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`);
  const data  = await res.json();
  if (!data.items?.length) return null;
  const info     = data.items[0].volumeInfo;
  const subjects = (info.categories ?? []).join(' ').toLowerCase();
  let category   = 'General';
  if (subjects.includes('computer') || subjects.includes('software') || subjects.includes('programming')) category = 'CSE';
  else if (subjects.includes('electrical') || subjects.includes('electronics') || subjects.includes('circuit')) category = 'EE';
  else if (subjects.includes('civil') || subjects.includes('structural') || subjects.includes('construction')) category = 'Civil';
  return { title: info.title ?? '', author: (info.authors ?? []).join(', '), isbn: clean, category };
}

/* ─── ShelfBook ─────────────────────────────────────── */
function ShelfBook({ book, index, onShowQR, onDelete, deleting }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [hovered,     setHovered]     = useState(false);

  const cleanISBN = book.isbn?.replace(/[^0-9X]/gi, '');
  const coverUrl  = cleanISBN && !coverFailed
    ? `https://covers.openlibrary.org/b/isbn/${cleanISBN}-M.jpg`
    : null;

  const isAvail = book.available_copies > 0;

  return (
    <div
      className="shelf-book"
      style={{
        position: 'relative',
        display:  'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        animationDelay: `${Math.min(index * 45, 600)}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Book body ── */}
      <div
        onClick={() => onShowQR(book)}
        style={{
          width: 76, height: 114,
          borderRadius: '2px 7px 7px 2px',
          overflow: 'hidden',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease',
          transform: hovered ? 'translateY(-13px) scale(1.07)' : 'translateY(0) scale(1)',
          boxShadow: hovered
            ? '5px 10px 30px rgba(0,0,0,.8), -1px 0 0 rgba(255,255,255,.08), 1px 0 0 rgba(0,0,0,.5)'
            : '3px 5px 14px rgba(0,0,0,.6), -1px 0 0 rgba(255,255,255,.04)',
          zIndex: hovered ? 20 : 1,
        }}
      >
        {/* Cover image or spine */}
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            onError={() => setCoverFailed(true)}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
          />
        ) : (
          <div style={{
            width:'100%', height:'100%',
            background: `linear-gradient(135deg, ${book.cover_color}ee 0%, ${book.cover_color}99 100%)`,
            position: 'relative', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {/* Spine shadow */}
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:8, background:'rgba(0,0,0,.35)', zIndex:1 }} />
            {/* Gloss */}
            <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'40%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,.07))', zIndex:1 }} />
            {/* Title text */}
            <p style={{
              fontSize: 8, color:'rgba(255,255,255,.92)', textAlign:'center',
              fontWeight: 700, lineHeight: 1.4, padding:'0 12px',
              wordBreak:'break-word', zIndex:2, position:'relative',
            }}>
              {book.title}
            </p>
          </div>
        )}

        {/* Availability dot */}
        <div style={{
          position:'absolute', top:5, right:5,
          width:8, height:8, borderRadius:'50%',
          background: isAvail ? '#10b981' : '#ef4444',
          border: '1.5px solid rgba(0,0,0,.4)',
          boxShadow: `0 0 6px 1px ${isAvail ? '#10b981' : '#ef4444'}99`,
          zIndex: 5,
        }} />
      </div>

      {/* ── Title below ── */}
      <div style={{
        width:80, fontSize:9, color:'var(--text-4)', textAlign:'center',
        lineHeight:1.4, overflow:'hidden',
        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
        transition:'color .2s',
        ...(hovered ? { color:'var(--text-2)' } : {}),
      }}>
        {book.title}
      </div>

      {/* ── Hover tooltip ── */}
      {hovered && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 10px)',
          left: '50%', transform:'translateX(-50%)',
          zIndex: 100, pointerEvents:'none',
          background:'rgba(13,17,31,.97)',
          border:'1px solid rgba(255,255,255,.1)',
          borderRadius:12, padding:'12px 16px',
          boxShadow:'0 12px 40px rgba(0,0,0,.7)',
          width:210, textAlign:'left',
          backdropFilter:'blur(12px)',
          animation:'fadeInUp .15s ease both',
        }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:4, lineHeight:1.4 }}>{book.title}</div>
          <div style={{ fontSize:11.5, color:'var(--text-3)', marginBottom:8 }}>{book.author}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <span className={`badge ${CAT_BADGE[book.category]??'badge-p'}`}>{book.category}</span>
            <span style={{ fontSize:11, fontWeight:700, color: isAvail ? '#10b981' : '#ef4444' }}>
              {book.available_copies}/{book.total_copies} avail.
            </span>
          </div>
          {book.isbn && (
            <div style={{ fontSize:10.5, color:'var(--text-4)', fontFamily:'var(--font-m)' }}>ISBN: {book.isbn}</div>
          )}
          {book.shelf_location && (
            <div style={{ fontSize:10.5, color:'var(--text-4)', marginTop:3, fontFamily:'var(--font-m)' }}>📍 Shelf {book.shelf_location}</div>
          )}
          <div style={{ fontSize:10, color:'var(--text-4)', marginTop:8, paddingTop:8, borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', justifyContent:'space-between' }}>
            <span>Click → QR label</span>
            <span style={{ color:'#ef4444', cursor:'pointer' }} onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}>
              🗑 Delete
            </span>
          </div>
          {/* Tooltip arrow */}
          <div style={{
            position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)',
            width:0, height:0,
            borderLeft:'6px solid transparent',
            borderRight:'6px solid transparent',
            borderTop:'6px solid rgba(255,255,255,.1)',
          }}/>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────── */
export default function Books() {
  const { token } = useAuth();
  const { toast, ToastContainer } = useToast();

  const [books,    setBooks]    = useState([]);
  const [search,   setSearch]   = useState('');
  const [cat,      setCat]      = useState('All');
  const [loading,  setLoading]  = useState(true);
  const [addOpen,  setAddOpen]  = useState(false);
  const [qrBook,   setQrBook]   = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [scanMode,     setScanMode]     = useState(null);
  const [showScanner,  setShowScanner]  = useState(false);
  const [fetchingISBN, setFetchingISBN] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setBooks(await api('GET', '/books', null, token)); }
    catch (e) { toast(e.message, 'error'); }
    finally   { setLoading(false); }
  }

  const setField = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleISBNScan(code) {
    setScanMode(null); setShowScanner(false);
    setFetchingISBN(true);
    toast('Looking up book…', 'info');
    try {
      const info = await fetchBookByISBN(code);
      if (!info) { toast('Not found in Google Books — fill manually.', 'warning'); setForm(f => ({ ...f, isbn: code })); }
      else { setForm(f => ({ ...f, ...info })); toast(`Found: "${info.title}"`, 'success'); }
    } catch { toast('Lookup failed — fill manually.', 'error'); setForm(f => ({ ...f, isbn: code })); }
    finally { setFetchingISBN(false); }
  }

  async function addBook(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api('POST', '/books', { ...form, total_copies: parseInt(form.total_copies) }, token);
      toast(`"${form.title}" added!`, 'success');
      setForm(EMPTY_FORM); setAddOpen(false); setScanMode(null); setShowScanner(false);
      load();
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

  const closeAdd = useCallback(() => { setAddOpen(false); setScanMode(null); setShowScanner(false); }, []);

  /* Filtered + grouped */
  const filtered = books.filter(b => {
    const matchCat    = cat === 'All' || b.category === cat;
    const q           = search.toLowerCase();
    const matchSearch = !search ||
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) ||
      b.isbn?.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const branches = cat === 'All' ? BRANCH_ORDER : [cat];
  const grouped  = {};
  branches.forEach(br => {
    const bks = filtered.filter(b => b.category === br);
    if (bks.length) grouped[br] = bks;
  });

  /* Stats */
  const totalAvail   = books.reduce((a, b) => a + b.available_copies, 0);
  const totalIssued  = books.reduce((a, b) => a + (b.total_copies - b.available_copies), 0);

  return (
    <div className="page-wrap">
      <Sidebar role="librarian" />
      <ToastContainer />

      <main className="main-content">

        {/* ── Header ── */}
        <div className="top-header" style={{ marginBottom:20 }}>
          <div>
            <h1 className="page-title">Library Shelf</h1>
            <p className="page-sub">{books.length} titles · {totalAvail} available · {totalIssued} issued</p>
          </div>
          <button className="btn btn-p" onClick={() => setAddOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Book
          </button>
        </div>

        {/* ── Branch quick-stats ── */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
          {BRANCH_ORDER.map(br => {
            const meta  = BRANCH_META[br];
            const count = books.filter(b => b.category === br).length;
            return (
              <button key={br} className="branch-stat"
                onClick={() => setCat(cat === br ? 'All' : br)}
                style={{
                  color: meta.color, background: cat === br ? meta.bg : 'transparent',
                  borderColor: cat === br ? meta.color : meta.border,
                }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:meta.color }} />
                {br} · {count}
              </button>
            );
          })}
          {cat !== 'All' && (
            <button className="branch-stat"
              onClick={() => setCat('All')}
              style={{ color:'var(--text-3)', borderColor:'var(--border)', background:'transparent' }}>
              ✕ All Branches
            </button>
          )}
        </div>

        {/* ── Search ── */}
        <div className="search-bar" style={{ marginBottom:28, maxWidth:480 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, color:'var(--text-4)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books, author, ISBN…" />
          {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>}
        </div>

        {/* ── Legend ── */}
        <div style={{ display:'flex', gap:18, marginBottom:18, flexWrap:'wrap' }}>
          {[['#10b981','Available'],['#ef4444','Fully Issued']].map(([c,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--text-4)' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:c, boxShadow:`0 0 6px ${c}` }} /> {l}
            </div>
          ))}
          <div style={{ fontSize:11.5, color:'var(--text-4)' }}>Hover → details · Click → QR label</div>
        </div>

        {/* ── Shelf ── */}
        {loading ? <SpinnerPage /> : filtered.length === 0 ? (
          <EmptyState icon="📚" title="No books found"
            desc={search ? `No results for "${search}"` : 'Add your first book to get started.'}
            action={<button className="btn btn-p" onClick={() => setAddOpen(true)}>+ Add Book</button>} />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
            {Object.entries(grouped).map(([branch, bks], secIdx) => {
              const meta = BRANCH_META[branch];
              return (
                <div key={branch} className="shelf-section" style={{ animationDelay:`${secIdx * 80}ms` }}>

                  {/* Branch header */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                    <div style={{ width:3, height:20, borderRadius:2, background:meta.color, flexShrink:0, boxShadow:`0 0 8px ${meta.color}` }} />
                    <span style={{ fontSize:14.5, fontWeight:700, color:'var(--text-1)', letterSpacing:'-.02em' }}>{meta.label}</span>
                    <span style={{ fontSize:11.5, color:meta.color, background:meta.bg, border:`1px solid ${meta.border}`, borderRadius:20, padding:'2px 10px', fontWeight:600 }}>
                      {bks.length} book{bks.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ flex:1, height:1, background:`linear-gradient(90deg, ${meta.border}, transparent)` }} />
                  </div>

                  {/* Shelf container */}
                  <div className="shelf-bg">

                    {/* Books row */}
                    <div style={{
                      display:'flex', flexWrap:'wrap', gap:12,
                      alignItems:'flex-end', minHeight:130, paddingBottom:4,
                      position:'relative', zIndex:2,
                    }}>
                      {bks.map((book, i) => (
                        <ShelfBook
                          key={book.id}
                          book={book}
                          index={i}
                          onShowQR={setQrBook}
                          onDelete={deleteBook}
                          deleting={deleting}
                        />
                      ))}
                    </div>

                    {/* Wood shelf plank */}
                    <div className="shelf-plank" />
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ════ Add Book Modal ════ */}
      <Modal open={addOpen} onClose={closeAdd} title="Add New Book" maxWidth={540}>

        {/* Choose method */}
        {!scanMode && !fetchingISBN && (
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:12.5, color:'var(--text-3)', marginBottom:12 }}>Auto-fill from Google Books, or fill manually.</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { mode:'camera', color:'#0ea5e9', bg:'rgba(14,165,233,.07)', border:'rgba(14,165,233,.25)', icon:(
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 9V6a2 2 0 012-2h3M15 4h3a2 2 0 012 2v3M21 15v3a2 2 0 01-2 2h-3M9 20H6a2 2 0 01-2-2v-3"/>
                    <rect x="7" y="7" width="10" height="10" rx="1"/>
                  </svg>), label:'Scan QR / Barcode', sub:'Use camera' },
                { mode:'manual', color:'#7c3aed', bg:'rgba(124,58,237,.07)', border:'rgba(124,58,237,.25)', icon:(
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    <line x1="6" y1="8" x2="6" y2="8.01"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="6" y1="11" x2="14" y2="11"/>
                  </svg>), label:'Enter ISBN', sub:'Type or paste' },
              ].map(({ mode, color, bg, border, icon, label, sub }) => (
                <button key={mode} type="button"
                  onClick={() => { setScanMode(mode); if (mode==='camera') setShowScanner(true); }}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 12px',
                    background:bg, border:`2px solid ${border}`, borderRadius:'var(--r-lg)',
                    cursor:'pointer', transition:'all var(--tr-f)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor=color}
                  onMouseLeave={e => e.currentTarget.style.borderColor=border}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:bg, border:`1.5px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {icon}
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontWeight:700, color, fontSize:13 }}>{label}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{sub}</div>
                  </div>
                </button>
              ))}
            </div>
            <p style={{ fontSize:11, color:'var(--text-4)', marginTop:10, textAlign:'center' }}>No ISBN? Skip — fill the form below manually.</p>
          </div>
        )}

        {/* Camera */}
        {scanMode === 'camera' && showScanner && !fetchingISBN && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13.5, fontWeight:600, color:'var(--text-2)' }}>Point at barcode or QR</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setScanMode(null); setShowScanner(false); }}>← Back</button>
            </div>
            <Suspense fallback={<div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>}>
              <ISBNScanner onScan={handleISBNScan} />
            </Suspense>
          </div>
        )}

        {/* Manual ISBN */}
        {scanMode === 'manual' && !fetchingISBN && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <label className="form-label" style={{ margin:0 }}>ISBN Number</label>
              <button className="btn btn-ghost btn-sm" onClick={() => setScanMode(null)}>← Back</button>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" autoFocus value={form.isbn} onChange={setField('isbn')}
                placeholder="e.g. 9789332901384" style={{ fontFamily:'var(--font-m)', flex:1 }}
                onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); if (form.isbn) handleISBNScan(form.isbn); } }} />
              <button type="button" className="btn btn-p" onClick={() => { if (form.isbn) handleISBNScan(form.isbn); }} disabled={!form.isbn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Lookup
              </button>
            </div>
            <p style={{ fontSize:11, color:'var(--text-4)', marginTop:6 }}>Press Enter or click Lookup</p>
          </div>
        )}

        {fetchingISBN && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', background:'var(--bg-elevated)', borderRadius:'var(--r-lg)', marginBottom:16 }}>
            <Spinner size="sm" />
            <span style={{ fontSize:13, color:'var(--text-2)' }}>Looking up in Google Books…</span>
          </div>
        )}

        {form.title && form.isbn && !fetchingISBN && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px',
            background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:'var(--r-lg)', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
              <span style={{ fontSize:12.5, color:'var(--success-lt)', fontWeight:600 }}>Auto-filled from Google Books</span>
            </div>
            <button type="button" onClick={() => { setScanMode(null); setForm(f => ({ ...f, title:'', author:'', isbn:'', category:'General' })); }}
              style={{ fontSize:11.5, color:'var(--text-4)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Clear</button>
          </div>
        )}

        <form onSubmit={addBook}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Book ID *</label>
              <input className="form-input" value={form.id} onChange={setField('id')} placeholder="BK015" required style={{ fontFamily:'var(--font-m)' }} />
              <p className="form-hint">Unique — printed on QR label</p>
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={form.category} onChange={setField('category')}>
                {['CSE','EE','Civil','General'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={setField('title')} placeholder="Book title" required />
          </div>
          <div className="form-group">
            <label className="form-label">Author *</label>
            <input className="form-input" value={form.author} onChange={setField('author')} placeholder="Author name" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ISBN</label>
              <input className="form-input" value={form.isbn} onChange={setField('isbn')} placeholder="978-…" style={{ fontFamily:'var(--font-m)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Copies</label>
              <input className="form-input" type="number" min="1" value={form.total_copies} onChange={setField('total_copies')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Shelf Location</label>
              <input className="form-input" value={form.shelf_location} onChange={setField('shelf_location')} placeholder="A-01" style={{ fontFamily:'var(--font-m)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Spine Colour <span style={{ fontSize:11, color:'var(--text-4)' }}>(shown if no cover)</span></label>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:6 }}>
                {SPINE_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, cover_color:c }))}
                    style={{ width:26, height:26, borderRadius:6, background:c, cursor:'pointer',
                      border:`3px solid ${form.cover_color===c?'#fff':'transparent'}`,
                      outline: form.cover_color===c?`2px solid ${c}`:'none', outlineOffset:1,
                      transition:'all var(--tr-f)' }} />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px',
            background:'var(--bg-elevated)', borderRadius:'var(--r-lg)', border:'1px solid var(--border)', marginBottom:16 }}>
            <div style={{ width:36, height:52, borderRadius:'2px 6px 6px 2px', background:form.cover_color, flexShrink:0,
              position:'relative', overflow:'hidden', boxShadow:'3px 3px 10px rgba(0,0,0,.5)' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:6, background:'rgba(0,0,0,.3)' }} />
              <div style={{ fontSize:6.5, color:'rgba(255,255,255,.85)', fontWeight:700, padding:'4px 8px',
                lineHeight:1.3, position:'absolute', inset:0, display:'flex', alignItems:'center', zIndex:1, wordBreak:'break-word' }}>
                {form.title || 'Title'}
              </div>
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{form.title||'Book Title'}</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>{form.author||'Author'}</div>
            </div>
            <span className={`badge ${CAT_BADGE[form.category]??'badge-p'}`} style={{ flexShrink:0 }}>{form.category}</span>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button type="submit" className="btn btn-p" style={{ flex:1 }} disabled={saving}>
              {saving ? <Spinner size="sm" /> : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Book</>
              )}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { closeAdd(); setForm(EMPTY_FORM); }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ════ QR Label Modal ════ */}
      <Modal open={!!qrBook} onClose={() => setQrBook(null)} title={`QR Label — ${qrBook?.id}`} maxWidth={360}>
        {qrBook && (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ background:'#fff', display:'inline-block', padding:'16px 20px', borderRadius:14, marginBottom:14, boxShadow:'0 4px 20px rgba(0,0,0,.3)' }}>
              <div style={{ fontSize:8.5, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'#555', marginBottom:10, lineHeight:1.4 }}>
                Govt. Hydro Engineering College<br/>
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
