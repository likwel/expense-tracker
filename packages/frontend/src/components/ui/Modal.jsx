import { useEffect, useId } from 'react'
import { X } from 'lucide-react'

// Bottom-sheet sur mobile, dialogue centré sur tablette / ordinateur.
// Fermeture : bouton ×, touche Échap ou clic sur le fond.
export default function Modal({ title, onClose, children, maxWidth }) {
  const titleId = useId()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}
        style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-grabber"/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexShrink:0 }}>
          <span id={titleId} style={{ fontWeight:800, fontSize:17, color:'var(--text)' }}>{title}</span>
          <button onClick={onClose} aria-label="Fermer" style={{
            width:32, height:32, borderRadius:16, border:'none', cursor:'pointer',
            background:'#f4f3f9', color:'#888', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <X size={16} strokeWidth={2.2}/>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
