import axios from 'axios'

// Production: /api/v1 (proxied by nginx to backend). Dev: vite proxy or .env override.
const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL,
  withCredentials: true,
})

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

let refreshing = null

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      const refreshBase = import.meta.env.VITE_API_URL || '/api/v1'
      if (!refreshing) {
        refreshing = axios
          .post(`${refreshBase}/auth/refresh`, {}, { withCredentials: true })
          .then((r) => {
            localStorage.setItem('access_token', r.data.accessToken)
            refreshing = null
            return r.data.accessToken
          })
          .catch((e) => {
            refreshing = null
            localStorage.removeItem('access_token')
            window.location.href = '/login'
            return Promise.reject(e)
          })
      }
      const token = await refreshing
      orig.headers.Authorization = `Bearer ${token}`
      return api(orig)
    }
    return Promise.reject(err)
  }
)

export default api
