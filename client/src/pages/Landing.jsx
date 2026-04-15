import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

const features = [
  { icon: '⚡', text: 'QR scan issue in seconds' },
  { icon: '📅', text: '14-day loan, ₹2/day fine' },
  { icon: '🔔', text: 'Email overdue reminders' },
  { icon: '🎴', text: 'Digital student ID card' },
];

export default function Landing() {
  const { isLoggedIn, user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) return;
    nav(user?.role === 'librarian' ? '/librarian/dashboard' : '/student/dashboard', { replace: true });
  }, [isLoggedIn]);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-deep)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', position:'relative', overflow:'hidden' }}>

      {/* Background */}
      <div className="landing-bg">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>
      <div className="grid-bg" />

      {/* Content */}
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:900 }}>

        {/* Badge */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.25)', borderRadius:'var(--r-full)', padding:'5px 16px', fontSize:12.5, fontWeight:600, color:'var(--primary-lt)', animation:'fadeInUp .5s ease' }}>
            <span style={{ width:6, height:6, background:'var(--accent-lt)', borderRadius:'50%', display:'inline-block', animation:'pulseGlow 2s ease-in-out infinite' }} />
            Govt. Hydro Engineering College · Bilaspur
          </div>
        </div>

        {/* Heading */}
        <h1 style={{
          fontFamily:'var(--font-h)', textAlign:'center',
          fontSize:'clamp(2.4rem,6vw,4.2rem)', fontWeight:900,
          marginBottom:18, letterSpacing:'-.04em',
          background:'linear-gradient(145deg,#f0f4ff 20%,#c4b5fd 55%,#38bdf8 85%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          backgroundClip:'text', lineHeight:1.08,
          animation:'fadeInUp .5s .1s ease both',
        }}>
          GHEC Library
        </h1>

        <p style={{ textAlign:'center', fontSize:'clamp(.95rem,2vw,1.1rem)', color:'var(--text-3)', maxWidth:520, margin:'0 auto 20px', lineHeight:1.7, animation:'fadeInUp .5s .2s ease both' }}>
          Government Hydro Engineering College, Bandla, Bilaspur — digital library system for issuing books, tracking dues, and student ID cards.
        </p>

        {/* Mini feature pills */}
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10, marginBottom:52, animation:'fadeInUp .5s .3s ease both' }}>
          {features.map(f => (
            <span key={f.text} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:500, color:'var(--text-2)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', borderRadius:'var(--r-full)', padding:'5px 14px' }}>
              <span>{f.icon}</span> {f.text}
            </span>
          ))}
        </div>

        {/* Portal cards */}
        <div className="bento-grid" style={{ animation:'fadeInUp .5s .4s ease both' }}>
          <Link to="/student/login" className="portal-card" style={{ textDecoration:'none' }}>
            <div className="portal-card-icon" style={{ background:'var(--grad-p)', boxShadow:'0 8px 28px rgba(124,58,237,.35)' }}>
              🎓
            </div>
            <h2 style={{ color:'var(--text-1)' }}>Student Portal</h2>
            <p className="portal-card-desc">Track your borrowed books, manage due dates, and show off your personalized digital ID card.</p>
            <ul className="portal-features">
              {['View issued & past books','Due date & fine tracker','Customizable digital ID card','Overdue notifications'].map(f => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button className="btn btn-p" style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:14, borderRadius:'var(--r-lg)' }}>
              Enter Student Portal
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </Link>

          <Link to="/librarian/login" className="portal-card accent-card" style={{ textDecoration:'none' }}>
            <div className="portal-card-icon" style={{ background:'var(--grad-a)', boxShadow:'0 8px 28px rgba(14,165,233,.35)' }}>
              📋
            </div>
            <h2 style={{ color:'var(--text-1)' }}>Librarian Portal</h2>
            <p className="portal-card-desc">Manage the entire library — issue books by QR scan, track overdue, and browse students branch-wise.</p>
            <ul className="portal-features" style={{ '--li-color':'var(--accent)' }}>
              {['QR scan to issue books','Branch-wise student view','Mark books as returned','Full book inventory + labels'].map(f => (
                <li key={f} style={{ '--dot-bg':'var(--accent)' }}>{f}</li>
              ))}
            </ul>
            <button className="btn btn-a" style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:14, borderRadius:'var(--r-lg)' }}>
              Enter Librarian Portal
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </Link>
        </div>

        {/* Footer note */}
        <p style={{ textAlign:'center', marginTop:36, fontSize:12.5, color:'var(--text-4)', animation:'fadeInUp .5s .6s ease both' }}>
          Loan period&nbsp;
          <strong style={{ color:'var(--text-3)' }}>14 days</strong>
          &nbsp;·&nbsp;Fine&nbsp;
          <strong style={{ color:'var(--text-3)' }}>₹2 / day</strong>
          &nbsp;overdue&nbsp;·&nbsp;
          <a href="https://ghec.ac.in" target="_blank" rel="noreferrer" style={{ color:'var(--text-4)' }}>ghec.ac.in ↗</a>
        </p>
      </div>
    </div>
  );
}
