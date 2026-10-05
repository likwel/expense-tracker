import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const STYLES = {
  success: { bg: '#0F6E56', Icon: CheckCircle },
  error:   { bg: '#A32D2D', Icon: AlertTriangle },
  info:    { bg: '#1a1a2e', Icon: Info },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])

  const show = useCallback((message, type = 'info', duration = 3200) => {
    const id = ++idRef.current
    setToasts(t => [...t.slice(-2), { id, message, type }])
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const api = useRef(null)
  api.current = {
    show,
    success: (m, d) => show(m, 'success', d),
    error:   (m, d) => show(m, 'error', d ?? 4500),
    info:    (m, d) => show(m, 'info', d),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => {
          const { bg, Icon } = STYLES[t.type] || STYLES.info
          return (
            <div key={t.id} className="toast" style={{ background: bg }}>
              <Icon size={16} strokeWidth={2.2} style={{ flexShrink: 0 }}/>
              <span style={{ flex: 1 }}>{t.message}</span>
              <button onClick={() => dismiss(t.id)} aria-label="Fermer"
                style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.7, cursor: 'pointer', display: 'flex' }}>
                <X size={14}/>
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// Fallback sur alert() si utilisé hors du provider
const FALLBACK = { show: m => alert(m), success: m => alert(m), error: m => alert(m), info: m => alert(m) }

export function useToast() {
  const ref = useContext(ToastContext)
  return ref ? ref.current : FALLBACK
}
