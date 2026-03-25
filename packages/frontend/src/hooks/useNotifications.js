import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const POLL_VISIBLE = 15000
const POLL_HIDDEN  = 60000

export const LEVEL_STYLE = {
  danger:  { bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' },
  warning: { bg: '#FAEEDA', color: '#633806', border: '#FAC775' },
  alert:   { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  success: { bg: '#E1F5EE', color: '#085041', border: '#9FE1CB' },
  info:    { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB' },
}

// ✅ État singleton — partagé entre tous les composants
let _notifs      = []
let _unreadCount = 0
let _loading     = true
let _connected   = false
let _listeners   = new Set()       // composants abonnés
let _pollRef     = null
let _esRef       = null
let _initialized = false

// Notifie tous les composants abonnés
const notify = () => _listeners.forEach(fn => fn({
  notifs: _notifs,
  unreadCount: _unreadCount,
  loading: _loading,
  connected: _connected,
}))

const fetchNotifs = async (silent = false) => {
  if (!localStorage.getItem('token')) return
  try {
    const { data } = await api.get('/notifications?limit=30')
    _notifs      = data.data.map(n => ({ ...n, style: LEVEL_STYLE[n.level] || LEVEL_STYLE.info }))
    _unreadCount = data.unreadCount
    if (!silent) _loading = false
    notify()
  } catch {
    if (!silent) { _loading = false; notify() }
  }
}

const startPolling = (interval = null) => {
  if (_pollRef) clearInterval(_pollRef)
  const ms = interval ?? (document.visibilityState === 'visible' ? POLL_VISIBLE : POLL_HIDDEN)
  _pollRef = setInterval(() => fetchNotifs(true), ms)
}

const trySSE = () => {
  const token = localStorage.getItem('token')
  if (!token || _esRef) return
  const url = `${API_URL}/sse?token=${encodeURIComponent(token)}`
  let es
  try { es = new EventSource(url) } catch { return }
  _esRef = es

  const timeout = setTimeout(() => {
    if (es.readyState !== EventSource.OPEN) {
      es.close(); _esRef = null
    }
  }, 5000)

  es.onopen = () => {
    clearTimeout(timeout)
    _connected = true; notify()
    startPolling(30000) // SSE actif → polling lent
  }

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      if (data.type === 'connected') return
      if (data.id && _notifs.some(n => n.id === data.id)) return
      const newNotif = {
        id: data.id || Date.now(), type: data.type,
        level: data.level || 'info', title: data.label,
        message: data.message, isRead: false,
        createdAt: new Date().toISOString(),
        style: LEVEL_STYLE[data.level] || LEVEL_STYLE.info,
      }
      _notifs      = [newNotif, ..._notifs]
      _unreadCount = _unreadCount + 1
      notify()
    } catch {}
  }

  es.onerror = () => {
    clearTimeout(timeout)
    es.close(); _esRef = null
    _connected = false; notify()
    startPolling() // SSE mort → polling rapide
  }
}

const initSingleton = () => {
  if (_initialized) return
  _initialized = true

  fetchNotifs()
  startPolling()
  trySSE()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchNotifs(true); startPolling()
      if (!_esRef) trySSE()
    } else {
      startPolling(POLL_HIDDEN)
    }
  })

  window.addEventListener('online', () => {
    fetchNotifs(true); startPolling()
    if (!_esRef) trySSE()
  })
}

// ✅ Actions partagées
const actions = {
  markRead: async (id) => {
    _notifs      = _notifs.map(n => n.id === id ? { ...n, isRead: true } : n)
    _unreadCount = Math.max(0, _unreadCount - 1)
    notify()
    await api.patch(`/notifications/${id}/read`).catch(() => {})
  },
  markAllRead: async () => {
    _notifs      = _notifs.map(n => ({ ...n, isRead: true }))
    _unreadCount = 0
    notify()
    await api.patch('/notifications/read-all').catch(() => {})
  },
  dismiss: async (id) => {
    const n = _notifs.find(x => x.id === id)
    if (n && !n.isRead) _unreadCount = Math.max(0, _unreadCount - 1)
    _notifs = _notifs.filter(x => x.id !== id)
    notify()
    await api.delete(`/notifications/${id}`).catch(() => {})
  },
  dismissAll: async () => {
    _notifs = []; _unreadCount = 0
    notify()
    await api.delete('/notifications/clear-all').catch(() => {})
  },
  refetch: () => fetchNotifs(),
}

// ✅ Hook — s'abonne au singleton, pas de requête propre
export function useNotifications() {
  const [state, setState] = useState({
    notifs: _notifs,
    unreadCount: _unreadCount,
    loading: _loading,
    connected: _connected,
  })

  useEffect(() => {
    // S'abonner aux mises à jour
    _listeners.add(setState)
    // Initialiser le singleton une seule fois
    initSingleton()
    return () => { _listeners.delete(setState) }
  }, [])

  return { ...state, ...actions }
}

// Réinitialise le singleton à la déconnexion
export const resetNotifications = () => {
  if (_pollRef) clearInterval(_pollRef)
  if (_esRef)   { _esRef.close(); _esRef = null }
  _notifs = []; _unreadCount = 0; _loading = true
  _connected = false; _initialized = false
  notify()
}