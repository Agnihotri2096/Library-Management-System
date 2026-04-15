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

const BRANCH_ORDER = ['CSE', 'EE', 'Civil', 'General'];
const BRANCH_META  = {
  CSE:     { label:'Computer Science & Engineering', color:'#7c3aed', light:'rgba(124,58,237,.12)' },
  EE:      { label:'Electrical Engineering',         color:'#d97706', light:'rgba(217,119,6,.12)'  },
  Civil:   { label:'Civil Engineering',              color:'#16a34a', light:'rgba(22,163,74,.12)'  },
  General: { label:'General & Mathematics',          color:'#0ea5e9', light:'rgba(14,165,233,.12)' },
};
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
  const subjects = (info.categories ?? []).join(' ').toLowerCase();
  let category = 'General';
  if (subjects.includes('computer') || subjects.includes('software') || subjects.includes('programming')) category = 'CSE';
  else if (subjects.includes('electrical') || subjects.includes('electronics') || subjects.includes('circuit')) category = 'EE';
  else if (subjects.includes('civil') || subjects.includes('structural') || subjects.includes('construction')) category = 'Civil';
  return { title: info.title ?? '', author: (info.authors ?? []).join(', '), isbn: clean, category };
}

/* ── Individual book on the shelf ── */
function ShelfBook({ book, onQR, onDelete, deleting }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [hovered,     setHovered]     = useState(false);
  const cleanISBN = book.isbn?.replace(/[^0-9X]/gi, '');
  const coverUrl  = cleanISBN && !coverFailed
    ? `https://covers.openlibrary.org/b/isbn/${cleanISBN}-M.jpg`
    : null;

  return (
    <div
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, position:'relative', cursor:'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Book body */}
      <div
        onClick={() => onQR(book)}
        style={{
          width:80, height:118,
          borderRadius:'2px 6px 6px 2px',
          overflow:'hidden',
          position:'relative',
          boxShadow: hovered
            ? '4px 6px 20px rgba(0,0,0,.7), -1px 0 0 rgba(255,255,255,.06)'
            : '3px 4px 10px rgba(0,0,0,.5), -1px 0 0 rgba(255,255,255,.04)',
          transform: hovered ? 'translateY(-10px) scale(1.04)' : 'translateY(0) scale(1)',
          transition: 'transform .22s ease, box-shadow .22s ease',
          flexShrink: 0,
        }}
      >
        {/* Cover image */}
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            onError={() => setCoverFailed(true)}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
          />
        ) : (
          /* Coloured spine fallback */
          <div style={{ width:'100%', height:'100%', background:book.cover_color||'#7c3aed', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:7, background:'rgba(0,0,0,.3)' }} />
            <div style={{ position:'absolute', left:0, top:0, right:0, bottom:0, background:'linear-gradient(135deg, rgba(255,255,255,.08) 0%, transparent 60%)' }} />
            <p style={{ fontSize:8.5, color:'rgba(255,255,255,.9)', textAlign:'center', fontWeight:700, lineHeight:1.35, padding:'0 10px', wordBreak:'break-word', zIndex:1 }}>
              {book.title}
            </p>
          </div>
        )}

        {/* Availability dot */}
        <div style={{
          position:'absolute', top:5, right:5,
          width:9, height:9, borderRadius:'50%',
          background: book.available_copies > 0 ? '#10b981' : '#ef4444',
          border:'1.5px solid rgba(0,0,0,.3)',
          boxShadow:`0 0 6px ${book.available_copies > 0 ? '#10b981' : '#ef4444'}`,
        }} />
      </div>

      {/* Title below */}
      <div style={{
        width:80, fontSize:9.5, color:'var(--text-3)', textAlign:'center',
        lineHeight:1.35, overflow:'hidden',
        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
      }}>
        {book.title}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div style={{
          position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)',
          marginBottom:14, zIndex:50, pointerEvents:'none',
          background:'var(--bg-elevated)', border:'1px solid var(--border)',
          borderRadius:'var(--r-lg)', padding:'10px 14px',
          boxShadow:'0 8px 32px rgba(0,0,0,.5)',
          width:200, textAlign:'left',
        }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:3, lineHeight:1.4 }}>{book.title}</div>
          <div style={{ fontSize:11.5, color:'var(--text-3)', marginBottom:6 }}>{book.author}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
            <span className={`badge ${catBadgeMap[book.category]??'badge-p'}`}>{book.category}</span>
            <span style={{ fontSize:11, color: book.available_copies > 0 ? 'var(--success-lt)' : 'var(--danger-lt)', fontWeight:600 }}>
              {book.available_copies}/{book.total_copies} avail.
            </span>
          </div>
          {book.shelf_location && (
            <div style={{ fontSize:11, color:'var(--text-4)', marginTop:5, fontFamily:'var(--font-m)' }}>Shelf: {book.shelf_location}</div>
          )}
          <div style={{ fontSize:10.5, color:'var(--text-4)', marginTop:6 }}>Click for QR label</div>
          {/* Arrow */}
          <div style={{ position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)', width:0, height:0,
            borderLeft:'6px solid transparent', borderRight:'6px solid transparent',
            borderTop:'6px solid var(--border)' }} />
        </div>
      )}

      {/* Delete button on hover */}
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(book.id); }}
          disabled={deleting === book.id}
          style={{
            position:'absolute', top:-8, right:-8, zIndex:10,
            width:22, height:22, borderRadius:'50%',
            background:'#ef4444', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 8px rgba(0,0,0,.4)',
          }}
          title="Delete book"
        >
          {deleting === book.id
            ? <Spinner size="sm" />
            : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          }
        </button>
      )}
    </div>
  );
}

