const express        = require('express')
const router         = express.Router()
const prisma         = require('../config/prisma')
const authMiddleware = require('../middleware/auth')
const adminAuth      = require('../middleware/adminAuth')

const authenticate = authMiddleware.authenticate ?? authMiddleware.default ?? authMiddleware

router.use(authenticate, adminAuth)

// ── Helper : sync membres org après activation plan ───────────────
// Met à jour tous les membres des organisations fondées par userId
// avec le même plan et la même planEndAt
async function syncOrgMembers(tx, founderId, planData) {
  const orgs = await tx.organization.findMany({
    where:   { founderId },
    include: { members: { select: { userId: true } } },
  })
  const memberIds = [
    ...new Set(
      orgs.flatMap(o => o.members.map(m => m.userId))
          .filter(id => id !== founderId)
    ),
  ]
  if (memberIds.length === 0) return 0
  await tx.user.updateMany({
    where: { id: { in: memberIds } },
    data:  planData,
  })
  return memberIds.length
}

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
      include: { user: { select: { id: true, name: true, email: true, plan: true, usageType: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(requests)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/payments/:id/approve ─────────────────────────────
router.post('/payments/:id/approve', async (req, res) => {
  try {
    const id      = Number(req.params.id)
    const request = await prisma.paymentRequest.findUnique({
      where:   { id },
      include: { user: { select: { id: true, usageType: true } } },
    })
    if (!request)                     return res.status(404).json({ error: 'Demande introuvable' })
    if (request.status !== 'pending') return res.status(400).json({ error: 'Demande déjà traitée' })

    const now       = new Date()
    const planEndAt = new Date(now)
    planEndAt.setMonth(planEndAt.getMonth() + request.months)

    // Données plan fondateur — trialPlan null car converti en vrai abonnement
    const founderData = {
      plan:         request.planId ?? 'pro',
      trialPlan:    null,
      trialStartAt: null,
      trialEndAt:   null,
      planStartAt:  now,
      planEndAt,
    }

    // Données poussées aux membres (même plan + même expiration)
    const memberData = {
      plan:      request.planId ?? 'pro',
      planEndAt,
      // Les membres ne sont pas en trial propre — leur accès suit le fondateur
    }

    let syncedCount = 0

    await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le fondateur
      await tx.user.update({
        where: { id: request.userId },
        data:  founderData,
      })

      // 2. Approuver la demande
      await tx.paymentRequest.update({
        where: { id },
        data:  { status: 'approved', approvedAt: now },
      })

      // 3. Sync membres si plan famille ou business
      if (['family', 'business'].includes(request.planId)) {
        syncedCount = await syncOrgMembers(tx, request.userId, memberData)
      }
    })

    // 4. Notification aux membres (hors transaction — non bloquant)
    if (syncedCount > 0) {
      const orgs = await prisma.organization.findMany({
        where:   { founderId: request.userId },
        include: { members: { select: { userId: true } } },
      })
      const memberIds = [
        ...new Set(
          orgs.flatMap(o => o.members.map(m => m.userId))
              .filter(id => id !== request.userId)
        ),
      ]
      if (memberIds.length > 0) {
        await prisma.notification.createMany({
          data: memberIds.map(userId => ({
            userId,
            type:     'plan_upgraded',
            level:    'success',
            title:    'Accès mis à jour',
            message:  `Le fondateur de votre organisation a activé le plan ${request.planId}. Votre accès a été mis à jour.`,
            dedupKey: `plan_upgrade_${userId}_${now.getTime()}`,
          })),
          skipDuplicates: true,
        })
      }
    }

    res.json({
      success:     true,
      planId:      request.planId ?? 'pro',
      planEndAt,
      membersSync: syncedCount,
      message:     `Plan activé${syncedCount > 0 ? ` · ${syncedCount} membre(s) synchronisé(s)` : ''}`,
    })
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

    // Notifier l'utilisateur du rejet
    await prisma.notification.create({
      data: {
        userId:   request.userId,
        type:     'payment_rejected',
        level:    'danger',
        title:    'Paiement non validé',
        message:  'Votre demande de paiement n\'a pas pu être validée. Vérifiez votre justificatif et réessayez.',
        dedupKey: `payment_rejected_${request.id}`,
      },
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
        id: true, name: true, email: true, role: true,
        plan: true, trialPlan: true, planEndAt: true, trialEndAt: true,
        currency: true, usageType: true, createdAt: true, isBanned: true,
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
// Active directement un plan (sans paiement) + sync membres org
router.post('/users/:id/setPro', async (req, res) => {
  const { months = 1, planId = 'pro' } = req.body
  try {
    const userId    = Number(req.params.id)
    const now       = new Date()
    const planEndAt = new Date(now)
    planEndAt.setMonth(planEndAt.getMonth() + Number(months))

    const founderData = {
      plan:         planId,
      trialPlan:    null,
      trialStartAt: null,
      trialEndAt:   null,
      planStartAt:  now,
      planEndAt,
    }

    let syncedCount = 0

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: founderData })
      if (['family', 'business'].includes(planId)) {
        syncedCount = await syncOrgMembers(tx, userId, { plan: planId, planEndAt })
      }
    })

    res.json({ success: true, planId, planEndAt, membersSync: syncedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /admin/users/:id/setFree ────────────────────────────────
// Repasse en gratuit + sync membres (retour free aussi pour les membres)
router.post('/users/:id/setFree', async (req, res) => {
  try {
    const userId   = Number(req.params.id)
    const freeData = { plan: 'free', trialPlan: null, trialStartAt: null, trialEndAt: null, planStartAt: null, planEndAt: null }

    let syncedCount = 0

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: freeData })
      syncedCount = await syncOrgMembers(tx, userId, { plan: 'free', planEndAt: null })
    })

    // Notifier les membres
    if (syncedCount > 0) {
      const orgs = await prisma.organization.findMany({
        where:   { founderId: userId },
        include: { members: { select: { userId: true } } },
      })
      const memberIds = [
        ...new Set(
          orgs.flatMap(o => o.members.map(m => m.userId)).filter(id => id !== userId)
        ),
      ]
      if (memberIds.length > 0) {
        await prisma.notification.createMany({
          data: memberIds.map(uid => ({
            userId:   uid,
            type:     'plan_downgraded',
            level:    'warning',
            title:    'Accès modifié',
            message:  'Le fondateur de votre organisation est repassé en plan gratuit. Votre compte a été mis à jour.',
            dedupKey: `plan_downgrade_${uid}_${Date.now()}`,
          })),
          skipDuplicates: true,
        })
      }
    }

    res.json({ success: true, membersSync: syncedCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /admin/organizations ──────────────────────────────────────
router.get('/organizations', async (req, res) => {
  const { q } = req.query
  try {
    const orgs = await prisma.organization.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
      include: {
        founder: { select: { id: true, name: true, email: true, plan: true } },
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
    const now        = new Date()
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startQ     = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)

    const [
      totalUsers, proUsers, trialUsers,
      newUsersThisMonth, totalOrgs, activeOrgs,
      pendingPayments,
      revenueThisMonth, revenueThisQuarter, revenueTotal,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: { not: 'free' }, planEndAt: { gt: now }, trialPlan: null } }),
      prisma.user.count({ where: { trialEndAt: { gt: now } } }),
      prisma.user.count({ where: { createdAt: { gte: startMonth } } }),
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'active' } }),
      prisma.paymentRequest.count({ where: { status: 'pending' } }),
      prisma.paymentRequest.aggregate({ where: { status: 'approved', createdAt: { gte: startMonth } }, _sum: { amount: true } }),
      prisma.paymentRequest.aggregate({ where: { status: 'approved', createdAt: { gte: startQ }     }, _sum: { amount: true } }),
      prisma.paymentRequest.aggregate({ where: { status: 'approved'                                 }, _sum: { amount: true } }),
    ])

    const freeUsers = totalUsers - proUsers - trialUsers

    res.json({
      totalUsers, proUsers, trialUsers, freeUsers,
      newUsersThisMonth, totalOrgs, activeOrgs, pendingPayments,
      revenueThisMonth:   Number(revenueThisMonth._sum.amount   || 0),
      revenueThisQuarter: Number(revenueThisQuarter._sum.amount || 0),
      revenueTotal:       Number(revenueTotal._sum.amount       || 0),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router