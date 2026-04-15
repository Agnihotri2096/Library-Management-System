import { fmtDate, daysLeft } from '../api';

export function branchBadge(b) {
  const map = { CSE:'badge-cse', EE:'badge-ee', Civil:'badge-civil' };
  return <span className={`badge ${map[b] ?? 'badge-p'}`}>{b}</span>;
}

export function statusBadge(s) {
  const cls = { active:'badge-active', overdue:'badge-overdue', returned:'badge-returned' };
  const lbl = { active:'Active', overdue:'Overdue ↑', returned:'Returned' };
  return <span className={`badge ${cls[s] ?? 'badge-p'}`}>{lbl[s] ?? s}</span>;
}

export default function BookCard({ book, actions }) {
  const days     = book.status !== 'returned' ? daysLeft(book.due_date) : null;
  const isOver   = days !== null && days < 0;
  const barClass = days === null ? '' : days < 0 ? 'danger' : days <= 3 ? 'warn' : 'safe';
  const barPct   = days === null ? 0 : Math.max(0, Math.min(100, (days / 14) * 100));

  return (
    <div className="book-card" style={{ borderColor: isOver ? 'rgba(239,68,68,.25)' : undefined }}>
      {/* Cover spine */}
      <div className="book-cover" style={{ background: book.cover_color ?? '#7c3aed' }}>
        <div className="book-cover-spine" />
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:4 }}>
          <div>
            <div className="book-title">{book.title}</div>
            <div className="book-author">{book.author}</div>
          </div>
          {statusBadge(book.status)}
        </div>

        <div className="book-meta" style={{ marginTop:6 }}>
          {book.status !== 'returned' ? (
            <span style={{ fontSize:12.5, color: isOver ? 'var(--danger-lt)' : days <= 3 ? 'var(--warning-lt)' : 'var(--text-3)', fontWeight: isOver ? 600 : 400 }}>
              {isOver
                ? `${Math.abs(days)}d overdue · Fine: ₹${book.fine_amount ?? Math.abs(days) * 2}`
                : days === 0 ? 'Due today!'
                : `${days}d remaining`}
            </span>
          ) : (
            <span style={{ fontSize:12.5, color:'var(--text-3)' }}>
              Returned {fmtDate(book.returned_at)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {book.status !== 'returned' && (
          <div className="prog" style={{ marginTop:8 }}>
            <div className={`prog-fill ${barClass}`} style={{ width:`${barPct}%` }} />
          </div>
        )}

        {/* Due date */}
        <div style={{ fontSize:12, color:'var(--text-4)', marginTop:6 }}>
          {book.status === 'returned'
            ? `Issued ${fmtDate(book.issued_at)}`
            : `Due ${fmtDate(book.due_date)}`}
        </div>

        {/* Actions */}
        {actions && <div style={{ marginTop:10 }}>{actions}</div>}
      </div>
    </div>
  );
}
