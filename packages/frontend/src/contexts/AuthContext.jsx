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
  const [user,       setUserState]  = useState(null)      // ✅ null par défaut, pas loadUser
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
      // Pas de token → nettoyer le localStorage au cas où
      saveUser(null)
      setLoading(false)
      setRatesReady(true)
      return
    }

    // Token présent → valider avec le serveur
    authApi.me()
      .then(r => {
        // ✅ Token valide : mettre à jour user depuis le serveur (pas le localStorage)
        setUser(r.data)
      })
      .catch(err => {
        // ✅ Token invalide ou expiré : tout nettoyer
        localStorage.removeItem('token')
        saveUser(null)
        setUserState(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Charger les taux quand la devise de base change ───────────
  useEffect(() => {
    const base = user?.defaultCurrency || 'MGA'
    if (ratesFetchedFor.current === base) return
    ratesFetchedFor.current = base

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
      .finally(() => setRatesReady(true))
  }, [user?.defaultCurrency])

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
    localStorage.removeItem('user')          // ✅ effacer explicitement
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