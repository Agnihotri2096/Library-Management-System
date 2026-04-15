import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/Spinner';

const BRANCHES = ['CSE', 'EE', 'Civil'];
const pwdColors = ['#ef4444','#f97316','#f59e0b','#10b981'];
const pwdLabels = ['Too weak','Fair','Good','Strong ✦'];

function scorePassword(v) {
  let s = 0;
  if (v.length >= 6)  s++;
  if (v.length >= 10) s++;
  if (/[A-Z\d]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
}

export default function StudentRegister() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ id:'', name:'', email:'', branch:'', semester:'1', phone:'', password:'', confirm:'' });
  const [err, setErr]   = useState('');
  const [loading, setLoading] = useState(false);
  const [pwdScore, setPwdScore] = useState(0);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!form.branch)                  return setErr('Please select a branch');
    if (form.password !== form.confirm) return setErr('Passwords do not match');
    if (form.password.length < 6)      return setErr('Password must be at least 6 characters');
    setLoading(true);
    try {
      const data = await api('POST', '/auth/student/register', {
        id:       form.id.trim().toUpperCase(),
        name:     form.name.trim(),
        email:    form.email.trim(),
        branch:   form.branch,
        semester: parseInt(form.semester),
        phone:    form.phone.trim(),
        password: form.password,
      });
      login(data.token, data.student);
      nav('/student/dashboard', { replace: true });
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth:520 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ boxShadow:'0 8px 32px var(--primary-glow)' }}>📝</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-sub">Register with your college details to get started</p>
        </div>

        {err && (
          <div className="alert alert-error" style={{ marginBottom:18 }}>
            <span>⚠️</span> {err}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Student ID *</label>
              <input className="form-input" value={form.id} onChange={set('id')}
                placeholder="2022CSE042" required
                style={{ fontFamily:'var(--font-m)', letterSpacing:'.05em' }} />
              <p className="form-hint">Roll / enrollment number</p>
            </div>
            <div className="form-group">
              <label className="form-label">Branch *</label>
              <select className="form-select" value={form.branch} onChange={set('branch')} required>
                <option value="">Select branch</option>
                {BRANCHES.map(b => (
                  <option key={b} value={b}>
                    {b === 'EE' ? 'EE — Electrical' : b === 'Civil' ? 'Civil Engineering' : 'CSE — Computer Sci.'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={set('name')} placeholder="Priya Sharma" required />
          </div>

          <div className="form-group">
            <label className="form-label">College Email *</label>
            <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="priya@college.edu" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Semester</label>
              <select className="form-select" value={form.semester} onChange={set('semester')}>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone <span style={{ color:'var(--text-4)', textTransform:'none', fontSize:10 }}>(optional)</span></label>
              <input className="form-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="9876543210" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" value={form.password}
                onChange={e => { set('password')(e); setPwdScore(scorePassword(e.target.value)); }}
                placeholder="Min 6 chars" required minLength={6} />
              {form.password && (
                <div style={{ marginTop:8 }}>
                  <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i < pwdScore ? pwdColors[pwdScore-1] : 'var(--border)', transition:'background .3s' }} />
                    ))}
                  </div>
                  <p style={{ fontSize:11, color: pwdColors[pwdScore-1] ?? 'var(--text-4)', margin:0 }}>
                    {pwdLabels[pwdScore-1] ?? ''}
                  </p>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input className="form-input" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" required />
              {form.confirm && form.confirm !== form.password && (
                <p className="form-error">Passwords don't match</p>
              )}
            </div>
          </div>

          <button className="btn btn-p btn-lg" style={{ width:'100%', marginTop:4 }} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <>Create Account <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
          </button>
        </form>

        <div style={{ marginTop:22, textAlign:'center', padding:'14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)' }}>
          <p style={{ fontSize:13.5, color:'var(--text-3)', marginBottom:6 }}>Already registered?</p>
          <Link to="/student/login" className="btn btn-ghost btn-sm" style={{ display:'inline-flex' }}>Sign In →</Link>
        </div>

        <p style={{ textAlign:'center', marginTop:16, fontSize:13 }}>
          <Link to="/" style={{ color:'var(--text-4)', display:'inline-flex', alignItems:'center', gap:5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
