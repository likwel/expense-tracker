import { useState, useEffect } from 'react'
import api from '../utils/api'

// ✅ Cache module-level — partagé entre tous les composants
let cache     = null
let fetchedAt = 0
let pending   = null  // Promise en cours pour éviter les requêtes simultanées
const TTL     = 60_000 // 1 minute

export function usePlan() {
  const [plan,    setPlan]    = useState(cache)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    const now = Date.now()

    // Cache encore valide → pas de requête
    if (cache && now - fetchedAt < TTL) {
      setPlan(cache)
      setLoading(false)
      return
    }

    // Requête déjà en cours → attendre la même Promise
    if (!pending) {
      pending = api.get('/plan/status')
        .then(r => {
          cache     = r.data
          fetchedAt = Date.now()
          return r.data
        })
        .catch(() => null)
        .finally(() => { pending = null })
    }

    pending.then(data => {
      setPlan(data)
      setLoading(false)
    })
  }, [])

  // Permet de forcer un refresh si besoin
  const refetch = () => {
    cache     = null
    fetchedAt = 0
    setLoading(true)
    api.get('/plan/status')
      .then(r => { cache = r.data; fetchedAt = Date.now(); setPlan(r.data) })
      .catch(() => setPlan(null))
      .finally(() => setLoading(false))
  }

  return { plan, loading, refetch }
}