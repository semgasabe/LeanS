import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, AlertCircle } from 'lucide-react'
import api from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [done, setDone]   = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await api.post('/auth/forgot-password', { email }); setDone(true) }
    catch (e) { setError(e.response?.data?.error || 'Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ background: 'var(--amber)', borderRadius: 8, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="#000" fill="#000" />
          </div>
        </div>
        {done ? (
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <h2 style={{ marginBottom: 8 }}>Email sent</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Check your inbox and follow the instructions to reset your password.</p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>Back to sign in</Link>
          </div>
        ) : (
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ marginBottom: 4 }}>Reset password</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>Enter your email and we'll send a reset link.</p>
            {error && <div className="alert alert-error" style={{ marginBottom: 14 }}><AlertCircle size={15} />{error}</div>}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label>Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></div>
              <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ padding: 10 }}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Send reset link'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Link to="/login" style={{ color: 'var(--amber)', textDecoration: 'none' }}>← Back to sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
