import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

export function useApi(url, params = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const paramsKey = JSON.stringify(params)
  const abortRef  = useRef(null)

  const fetch = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(url, { params, signal: abortRef.current.signal })
      setData(res.data)
    } catch (e) {
      if (e.name !== 'CanceledError') setError(e.response?.data?.error || e.message)
    } finally { setLoading(false) }
  }, [url, paramsKey])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
