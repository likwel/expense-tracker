import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authApi } from '../services/api'
import { setRates } from '../utils/format'
import { resetNotifications } from '../hooks/useNotifications'

export const AuthContext = createContext(null)

function saveUser(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user))
  else      localStorage.removeItem('user')
}

function loadUser() {
  try { return JSON.parse(localStorage.getItem('user')) || null }
  catch { return null }
}

export function AuthProvider({ children }) {
  const [user,       setUserState]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [ratesReady, setRatesReady] = useState(false)
  const ratesFetchedFor = useRef(null)

  const setUser = useCallback((updater) => {
    setUserState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveUser(next)
      return next
    })
  }, [])

  // ── Vérifier le token au montage ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      saveUser(null)
      setLoading(false)
      setRatesReady(true)
      return
    }

    authApi.me()
      .then(r => setUser(r.data))
      .catch(() => {
        localStorage.removeItem('token')
        saveUser(null)
        setUserState(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Charger les taux depuis MGA comme pivot (une seule fois) ──
  useEffect(() => {
    if (ratesFetchedFor.current === 'MGA') return
    ratesFetchedFor.current = 'MGA'

    fetch('https://open.er-api.com/v6/latest/MGA')
      .then(r => r.json())
      .then(d => {
        if (!d.rates) return
        // d.rates = { EUR: 0.000203, USD: 0.000222, ... }
        // Signification : 1 MGA = X devise  ← pivot utilisé par convert() front
        setRates(d.rates)
      })
      .catch(() => {
        console.warn('[AuthContext] Impossible de charger les taux de change')
      })
      .finally(() => setRatesReady(true))
  }, [])   // ← pas de dépendance sur defaultCurrency, le pivot est toujours MGA

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const register = async (credentials) => {
    const { data } = await authApi.register(credentials)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('activeOrgId')
    localStorage.removeItem('user')
    resetNotifications()
    saveUser(null)
    setUserState(null)
    ratesFetchedFor.current = null
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, ratesReady, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)