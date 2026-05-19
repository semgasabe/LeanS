import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  const icons = { success: CheckCircle, error: XCircle, info: Info }
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts">
        {toasts.map(t => {
          const Icon = icons[t.type] || Info
          const color = t.type === 'success' ? 'var(--green)' : t.type === 'error' ? 'var(--red)' : 'var(--blue)'
          return (
            <div key={t.id} className={`toast ${t.type}`}>
              <Icon size={16} color={color} />
              <span className="toast-msg">{t.msg}</span>
              <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}><X size={13} /></button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
