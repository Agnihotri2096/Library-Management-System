export function Spinner({ size = 'md', style }) {
  return <div className={`spinner spinner-${size}`} style={style} />;
}

export function SpinnerPage({ label = 'Loading…' }) {
  return (
    <div className="spinner-page-wrap">
      <div style={{ position:'relative', width:48, height:48 }}>
        <div className="spinner spinner-lg" />
        {/* Inner ring */}
        <div style={{
          position:'absolute', inset:8,
          border:'2px solid rgba(124,58,237,.2)',
          borderTop:'2px solid var(--accent)',
          borderRadius:'50%',
          animation:'spin .5s linear infinite reverse',
        }} />
      </div>
      <p>{label}</p>
    </div>
  );
}
