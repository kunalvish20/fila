export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true">
    <div className="modal-card">
      <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}>×</button></div>
      {children}
    </div>
  </div>;
}