/* ── Shelf plank ── */
function ShelfPlank() {
  return (
    <div style={{
      height:18, width:'100%',
      background:'linear-gradient(180deg, #a16207 0%, #92400e 40%, #78350f 80%, #713f12 100%)',
      borderRadius:4,
      boxShadow:'0 6px 16px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.12)',
      margin:'4px 0 28px 0',
    }} />
  );
}

/* ═══════════════════════════════════════════ */
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

  async function handleISBNScan(code) {
    setScanMode(null); setShowScanner(false);
    setFetchingISBN(true);
    toast('Looking up book…', 'info');
    try {
      const info = await fetchBookByISBN(code);
      if (!info) {
        toast('Book not found in Google Books. Fill in manually.', 'warning');
        setForm(f => ({ ...f, isbn: code }));
      } else {
        setForm(f => ({ ...f, ...info }));
        toast(`Found: "${info.title}"`, 'success');
      }
    } catch { toast('Lookup failed — fill in manually.', 'error'); setForm(f => ({ ...f, isbn: code })); }
    finally { setFetchingISBN(false); }
  }

  async function addBook(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api('POST', '/books', { ...form, total_copies: parseInt(form.total_copies) }, token);
      toast(`"${form.title}" added!`, 'success');
      setForm(empty); setAddOpen(false); setScanMode(null); setShowScanner(false); load();
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
    const matchCat = cat === 'All' || b.category === cat;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) ||
      b.isbn?.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // Group by branch
  const grouped = {};
  (cat === 'All' ? BRANCH_ORDER : [cat]).forEach(br => {
    const bks = filtered.filter(b => b.category === br);
    if (bks.length > 0) grouped[br] = bks;
  });

  const totalAvail = books.reduce((a, b) => a + b.available_copies, 0);
  const totalOverdue = books.reduce((a, b) => a + (b.total_copies - b.available_copies), 0);

  return (
    <div className="page-wrap">
      <Sidebar role="librarian" />
      <ToastContainer />

      <main className="main-content">

        {/* Header */}
        <div className="top-header">
          <div>
            <h1 className="page-title">Library Shelf</h1>
            <p className="page-sub">{books.length} titles · {totalAvail} available · {totalOverdue} issued</p>
          </div>
          <button className="btn btn-p" onClick={() => { setAddOpen(true); setScanMode(null); setShowScanner(false); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Book
          </button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:14, marginBottom:28, flexWrap:'wrap', alignItems:'center' }}>
          <div className="filter-tabs">
            {['All','CSE','EE','Civil','General'].map(c => (
              <button key={c} className={`ftab ${cat===c?'active':''}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <div className="search-bar" style={{ flex:1, minWidth:220 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, color:'var(--text-4)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books…" />
            {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:16 }}>×</button>}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:16, marginBottom:24, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-3)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981' }} /> Available
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-3)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444' }} /> Fully Issued
          </div>
          <div style={{ fontSize:12, color:'var(--text-4)' }}>Hover a book to see details · Click for QR label</div>
        </div>

        {/* Shelf */}
        {loading ? <SpinnerPage /> : filtered.length === 0 ? (
          <EmptyState icon="📚" title="No books found"
            desc={search ? `No results for "${search}"` : 'Add your first book to get started.'}
            action={<button className="btn btn-p" onClick={() => setAddOpen(true)}>+ Add Book</button>} />
        ) : (
          Object.entries(grouped).map(([branch, bks]) => {
            const meta = BRANCH_META[branch];
            return (
              <div key={branch} style={{ marginBottom:8 }}>
                {/* Branch header */}
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                  <div style={{ width:4, height:22, borderRadius:2, background:meta.color, flexShrink:0 }} />
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-1)' }}>{meta.label}</div>
                  <div style={{ fontSize:12, color:'var(--text-4)', background:meta.light, border:`1px solid ${meta.color}33`, borderRadius:20, padding:'2px 10px' }}>
                    {bks.length} {bks.length === 1 ? 'book' : 'books'}
                  </div>
                  <div style={{ flex:1, height:1, background:'var(--border)' }} />
                </div>

                {/* Books row */}
                <div style={{
                  background:'rgba(0,0,0,.15)',
                  borderRadius:'var(--r-lg)',
                  padding:'24px 20px 0 20px',
                  border:'1px solid var(--border)',
                  backgroundImage:'linear-gradient(180deg, rgba(255,255,255,.02) 0%, rgba(0,0,0,.1) 100%)',
                }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:14, alignItems:'flex-end', minHeight:140 }}>
                    {bks.map(b => (
                      <ShelfBook
                        key={b.id}
                        book={b}
                        onQR={setQrBook}
                        onDelete={deleteBook}
                        deleting={deleting}
                      />
                    ))}
                  </div>
                  <ShelfPlank />
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ══ Add Book Modal ══ */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setScanMode(null); setShowScanner(false); }} title="Add New Book" maxWidth={540}>

        {/* Step 1 — pick method */}
        {!scanMode && !fetchingISBN && (
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:12.5, color:'var(--text-3)', marginBottom:12 }}>
              Auto-fill from Google Books — or skip and fill manually.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button type="button"
                onClick={() => { setScanMode('camera'); setShowScanner(true); }}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 12px',
                  background:'rgba(14,165,233,.07)', border:'2px solid rgba(14,165,233,.25)',
                  borderRadius:'var(--r-lg)', cursor:'pointer', transition:'all var(--tr-f)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#0ea5e9'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(14,165,233,.25)'}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(14,165,233,.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 9V6a2 2 0 012-2h3M15 4h3a2 2 0 012 2v3M21 15v3a2 2 0 01-2 2h-3M9 20H6a2 2 0 01-2-2v-3"/>
                    <rect x="7" y="7" width="10" height="10" rx="1"/>
                  </svg>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:700, color:'#0ea5e9', fontSize:13 }}>Scan QR / Barcode</div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>Use camera</div>
                </div>
              </button>

              <button type="button"
                onClick={() => setScanMode('manual')}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 12px',
                  background:'rgba(124,58,237,.07)', border:'2px solid rgba(124,58,237,.25)',
                  borderRadius:'var(--r-lg)', cursor:'pointer', transition:'all var(--tr-f)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#7c3aed'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(124,58,237,.25)'}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(124,58,237,.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    <line x1="6" y1="8" x2="6" y2="8.01"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="6" y1="11" x2="14" y2="11"/>
                  </svg>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:700, color:'#7c3aed', fontSize:13 }}>Enter ISBN</div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>Type the number</div>
                </div>
              </button>
            </div>
            <p style={{ fontSize:11, color:'var(--text-4)', marginTop:10, textAlign:'center' }}>
              No camera or ISBN? Skip — fill the form below manually.
            </p>
          </div>
        )}

        {/* Camera scanner */}
        {scanMode === 'camera' && showScanner && !fetchingISBN && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13.5, fontWeight:600, color:'var(--text-2)' }}>Point at QR code or ISBN barcode</span>
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
              <input className="form-input" autoFocus value={form.isbn} onChange={set('isbn')}
                placeholder="e.g. 9789332901384 — on the back cover"
                style={{ fontFamily:'var(--font-m)', flex:1 }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (form.isbn) handleISBNScan(form.isbn); } }} />
              <button type="button" className="btn btn-p" onClick={() => { if (form.isbn) handleISBNScan(form.isbn); }} disabled={!form.isbn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Lookup
              </button>
            </div>
            <p style={{ fontSize:11.5, color:'var(--text-4)', marginTop:6 }}>Press Enter or click Lookup</p>
          </div>
        )}

        {/* Fetching */}
        {fetchingISBN && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', background:'var(--bg-elevated)', borderRadius:'var(--r-lg)', marginBottom:16 }}>
            <Spinner size="sm" />
            <span style={{ fontSize:13, color:'var(--text-2)' }}>Looking up in Google Books…</span>
          </div>
        )}

        {/* Auto-fill success */}
        {form.title && form.isbn && !fetchingISBN && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px',
            background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:'var(--r-lg)', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
              <span style={{ fontSize:12.5, color:'var(--success-lt)', fontWeight:600 }}>Auto-filled from Google Books</span>
            </div>
            <button type="button" onClick={() => { setScanMode(null); setShowScanner(false); setForm(f => ({ ...f, title:'', author:'', isbn:'', category:'General' })); }}
              style={{ fontSize:11.5, color:'var(--text-4)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Clear</button>
          </div>
        )}

        <form onSubmit={addBook}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Book ID *</label>
              <input className="form-input" value={form.id} onChange={set('id')} placeholder="BK015" required style={{ fontFamily:'var(--font-m)' }} />
              <p className="form-hint">Unique — printed on QR label</p>
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
              <input className="form-input" value={form.isbn} onChange={set('isbn')} placeholder="978-…" style={{ fontFamily:'var(--font-m)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Copies</label>
              <input className="form-input" type="number" min="1" value={form.total_copies} onChange={set('total_copies')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Shelf Location</label>
              <input className="form-input" value={form.shelf_location} onChange={set('shelf_location')} placeholder="A-01" style={{ fontFamily:'var(--font-m)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Spine Colour <span style={{ fontSize:11, color:'var(--text-4)' }}>(if no cover)</span></label>
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
            <div style={{ width:36, height:52, borderRadius:'2px 6px 6px 2px', background:form.cover_color, flexShrink:0, position:'relative', overflow:'hidden', boxShadow:'2px 2px 8px rgba(0,0,0,.4)' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:5, background:'rgba(0,0,0,.3)' }} />
              <div style={{ fontSize:7, color:'rgba(255,255,255,.85)', fontWeight:700, padding:'4px 8px', lineHeight:1.3, position:'absolute', inset:0, display:'flex', alignItems:'center', zIndex:1, wordBreak:'break-word' }}>
                {form.title || 'Title'}
              </div>
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)' }}>{form.title || 'Book Title'}</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>{form.author || 'Author'}</div>
            </div>
            <span className={`badge ${catBadgeMap[form.category]??'badge-p'}`} style={{ marginLeft:'auto', flexShrink:0 }}>{form.category}</span>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button type="submit" className="btn btn-p" style={{ flex:1 }} disabled={saving}>
              {saving ? <Spinner size="sm" /> : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Book</>
              )}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setAddOpen(false); setScanMode(null); setShowScanner(false); setForm(empty); }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ══ QR Label Modal ══ */}
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
