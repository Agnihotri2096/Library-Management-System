export default function EmptyState({ icon = '📭', title, desc, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" role="img" aria-label={title}>{icon}</span>
      <p className="empty-title">{title}</p>
      {desc   && <p className="empty-desc">{desc}</p>}
      {action && <div style={{ marginTop:20 }}>{action}</div>}
    </div>
  );
}
