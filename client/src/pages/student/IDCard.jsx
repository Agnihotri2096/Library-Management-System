import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { useToast } from '../../hooks/useToast';
import { Spinner } from '../../components/Spinner';

/* ── College constants ── */
const COLLEGE_NAME      = 'Govt. Hydro Engineering College';
const COLLEGE_FULL_NAME = 'Government Hydro Engineering College';
const COLLEGE_LOCATION  = 'Bandla, Bilaspur — Himachal Pradesh';
const COLLEGE_SHORT     = 'GHEC • ghec.ac.in';
const COLLEGE_AFFIL     = 'AICTE Approved · HPTU Affiliated';

const THEMES = [
  { id:'neon',        label:'Neon Glow',    cls:'theme-neon' },
  { id:'galaxy',      label:'Galaxy',       cls:'theme-galaxy' },
  { id:'holographic', label:'Holo',         cls:'theme-holographic' },
  { id:'matrix',      label:'Matrix',       cls:'theme-matrix' },
  { id:'sunset',      label:'Sunset',       cls:'theme-sunset' },
  { id:'minimal',     label:'Minimal',      cls:'theme-minimal' },
];

const AVATARS = ['🎓','⚡','🔬','🏗️','💻','🚀','🎯','🌟','🦁','🐉','🎭','🔮'];
const FONTS   = [
  { id:'Inter',        label:'Inter' },
  { id:'Outfit',       label:'Outfit' },
  { id:'Georgia',      label:'Georgia' },
  { id:'Courier New',  label:'Courier' },
  { id:'Trebuchet MS', label:'Trebuchet' },
];

