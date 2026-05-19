import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

// Inject access token
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

let refreshing = null

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      if (!refreshing) {
        refreshing = axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
          .then(r => {
            localStorage.setItem('access_token', r.data.accessToken)
            refreshing = null
            return r.data.accessToken
          })
          .catch(e => {
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
