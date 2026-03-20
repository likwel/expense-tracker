import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
})

// ── Request : injecte le token JWT ────────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response : gère les erreurs globalement ───────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status

    // Token expiré ou invalide → déconnexion automatique
    if (status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }

    // Limite plan atteinte → on enrichit l'erreur pour l'UI
    if (status === 403 && err.response?.data?.upgrade) {
      err.isPlanLimit = true
      err.planMessage = err.response.data.error
    }

    return Promise.reject(err)
  }
)

export default api