export default function StudentIDCard() {
  const { token, user, updateUser } = useAuth();
  const { toast, ToastContainer }   = useToast();
  const cardRef = useRef(null);

  const [profile,    setProfile]    = useState(null);
  const [cfg,        setCfg]        = useState({ card_theme:'neon', card_avatar:'🎓', card_font:'Inter', card_border:'glow' });
  const [saving,     setSaving]     = useState(false);
  const [flipped,    setFlipped]    = useState(false);
  const [showEditor, setShowEditor] = useState(false);   // ← hidden by default

  useEffect(() => {
    api('GET', '/students/me', null, token).then(p => {
      setProfile(p);
      setCfg({
        card_theme:  p.card_theme  || 'neon',
        card_avatar: p.card_avatar || '🎓',
        card_font:   p.card_font   || 'Inter',
        card_border: p.card_border || 'glow',
      });
    }).catch(e => toast(e.message, 'error'));
  }, []);

  const set = k => v => setCfg(c => ({ ...c, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      await api('PUT', '/students/me/card', cfg, token);
      updateUser(cfg);
      toast('Card style saved!', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function download() {
    if (!cardRef.current) return;
    setFlipped(false);
    await new Promise(r => setTimeout(r, 420));
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${user?.name ?? 'student'}-ghec-id.png`;
    a.click();
    toast('ID Card downloaded!', 'success');
  }

  const theme = THEMES.find(t => t.id === cfg.card_theme) || THEMES[0];
  const p = profile || user;

  return (
    <div className="page-wrap">
      <Sidebar role="student" />
      <ToastContainer />

      <main className="main-content">
        {/* Header */}
        <div className="top-header">
          <div>
            <h1 className="page-title">My ID Card</h1>
            <p className="page-sub">Hover / tap to flip • Librarian scans the QR to issue books</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {/* Customize toggle */}
            <button
              className={`btn ${showEditor ? 'btn-p' : 'btn-ghost'}`}
              onClick={() => setShowEditor(v => !v)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
              </svg>
              {showEditor ? 'Hide Customizer' : 'Customize Card'}
            </button>
            <button className="btn btn-ghost" onClick={download}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Download PNG
            </button>
            <button className="btn btn-p" onClick={save} disabled={saving}>
              {saving ? <Spinner size="sm" /> : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  Save Style
                </>
              )}
            </button>
          </div>
        </div>

        {/* Two-column: card | editor (editor hidden by default) */}
        <div style={{ display:'grid', gridTemplateColumns: showEditor ? 'auto 1fr' : '1fr', gap:40, alignItems:'start', transition:'all .3s' }}>

          {/* Card preview - centred when editor hidden */}
          <div style={{ display:'flex', flexDirection:'column', alignItems: showEditor ? 'flex-start' : 'center' }}>
            <div
              className={`card-scene ${flipped ? 'flipped' : ''}`}
              onClick={() => setFlipped(f => !f)}
              style={{ width:400, height:232 }}
            >
              <div className="card-3d">
                {/* ── Front ── */}
                <div ref={cardRef} className={`card-face ${theme.cls}`} style={{ fontFamily:cfg.card_font }}>

                  {/* Holographic shimmer */}
                  {cfg.card_theme === 'holographic' && (
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,255,255,.12) 0%,transparent 50%,rgba(255,255,255,.06) 100%)', borderRadius:18, pointerEvents:'none' }} />
                  )}
                  {/* Matrix decorative code */}
                  {cfg.card_theme === 'matrix' && (
                    <div style={{ position:'absolute', top:0, right:14, fontSize:9, color:'rgba(0,200,0,.35)', lineHeight:1.7, fontFamily:'monospace', letterSpacing:2, userSelect:'none' }}>
                      {['10110','01011','11001','00101','10010'].map((r,i) => <div key={i}>{r}</div>)}
                    </div>
                  )}

                  {/* College name — top label */}
                  <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:2.2, color:'rgba(255,255,255,.55)', marginBottom:10, lineHeight:1.3 }}>
                    🏛 {COLLEGE_NAME} · Bilaspur, HP
                  </div>

                  {/* Avatar + name row */}
                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                    <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, border:'2px solid rgba(255,255,255,.3)', flexShrink:0 }}>
                      {cfg.card_avatar}
                    </div>
                    <div>
                      <div style={{ fontSize:19, fontWeight:800, color:'#fff', textShadow:'0 2px 10px rgba(0,0,0,.5)', letterSpacing:'-.01em' }}>{p?.name}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.65)', marginTop:3 }}>
                        {p?.branch === 'CSE' ? 'CSE (AI & DS)' : p?.branch === 'EE' ? 'Electrical Engineering' : p?.branch === 'Civil' ? 'Civil Engineering' : p?.branch} · Semester {p?.semester}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: ID + QR */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                    <div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:3 }}>Student ID</div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:1.8, fontFamily:'Courier New' }}>{p?.id}</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', marginTop:5, letterSpacing:.5 }}>{COLLEGE_AFFIL}</div>
                    </div>
                    <div style={{ width:40, height:40, background:'rgba(255,255,255,.92)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {p?.id && <QRCodeSVG value={p.id} size={30} />}
                    </div>
                  </div>

                  {/* Tap hint */}
                  <div style={{ position:'absolute', bottom:9, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'rgba(255,255,255,.3)', whiteSpace:'nowrap', letterSpacing:.3 }}>
                    tap to flip ↩
                  </div>
                </div>

                {/* ── Back ── */}
                <div className={`card-face card-back ${theme.cls}`} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, fontFamily:cfg.card_font }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:2, color:'rgba(255,255,255,.55)' }}>Library QR Code</div>
                  <div style={{ background:'rgba(255,255,255,.94)', padding:10, borderRadius:10 }}>
                    {p?.id && <QRCodeSVG value={p.id} size={98} />}
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.45)', textAlign:'center', lineHeight:1.6 }}>
                    {COLLEGE_FULL_NAME}<br />
                    <span style={{ fontSize:9, color:'rgba(255,255,255,.3)' }}>{COLLEGE_LOCATION}</span>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ textAlign: showEditor ? 'left' : 'center', marginTop:10, fontSize:12, color:'var(--text-4)' }}>
              Click to flip · Hover for 3D
            </p>

            {/* College info bar below card */}
            <div style={{ marginTop:20, padding:'12px 18px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', fontSize:12.5, color:'var(--text-3)', maxWidth:400, width:'100%' }}>
              <div style={{ fontWeight:700, color:'var(--text-2)', marginBottom:4, fontSize:13 }}>
                🏛 {COLLEGE_FULL_NAME}
              </div>
              <div>{COLLEGE_LOCATION}</div>
              <div style={{ marginTop:3, color:'var(--text-4)' }}>{COLLEGE_AFFIL}</div>
              <div style={{ marginTop:4 }}>
                <a href="https://ghec.ac.in" target="_blank" rel="noreferrer" style={{ color:'var(--primary-lt)', fontSize:12 }}>ghec.ac.in ↗</a>
              </div>
            </div>
          </div>

          {/* ── Customizer panel — hidden unless toggled ── */}
          {showEditor && (
            <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fadeInUp .3s ease' }}>

              {/* Theme */}
              <div className="card">
                <h3 style={{ fontFamily:'var(--font-h)', marginBottom:14, fontSize:'.95rem' }}>Card Theme</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => set('card_theme')(t.id)}
                      style={{
                        padding:'9px 6px', borderRadius:'var(--r-md)',
                        border:`2px solid ${cfg.card_theme === t.id ? 'var(--primary)' : 'var(--border)'}`,
                        background: cfg.card_theme === t.id ? 'var(--primary-soft)' : 'var(--bg-elevated)',
                        cursor:'pointer', fontSize:12.5, fontWeight:600,
                        color: cfg.card_theme === t.id ? 'var(--primary-lt)' : 'var(--text-2)',
                        transition:'all var(--tr-f)', fontFamily:'var(--font-b)',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar */}
              <div className="card">
                <h3 style={{ fontFamily:'var(--font-h)', marginBottom:14, fontSize:'.95rem' }}>Avatar Emoji</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8 }}>
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => set('card_avatar')(a)}
                      style={{
                        aspectRatio:1, fontSize:22,
                        background: cfg.card_avatar === a ? 'var(--primary-soft)' : 'var(--bg-elevated)',
                        border:`2px solid ${cfg.card_avatar === a ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius:'var(--r-md)', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all var(--tr-f)',
                      }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font */}
              <div className="card">
                <h3 style={{ fontFamily:'var(--font-h)', marginBottom:14, fontSize:'.95rem' }}>Name Font</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {FONTS.map(f => (
                    <button key={f.id} onClick={() => set('card_font')(f.id)}
                      style={{
                        padding:'10px 14px', borderRadius:'var(--r-md)',
                        border:`1px solid ${cfg.card_font === f.id ? 'var(--primary)' : 'var(--border)'}`,
                        background: cfg.card_font === f.id ? 'var(--primary-soft)' : 'var(--bg-elevated)',
                        cursor:'pointer', color: cfg.card_font === f.id ? 'var(--primary-lt)' : 'var(--text-2)',
                        textAlign:'left', fontFamily:f.id, fontSize:13.5,
                        transition:'all var(--tr-f)',
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save button in editor too */}
              <button className="btn btn-p btn-lg" onClick={save} disabled={saving} style={{ width:'100%' }}>
                {saving ? <Spinner size="sm" /> : 'Save Card Style'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
