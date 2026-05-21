import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const toast = useToast()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const verifiedRef = useRef(false)

  useEffect(() => {
    if (verifiedRef.current) return
    if (!token) {
      setStatus('error')
      setMessage('Ссылка недействительна: нет токена')
      return
    }

    verifiedRef.current = true

    api
      .get(`/auth/verify-email/${encodeURIComponent(token)}`)
      .then((r) => {
        setStatus('ok')
        setMessage(r.data.message || 'Email подтверждён')
        toast('Email подтверждён — можно войти', 'success')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'Не удалось подтвердить email')
      })
  }, [token, toast])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 20 }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: 32, textAlign: 'center' }}>
        {status === 'loading' && <p>Подтверждаем email…</p>}
        {status === 'ok' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2>Готово</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{message}</p>
            <Link to="/login" className="btn btn-primary">Войти</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
            <h2>Ошибка</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{message}</p>
            <Link to="/register" className="btn btn-secondary">Регистрация</Link>
          </>
        )}
      </div>
    </div>
  )
}
