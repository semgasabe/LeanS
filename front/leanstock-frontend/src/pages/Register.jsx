import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, AlertCircle } from 'lucide-react'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

export default function Register() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [form, setForm]   = useState({ name: '', email: '', password: '', tenantId: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.post('/auth/register', { ...form, tenantId: Number(form.tenantId) })
      setDone(true)
      toast('Account created! Check your email to verify.', 'success')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 20 }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
        <h2 style={{ marginBottom: 8 }}>Check your email</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          We sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>.
        </p>
        <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>Sign in</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ background: 'var(--amber)', borderRadius: 8, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="#000" fill="#000" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }}>LeanStock</span>
        </div>
        <div className="card" style={{ padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 4 }}>Create account</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Register a new user</p>
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={15} /> {error}</div>}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group"><label>Full name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" /></div>
            <div className="form-group"><label>Email</label>
              <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" /></div>
            <div className="form-group"><label>Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="At least 8 characters" /></div>
            <div className="form-group"><label>Company ID (Tenant)</label>
              <input type="number" required value={form.tenantId} onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))} placeholder="1" /></div>
            <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ marginTop: 4, padding: 10 }}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Register'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
