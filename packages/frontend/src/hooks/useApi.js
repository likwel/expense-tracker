// src/hooks/useApi.js
import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { getEntry, isValid } from '../services/apiCache'

export { invalidateCache, invalidateCachePrefix } from '../services/apiCache'

export function useApi(url, params = {}) {
  const paramsKey = JSON.stringify(params)
  const cacheKey  = url ? `${url}::${paramsKey}` : null

  const [data,    setData]    = useState(() => cacheKey ? getEntry(cacheKey).data : null)
  const [loading, setLoading] = useState(() => cacheKey ? !isValid(getEntry(cacheKey)) : false)
  const [error,   setError]   = useState(null)
  const mountedRef = useRef(true)

  const doFetch = useCallback(async (force = false) => {
    if (!url || !cacheKey) return
    const entry = getEntry(cacheKey)

    if (!force && isValid(entry)) {
      setData(entry.data)
      setLoading(false)
      return
    }

    if (entry.pending) {
      try {
        const data = await entry.pending
        if (mountedRef.current) { setData(data); setLoading(false) }
      } catch (e) {
        if (mountedRef.current) { setError(e.message); setLoading(false) }
      }
      return
    }

    if (mountedRef.current) { setLoading(true); setError(null) }

    entry.pending = api.get(url, { params: JSON.parse(paramsKey) })
      .then(res => {
        entry.data    = res.data
        entry.ts      = Date.now()
        entry.pending = null
        entry.listeners.forEach(fn => fn(res.data))
        return res.data
      })
      .catch(e => {
        entry.pending = null
        throw e
      })

    try {
      const data = await entry.pending
      if (mountedRef.current) { setData(data); setLoading(false) }
    } catch (e) {
      if (e.name !== 'CanceledError' && mountedRef.current) {
        setError(e.response?.data?.error || e.message)
        setLoading(false)
      }
    }
  }, [url, cacheKey, paramsKey])

  useEffect(() => {
    mountedRef.current = true
    if (!cacheKey) return
    const entry = getEntry(cacheKey)
    const listener = (data) => { if (mountedRef.current) setData(data) }
    entry.listeners.add(listener)
    doFetch()
    return () => {
      mountedRef.current = false
      entry.listeners.delete(listener)
    }
  }, [cacheKey, doFetch])

  const refetch = useCallback(() => {
    if (cacheKey) getEntry(cacheKey).ts = 0
    doFetch(true)
  }, [cacheKey, doFetch])

  return { data, loading, error, refetch }
}