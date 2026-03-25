// src/contexts/OrgContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const OrgContext = createContext(null)
const STORAGE_KEY = 'activeOrgId'

export function OrgProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [orgs,      setOrgs]      = useState([])
  const [activeOrg, setActiveOrg] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    // ✅ Attendre que l'auth soit prête ET que l'user soit connecté
    if (authLoading) return
    if (!user) { setLoading(false); return }
    if (fetchedRef.current) return
    fetchedRef.current = true

    api.get('/organizations/mine')
      .then(r => {
        const list = r.data || []
        setOrgs(list)
        const savedId = localStorage.getItem(STORAGE_KEY)
        if (savedId) {
          const found = list.find(o => String(o.id) === savedId)
          if (found) setActiveOrg(found)
        }
      })
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false))
  }, [authLoading, user]) // ✅ dépend de l'état auth

  const switchOrg = useCallback((org) => {
    setActiveOrg(org)
    if (org) localStorage.setItem(STORAGE_KEY, String(org.id))
    else     localStorage.removeItem(STORAGE_KEY)
  }, [])

  // ✅ Reset quand l'user se déconnecte
  useEffect(() => {
    if (!user) {
      setOrgs([])
      setActiveOrg(null)
      fetchedRef.current = false
    }
  }, [user])

  return (
    <OrgContext.Provider value={{ orgs, activeOrg, switchOrg, loading }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => {
  const ctx = useContext(OrgContext)
  return ctx || { orgs: [], activeOrg: null, switchOrg: () => {}, loading: false }
}