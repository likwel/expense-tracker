const router = require('express').Router()
const prisma  = require('../config/prisma')
const auth    = require('../middleware/auth')

router.use(auth)

// ── GET / — liste des notifications (non lues en premier) ─────────
router.get('/', async (req, res) => {
  try {
    const { limit = 20, unreadOnly } = req.query
    const notifs = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        ...(unreadOnly === 'true' ? { isRead: false } : {}),
      },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take:    Number(limit),
    })
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    })
    res.json({ data: notifs, unreadCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PATCH /:id/read — marquer une notification comme lue ─────────
router.patch('/:id/read', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data:  { isRead: true },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PATCH /read-all — tout marquer comme lu ───────────────────────
router.patch('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data:  { isRead: true },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /:id — supprimer une notification ──────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /clear-all — vider toutes les notifications ───────────
router.delete('/clear-all', async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.user.id } })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router