import { useEffect, useRef } from 'react';

export default function StatCard({ icon, value, label, variant = 'default' }) {
  const valRef = useRef(null);

  useEffect(() => {
    if (typeof value !== 'number' || !valRef.current) return;
    const el  = valRef.current;
    const end = value;
    const dur = 1000;
    const t0  = performance.now();
    function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = Math.floor(eased * end);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = end;
    }
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-icon-wrap">
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value" ref={valRef}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
