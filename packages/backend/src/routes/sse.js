const router  = require('express').Router()
const jwt     = require('jsonwebtoken')

const sseClients = new Map()

function emitToUser(userId, type, payload) {
  const res = sseClients.get(userId)
  if (!res) return false
  try {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
    // flush forcé — critique pour mobile (bufferisation proxy/nginx)
    if (typeof res.flush === 'function') res.flush()
    return true
  } catch { return false }
}

function broadcast(type, payload) {
  sseClients.forEach((res, userId) => emitToUser(userId, type, payload))
}

// ── Route SSE ─────────────────────────────────────────────────────
// Le token est passé en query ?token=... car EventSource
// ne supporte pas les headers Authorization sur mobile
router.get('/', (req, res) => {
    
//   const token = req.query.token || req.headers.authorization?.split(' ')[1]

//   if (!token) return res.status(401).json({ error: 'Token manquant' })

    const token =
    req.query.token ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.headers['x-auth-token']

  if (!token) return res.status(401).end()

  let userId
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    userId = decoded.id
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }

  // ── Headers critiques pour mobile ────────────────────────────
  res.setHeader('Content-Type',                'text/event-stream')
  res.setHeader('Cache-Control',               'no-cache, no-transform') // no-transform crucial sur mobile
  res.setHeader('Connection',                  'keep-alive')
  res.setHeader('X-Accel-Buffering',           'no')   // désactive le buffering nginx
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
  res.setHeader('Access-Control-Allow-Headers','Cache-Control')
  res.flushHeaders()

  // Message immédiat — évite le timeout mobile avant le 1er event
  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`)
  if (typeof res.flush === 'function') res.flush()

  sseClients.set(userId, res)
  console.log(`[SSE] Connecté userId=${userId} — total: ${sseClients.size}`)

  // Ping toutes les 15s (mobile tue les connexions inactives plus vite que desktop)
  const ping = setInterval(() => {
    try {
      res.write(`: ping\n\n`)
      if (typeof res.flush === 'function') res.flush()
    } catch {
      clearInterval(ping)
      sseClients.delete(userId)
    }
  }, 15000) // 15s au lieu de 25s pour mobile

  req.on('close', () => {
    clearInterval(ping)
    sseClients.delete(userId)
    console.log(`[SSE] Déconnecté userId=${userId}`)
  })
})

module.exports = { router, emitToUser, broadcast }