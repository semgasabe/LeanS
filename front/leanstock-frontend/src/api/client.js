import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL,
  withCredentials: true,
})

function isAuthEndpoint(url = '') {
  return /\/auth\/(login|register|refresh|logout)(\?|$)/.test(url)
}

function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

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
    const status = err.response?.status

    if (status !== 401 || !orig || orig._retry || isAuthEndpoint(orig.url)) {
      return Promise.reject(err)
    }

    const storedRefresh = localStorage.getItem('refresh_token')
    if (!storedRefresh) {
      clearSession()
      const onPublic = /^\/(login|register|forgot-password|reset-password|verify)/.test(
        window.location.pathname
      )
      if (!onPublic) window.location.href = '/login'
      return Promise.reject(err)
    }

    orig._retry = true

    if (!refreshing) {
      refreshing = axios
        .post(`${baseURL}/auth/refresh`, { refreshToken: storedRefresh }, { withCredentials: true })
        .then((r) => {
          if (r.data.accessToken) {
            localStorage.setItem('access_token', r.data.accessToken)
          }
          if (r.data.refreshToken) {
            localStorage.setItem('refresh_token', r.data.refreshToken)
          }
          refreshing = null
          return r.data.accessToken
        })
        .catch((e) => {
          refreshing = null
          clearSession()
          const onPublic = /^\/(login|register|forgot-password)/.test(window.location.pathname)
          if (!onPublic) window.location.href = '/login'
          return Promise.reject(e)
        })
    }

    try {
      const token = await refreshing
      orig.headers.Authorization = `Bearer ${token}`
      return api(orig)
    } catch (e) {
      return Promise.reject(e)
    }
  }
)

export { clearSession }
export default api
