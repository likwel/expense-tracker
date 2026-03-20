import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Intervalle polling : 15s si visible, 60s si en arrière-plan
const POLL_VISIBLE  = 15000
const POLL_HIDDEN   = 60000

export const LEVEL_STYLE = {
  danger:  { bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' },
  warning: { bg: '#FAEEDA', color: '#633806', border: '#FAC775' },
  alert:   { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  success: { bg: '#E1F5EE', color: '#085041', border: '#9FE1CB' },
  info:    { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB' },
}

export function useNotifications() {
  const [notifs,      setNotifs]      = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [connected,   setConnected]   = useState(false) // SSE actif ?

  const esRef      = useRef(null)
  const pollRef    = useRef(null)
  const lastIdRef  = useRef(0)  // dernier id reçu — évite les doublons polling

  // ── Fetch BDD — guard si pas de token ───────────────────────
  const fetchNotifs = useCallback(async (silent = false) => {
    if (!localStorage.getItem('token')) return
    try {
      const { data } = await api.get('/notifications?limit=30')
      setNotifs(data.data.map(n => ({ ...n, style: LEVEL_STYLE[n.level] || LEVEL_STYLE.info })))
      setUnreadCount(data.unreadCount)
      // Mettre à jour le dernier id connu
      if (data.data.length > 0) lastIdRef.current = data.data[0].id
    } catch (e){
      console.log(e)
    }
    finally { if (!silent) setLoading(false) }
  }, [])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  // ── Polling — toujours actif, fiable sur mobile ───────────────
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const interval = document.visibilityState === 'visible' ? POLL_VISIBLE : POLL_HIDDEN
    pollRef.current = setInterval(() => fetchNotifs(true), interval)
  }, [fetchNotifs])

  // ── SSE — tentative unique, pas de reconnexion forcée ─────────
  const trySSE = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token || esRef.current) return
    const url = `${API_URL}/sse?token=${encodeURIComponent(token)}`
    let es

    try {
      es = new EventSource(url)
      esRef.current = es
    } catch {
      return // EventSource non supporté → polling seul
    }

    const timeout = setTimeout(() => {
      // Si pas de connexion en 5s → fermer et rester sur polling
      if (es.readyState !== EventSource.OPEN) {
        es.close()
        esRef.current = null
        console.log('[SSE] Timeout — polling actif')
      }
    }, 5000)

    es.onopen = () => {
      clearTimeout(timeout)
      setConnected(true)
      console.log('[SSE] Connecté')
      // SSE connecté → ralentir le polling (30s suffit comme filet de sécurité)
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(() => fetchNotifs(true), 30000)
    }

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'connected') return

        setNotifs(prev => {
          if (data.id && prev.some(n => n.id === data.id)) return prev
          const newNotif = {
            id:        data.id || Date.now(),
            type:      data.type,
            level:     data.level || 'info',
            title:     data.label,
            message:   data.message,
            isRead:    false,
            createdAt: new Date().toISOString(),
            style:     LEVEL_STYLE[data.level] || LEVEL_STYLE.info,
          }
          lastIdRef.current = data.id || lastIdRef.current
          return [newNotif, ...prev]
        })
        setUnreadCount(c => c + 1)
      } catch {}
    }

    es.onerror = () => {
      clearTimeout(timeout)
      es.close()
      esRef.current = null
      setConnected(false)
      // SSE mort → revenir au polling rapide
      startPolling()
      console.log('[SSE] Erreur — retour polling')
    }
  }, [fetchNotifs, startPolling])

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    startPolling() // polling démarre toujours en premier
    trySSE()       // SSE en bonus si supporté

    // Visibilité : ajuster intervalle polling + reconnecter SSE
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifs(true)
        startPolling()
        if (!esRef.current) trySSE()
      } else {
        // Arrière-plan → polling lent
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = setInterval(() => fetchNotifs(true), POLL_HIDDEN)
      }
    }

    const handleOnline = () => {
      fetchNotifs(true)
      startPolling()
      if (!esRef.current) trySSE()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)

    return () => {
      if (esRef.current)  esRef.current.close()
      if (pollRef.current) clearInterval(pollRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
    }
  }, [fetchNotifs, startPolling, trySSE])

  // ── Actions ───────────────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
    await api.patch(`/notifications/${id}/read`).catch(() => {})
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
    await api.patch('/notifications/read-all').catch(() => {})
  }, [])

  const dismiss = useCallback(async (id) => {
    setNotifs(prev => {
      const n = prev.find(x => x.id === id)
      if (n && !n.isRead) setUnreadCount(c => Math.max(0, c - 1))
      return prev.filter(x => x.id !== id)
    })
    await api.delete(`/notifications/${id}`).catch(() => {})
  }, [])

  const dismissAll = useCallback(async () => {
    setNotifs([])
    setUnreadCount(0)
    await api.delete('/notifications/clear-all').catch(() => {})
  }, [])

  return {
    notifs, unreadCount, loading, connected,
    markRead, markAllRead, dismiss, dismissAll,
    refetch: fetchNotifs,
  }
}