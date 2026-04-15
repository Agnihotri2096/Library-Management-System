import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/Spinner';

export default function LibrarianLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pwd,   setPwd]   = useState('');
  const [err,   setErr]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const data = await api('POST', '/auth/librarian/login', { email, password: pwd });
      login(data.token, { ...data.librarian, role: 'librarian' });
      nav('/librarian/dashboard', { replace: true });
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  function fillDemo(email, pwd) {
    setEmail(email); setPwd(pwd);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ background:'var(--grad-a)', boxShadow:'0 8px 32px rgba(14,165,233,.35)' }}>📋</div>
          <h1 className="auth-title">Librarian Portal</h1>
          <p className="auth-sub">Staff access to library management</p>
        </div>

        {err && (
          <div className="alert alert-error" style={{ marginBottom:16 }}>
            <span>⚠️</span> {err}
          </div>
        )}

        {/* Demo credentials */}
        <div style={{ marginBottom:22, padding:'14px 16px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--text-4)', marginBottom:10 }}>Demo Accounts</p>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {[
              { label:'Admin', email:'admin@library.com', pwd:'admin123' },
              { label:'Main Librarian', email:'librarian@college.com', pwd:'lib123' },
            ].map(d => (
              <button key={d.email} type="button" onClick={() => fillDemo(d.email, d.pwd)}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:'var(--r-md)', background:'var(--bg-hover)', border:'1px solid var(--border)', cursor:'pointer', color:'var(--text-2)', fontSize:12.5, transition:'all var(--tr-f)', fontFamily:'var(--font-b)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hv)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontWeight:600, color:'var(--text-1)' }}>{d.label}</span>
                <span style={{ fontFamily:'var(--font-m)', fontSize:11.5, color:'var(--text-3)' }}>{d.email}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@library.com" required autoComplete="username" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={pwd} onChange={e => setPwd(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <button className="btn btn-a btn-lg" style={{ width:'100%', marginTop:8 }} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <>Sign In <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:22, fontSize:13 }}>
          <Link to="/" style={{ color:'var(--text-4)', display:'inline-flex', alignItems:'center', gap:5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
