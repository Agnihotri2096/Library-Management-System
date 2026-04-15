import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, children, maxWidth = 560 }) {
  if (!open) return null;
  return createPortal(
    <div className="modal-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-hd">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-x" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
