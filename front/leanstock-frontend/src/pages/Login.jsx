import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const toast     = useToast()
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(form.email, form.password)
      toast('Welcome back!', 'success')
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20,
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(var(--border-dim) 1px, transparent 1px), linear-gradient(90deg, var(--border-dim) 1px, transparent 1px)`,
        backgroundSize: '40px 40px', opacity: 0.5,
      }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ background: 'var(--amber)', borderRadius: 8, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(245,158,11,0.4)' }}>
            <Zap size={22} color="#000" fill="#000" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }}>LeanStock</span>
        </div>
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 4 }}>Sign in</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Inventory management system</p>
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={15} /> {error}</div>}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" required autoFocus value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8 }}>
              <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ marginTop: 4, padding: '10px' }}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Sign in'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 500 }}>Register</Link>
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>© 2025 LeanStock — Inventory Management System</p>
      </div>
    </div>
  )
}
