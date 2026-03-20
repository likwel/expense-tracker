import { useState, useEffect } from 'react'
import api from '../utils/api'  // ton instance axios

export function usePlan() {
  const [plan, setPlan]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/plan/status')
      .then(r => setPlan(r.data))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false))
  }, [])

  return { plan, loading }
}