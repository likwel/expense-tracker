const express    = require('express')
const router     = express.Router()
const prisma     = require('../config/prisma')
const authMiddleware = require('../middleware/auth')
const adminAuth      = require('../middleware/adminAuth')

const authenticate = authMiddleware.authenticate ?? authMiddleware.default ?? authMiddleware

// Toutes les routes admin nécessitent auth + role admin
router.use(authenticate, adminAuth)

// ── GET /admin/payments/count ─────────────────────────────────────
router.get('/payments/count', async (req, res) => {
  try {
    const pending = await prisma.paymentRequest.count({ where: { status: 'pending' } })
    res.json({ pending })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /admin/payments ───────────────────────────────────────────
router.get('/payments', async (req, res) => {
  const { status } = req.query
  try {
    const requests = await prisma.paymentRequest.findMany({
      where:   status && status !== 'all' ? { status } : {},
      include: { user: { select: { id:true, name:true, email:true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(requests)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/payments/:id/approve ─────────────────────────────
router.post('/payments/:id/approve', async (req, res) => {
  try {
    const id      = Number(req.params.id)
    const request = await prisma.paymentRequest.findUnique({ where: { id } })
    if (!request)                     return res.status(404).json({ error: 'Demande introuvable' })
    if (request.status !== 'pending') return res.status(400).json({ error: 'Demande déjà traitée' })

    const planEndAt = new Date()
    planEndAt.setMonth(planEndAt.getMonth() + request.months)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.userId },
        data:  { plan: 'pro', planStartAt: new Date(), planEndAt, trialEndAt: null },
      }),
      prisma.paymentRequest.update({
        where: { id },
        data:  { status: 'approved', approvedAt: new Date() },
      }),
    ])
    res.json({ success: true, planEndAt })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/payments/:id/reject ──────────────────────────────
router.post('/payments/:id/reject', async (req, res) => {
  try {
    const id      = Number(req.params.id)
    const request = await prisma.paymentRequest.findUnique({ where: { id } })
    if (!request)                     return res.status(404).json({ error: 'Demande introuvable' })
    if (request.status !== 'pending') return res.status(400).json({ error: 'Demande déjà traitée' })

    await prisma.paymentRequest.update({
      where: { id },
      data:  { status: 'rejected' },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /admin/users ──────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const { q } = req.query
  try {
    const users = await prisma.user.findMany({
      where: q ? {
        OR: [
          { name:  { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      } : {},
      select: {
        id:true, name:true, email:true, role:true,
        plan:true, planEndAt:true, trialEndAt:true,
        currency:true, usageType:true, createdAt:true,
        isBanned: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json(users)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/users/:id/ban ─────────────────────────────────────
router.post('/users/:id/ban', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data:  { isBanned: true },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/users/:id/unban ───────────────────────────────────
router.post('/users/:id/unban', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data:  { isBanned: false },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/users/:id/delete ──────────────────────────────────
router.post('/users/:id/delete', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/users/:id/promote ────────────────────────────────
router.post('/users/:id/promote', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data:  { role: 'admin' },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/users/:id/setPro ─────────────────────────────────
router.post('/users/:id/setPro', async (req, res) => {
  const { months = 1 } = req.body
  try {
    const planEndAt = new Date()
    planEndAt.setMonth(planEndAt.getMonth() + Number(months))
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data:  { plan: 'pro', planStartAt: new Date(), planEndAt },
    })
    res.json({ success: true, planEndAt })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/users/:id/setFree ────────────────────────────────
router.post('/users/:id/setFree', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data:  { plan: 'free', planEndAt: null },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /admin/organizations ──────────────────────────────────────
router.get('/organizations', async (req, res) => {
  const { q } = req.query
  try {
    const orgs = await prisma.organization.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
      include: {
        founder: { select: { id:true, name:true, email:true } },
        _count:  { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json(orgs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/organizations/:id/suspend ────────────────────────
router.post('/organizations/:id/suspend', async (req, res) => {
  try {
    await prisma.organization.update({
      where: { id: Number(req.params.id) },
      data:  { status: 'suspended' },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/organizations/:id/activate ───────────────────────
router.post('/organizations/:id/activate', async (req, res) => {
  try {
    await prisma.organization.update({
      where: { id: Number(req.params.id) },
      data:  { status: 'active' },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/organizations/:id/delete ─────────────────────────
router.post('/organizations/:id/delete', async (req, res) => {
  try {
    await prisma.organization.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /admin/stats ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const now         = new Date()
    const startMonth  = new Date(now.getFullYear(), now.getMonth(), 1)
    const startQ      = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1)

    const [
      totalUsers, proUsers, trialUsers,
      newUsersThisMonth, totalOrgs, activeOrgs,
      pendingPayments,
      revenueThisMonth, revenueThisQuarter, revenueTotal,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: 'pro', planEndAt: { gt: now } } }),
      prisma.user.count({ where: { trialEndAt: { gt: now } } }),
      prisma.user.count({ where: { createdAt: { gte: startMonth } } }),
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'active' } }),
      prisma.paymentRequest.count({ where: { status: 'pending' } }),
      prisma.paymentRequest.aggregate({ where: { status:'approved', createdAt:{ gte: startMonth } }, _sum:{ amount:true } }),
      prisma.paymentRequest.aggregate({ where: { status:'approved', createdAt:{ gte: startQ }     }, _sum:{ amount:true } }),
      prisma.paymentRequest.aggregate({ where: { status:'approved'                                }, _sum:{ amount:true } }),
    ])

    const freeUsers = totalUsers - proUsers - trialUsers

    res.json({
      totalUsers, proUsers, trialUsers, freeUsers,
      newUsersThisMonth, totalOrgs, activeOrgs, pendingPayments,
      revenueThisMonth:    revenueThisMonth._sum.amount    || 0,
      revenueThisQuarter:  revenueThisQuarter._sum.amount  || 0,
      revenueTotal:        revenueTotal._sum.amount        || 0,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router