import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Sidebar    from '../../components/Sidebar';
import Modal      from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { SpinnerPage, Spinner } from '../../components/Spinner';
import { useAuth }  from '../../context/AuthContext';
import { api } from '../../api';
import { useToast } from '../../hooks/useToast';

const CATS   = ['All', 'CSE', 'EE', 'Civil', 'General'];
const COLORS = ['#7c3aed','#a855f7','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#0284c7'];
const empty  = { id:'', title:'', author:'', isbn:'', total_copies:1, shelf_location:'', category:'General', cover_color:'#7c3aed' };

const catBadgeMap = {
  CSE:     'badge-cse',
  EE:      'badge-ee',
  Civil:   'badge-civil',
  General: 'badge-p',
};

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

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setBooks(await api('GET', '/books', null, token)); }
    catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function addBook(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api('POST', '/books', { ...form, total_copies: parseInt(form.total_copies) }, token);
      toast(`"${form.title}" added!`, 'success');
      setForm(empty); setAddOpen(false); load();
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
            <p className="page-sub">
              {books.length} titles &nbsp;·&nbsp; {totalAvail} copies available
            </p>
          </div>
          <button className="btn btn-p" onClick={() => setAddOpen(true)}>
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, ISBN, or Book ID…" />
            {search && (
              <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', padding:'0 2px', fontSize:16 }}>×</button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? <SpinnerPage /> : filtered.length === 0 ? (
          <EmptyState
            icon="📖"
            title="No books found"
            desc={search ? `No results for "${search}". Try a different search.` : 'Add your first book to get started.'}
            action={<button className="btn btn-p" onClick={() => setAddOpen(true)}>+ Add Book</button>}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>ID / ISBN</th>
                  <th>Category</th>
                  <th>Shelf</th>
                  <th>Availability</th>
                  <th>QR</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const pct = b.total_copies > 0 ? (b.available_copies / b.total_copies) * 100 : 0;
                  const fillCls = b.available_copies === 0 ? 'danger' : pct < 50 ? 'warn' : 'safe';
                  return (
                    <tr key={b.id}>
                      {/* Book title + author */}
                      <td>
                        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                          <div style={{ width:30, height:42, borderRadius:'4px 6px 6px 4px', background:b.cover_color || '#7c3aed', flexShrink:0, position:'relative', overflow:'hidden', boxShadow:'2px 2px 6px rgba(0,0,0,.4)' }}>
                            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:'rgba(0,0,0,.25)' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight:600, color:'var(--text-1)', fontSize:13.5 }}>{b.title}</div>
                            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>{b.author}</div>
                          </div>
                        </div>
                      </td>

                      {/* ID + ISBN */}
                      <td>
                        <div style={{ fontFamily:'var(--font-m)', fontSize:12, color:'var(--text-1)', fontWeight:600 }}>{b.id}</div>
                        {b.isbn && <div style={{ fontFamily:'var(--font-m)', fontSize:11, color:'var(--text-4)', marginTop:2 }}>{b.isbn}</div>}
                      </td>

                      {/* Category badge */}
                      <td>
                        <span className={`badge ${catBadgeMap[b.category] ?? 'badge-p'}`}>{b.category}</span>
                      </td>

                      {/* Shelf */}
                      <td>
                        <span style={{ fontFamily:'var(--font-m)', fontSize:12.5, color:'var(--text-2)', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'2px 8px' }}>
                          {b.shelf_location || '—'}
                        </span>
                      </td>

                      {/* Availability */}
                      <td style={{ minWidth:100 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                          <span style={{ fontWeight:700, fontSize:14, color: b.available_copies === 0 ? 'var(--danger-lt)' : 'var(--success-lt)' }}>
                            {b.available_copies}
                          </span>
                          <span style={{ color:'var(--text-4)', fontSize:12 }}>/ {b.total_copies}</span>
                        </div>
                        <div className="prog" style={{ width:64 }}>
                          <div className={`prog-fill ${fillCls}`} style={{ width:`${pct}%` }} />
                        </div>
                      </td>

                      {/* QR */}
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

                      {/* Delete */}
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteBook(b.id)} disabled={deleting === b.id}
                          style={{ color:'var(--danger-lt)', borderColor:'rgba(239,68,68,.2)' }}
                          title="Delete book">
                          {deleting === b.id ? <Spinner size="sm" /> : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
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
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Book">
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
                    style={{ width:26, height:26, borderRadius:6, background:c, cursor:'pointer', transition:'all var(--tr-f)', border:`3px solid ${form.cover_color === c ? '#fff' : 'transparent'}`, outline: form.cover_color === c ? `2px solid ${c}` : 'none', outlineOffset:1 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--bg-elevated)', borderRadius:'var(--r-lg)', border:'1px solid var(--border)', marginBottom:16 }}>
            <div style={{ width:28, height:40, borderRadius:'3px 5px 5px 3px', background:form.cover_color, flexShrink:0, position:'relative', overflow:'hidden', boxShadow:'2px 2px 6px rgba(0,0,0,.4)' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:'rgba(0,0,0,.25)' }} />
            </div>
            <div>
              <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)' }}>{form.title || 'Book Title'}</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>{form.author || 'Author'}</div>
            </div>
            <span className={`badge ${catBadgeMap[form.category] ?? 'badge-p'}`} style={{ marginLeft:'auto' }}>{form.category}</span>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button type="submit" className="btn btn-p" style={{ flex:1 }} disabled={saving}>
              {saving ? <Spinner size="sm" /> : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Book
                </>
              )}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ── QR Label Modal ── */}
      <Modal open={!!qrBook} onClose={() => setQrBook(null)} title={`QR Label — ${qrBook?.id}`} maxWidth={360}>
        {qrBook && (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            {/* Label card */}
            <div style={{ background:'#fff', display:'inline-block', padding:'16px 20px', borderRadius:14, marginBottom:14, boxShadow:'0 4px 20px rgba(0,0,0,.3)' }}>
              {/* College header on label */}
              <div style={{ fontSize:8.5, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'#555', marginBottom:10, lineHeight:1.4 }}>
                Govt. Hydro Engineering College<br />
                <span style={{ fontWeight:400, fontSize:7.5 }}>Bandla, Bilaspur — H.P. · ghec.ac.in</span>
              </div>
              <QRCodeSVG value={qrBook.id} size={170} />
            </div>
            <div style={{ fontFamily:'var(--font-m)', fontSize:20, fontWeight:800, letterSpacing:3, color:'var(--text-1)', marginBottom:4 }}>{qrBook.id}</div>
            <div style={{ fontSize:14, color:'var(--text-2)', fontWeight:600, marginBottom:3 }}>{qrBook.title}</div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>{qrBook.author}</div>
            {qrBook.shelf_location && (
              <div style={{ marginTop:8 }}>
                <span style={{ fontFamily:'var(--font-m)', fontSize:11.5, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'2px 9px', color:'var(--text-2)' }}>
                  Shelf: {qrBook.shelf_location}
                </span>
              </div>
            )}
            <p style={{ fontSize:11, color:'var(--text-4)', marginTop:16 }}>
              Right-click the QR · long-press on mobile to save image
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
