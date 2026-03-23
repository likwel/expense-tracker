import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'
import { setRates } from '../utils/format'

export const AuthContext = createContext(null)

// ── Persistance localStorage ──────────────────────────────────────
function saveUser(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user))
  else      localStorage.removeItem('user')
}

function loadUser() {
  try { return JSON.parse(localStorage.getItem('user')) || null }
  catch { return null }
}

export function AuthProvider({ children }) {
  // Initialiser depuis localStorage pour éviter le flash de contenu
  const [user,      setUserState] = useState(loadUser)
  const [loading,   setLoading]   = useState(true)
  const [ratesReady, setRatesReady] = useState(false)

  // ── setUser — met à jour state + localStorage ─────────────────
  const setUser = useCallback((updater) => {
    setUserState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveUser(next)
      return next
    })
  }, [])

  // ── Recharger l'user depuis l'API au montage ──────────────────
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(r => {
        setUser(r.data)   // met à jour state + localStorage avec données fraîches
      })
      .catch(() => {
        localStorage.removeItem('token')
        saveUser(null)
        setUserState(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Charger les taux dès que l'user est connu ────────────────
  useEffect(() => {
    const base = user?.defaultCurrency || 'MGA'
    fetch(`https://open.er-api.com/v6/latest/${base}`)
      .then(r => r.json())
      .then(d => {
        if (!d.rates) return
        if (base === 'MGA') {
          setRates(d.rates)
        } else {
          const mgaRate  = d.rates['MGA'] || 1
          const mgaRates = {}
          Object.entries(d.rates).forEach(([code, rate]) => {
            mgaRates[code] = rate / mgaRate
          })
          setRates(mgaRates)
        }
      })
      .catch(() => {})
      .finally(() => setRatesReady(true))   // ← marque les taux comme prêts
  }, [user?.defaultCurrency])
  const login = async (credentials) => {
    const { data } = await authApi.login(credentials)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  // ── Register ──────────────────────────────────────────────────
  const register = async (credentials) => {
    const { data } = await authApi.register(credentials)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  // ── Logout ────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token')
    saveUser(null)
    setUserState(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, ratesReady, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)