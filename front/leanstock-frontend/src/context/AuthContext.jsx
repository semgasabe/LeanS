import { createContext, useContext, useEffect, useState } from 'react'
import api, { clearSession } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => {
        clearSession()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  function persistSession(data) {
    if (data?.accessToken) {
      localStorage.setItem('access_token', data.accessToken)
    }
    if (data?.refreshToken) {
      localStorage.setItem('refresh_token', data.refreshToken)
    }
    if (data?.user) setUser(data.user)
  }

  async function login(email, password) {
    clearSession()
    const r = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    })
    persistSession(r.data)
    return r.data.user
  }

  /** Register only — no login until email is verified. */
  async function register(payload) {
    clearSession()
    setUser(null)
    const r = await api.post('/auth/register', {
      ...payload,
      email: payload.email.trim().toLowerCase(),
    })
    return r.data
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refresh_token')
    await api.post('/auth/logout', { refreshToken }).catch(() => {})
    clearSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
