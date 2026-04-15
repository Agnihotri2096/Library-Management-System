import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/Spinner';

export default function StudentLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [id,  setId]  = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const data = await api('POST', '/auth/student/login', { id: id.trim().toUpperCase(), password: pwd });
      login(data.token, data.student);
      nav('/student/dashboard', { replace: true });
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ boxShadow:'0 8px 32px var(--primary-glow)' }}>🎓</div>
          <h1 className="auth-title">Student Portal</h1>
          <p className="auth-sub">Sign in to access your library account</p>
        </div>

        {err && (
          <div className="alert alert-error" style={{ marginBottom:16 }}>
            <span>⚠️</span> {err}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Student ID</label>
            <input className="form-input" value={id} onChange={e => setId(e.target.value)}
              placeholder="e.g. 2022CSE042" required autoComplete="username"
              style={{ fontFamily:'var(--font-m)', letterSpacing:'.05em' }} />
            <p className="form-hint">Your roll / enrollment number</p>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={pwd} onChange={e => setPwd(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <button className="btn btn-p btn-lg" style={{ width:'100%', marginTop:8 }} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <>Sign In <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
          </button>
        </form>

        <div style={{ marginTop:24, padding:'16px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', textAlign:'center' }}>
          <p style={{ fontSize:13.5, color:'var(--text-3)', marginBottom:6 }}>New to the library?</p>
          <Link to="/student/register" className="btn btn-outline btn-sm" style={{ display:'inline-flex' }}>
            Create Account →
          </Link>
        </div>

        <p style={{ textAlign:'center', marginTop:18, fontSize:13 }}>
          <Link to="/" style={{ color:'var(--text-4)', display:'inline-flex', alignItems:'center', gap:5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
