import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Register() {
  const { register } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      setDone(true)
      toast('Письмо отправлено — подтвердите email', 'success')
    } catch (err) {
      const msg = err.response?.data?.error
      const details = err.response?.data?.details
      setError(
        msg
          ? (Array.isArray(details) ? `${msg}: ${details.map((d) => d.message).join('; ')}` : msg)
          : 'Registration failed'
      )
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 20 }}>
        <div className="card" style={{ maxWidth: 400, width: '100%', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
          <h2 style={{ marginBottom: 8 }}>Проверьте почту</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            Мы отправили ссылку для подтверждения на
          </p>
          <p style={{ fontWeight: 600, marginBottom: 16 }}>{form.email}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>
            После подтверждения перейдите на страницу входа.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Перейти к входу
          </Link>
        </div>
      </div>
    )
  }

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
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              После регистрации нужно подтвердить email, затем войти
            </p>
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={15} /> {error}</div>}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group"><label>Full name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" /></div>
            <div className="form-group"><label>Email</label>
              <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" /></div>
            <div className="form-group"><label>Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars, 1 uppercase, 1 number" />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Example: Admin1234</p>
            </div>
            <div className="form-group"><label>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
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
