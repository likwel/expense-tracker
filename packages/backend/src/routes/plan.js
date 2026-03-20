const express = require('express')
const router  = express.Router()
const prisma  = require('../config/prisma')
const authMiddleware  = require('../middleware/auth')
const authenticate    = authMiddleware.authenticate ?? authMiddleware.default ?? authMiddleware
const { getEffectivePlan, getLimits } = require('../lib/planLimits')

// GET /api/plan/status  → retourne le plan actif + limites restantes
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const effectivePlan = getEffectivePlan(user)
    const limits        = getLimits(user)

    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [expCount, incCount, catCount] = await Promise.all([
      prisma.expense.count({ where: { userId: user.id, date: { gte: start, lte: end } } }),
      prisma.income.count({  where: { userId: user.id, date: { gte: start, lte: end } } }),
      prisma.category.count({ where: { userId: user.id } }),
    ])

    const txUsed = expCount + incCount

    res.json({
      plan:          user.plan,
      effectivePlan,
      trialEndAt:    user.trialEndAt,
      planEndAt:     user.planEndAt,
      isTrial:       !!(user.trialEndAt && now <= new Date(user.trialEndAt)),
      usage: {
        transactions: {
          used:  txUsed,
          limit: limits.transactionsPerMonth,
          remaining: limits.transactionsPerMonth === Infinity
            ? null
            : Math.max(0, limits.transactionsPerMonth - txUsed),
        },
        categories: {
          used:  catCount,
          limit: limits.categories,
          remaining: limits.categories === Infinity
            ? null
            : Math.max(0, limits.categories - catCount),
        },
      },
      features: {
        budgets:       limits.budgets       !== 0,
        recurring:     limits.recurring     !== 0,
        export:        limits.export,
        multiCurrency: limits.multiCurrency,
        reports:       limits.reports,
      },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/plan/upgrade  → passage au plan Pro (à brancher sur ton système de paiement)
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { months = 1 } = req.body  // durée en mois achetée

    const now      = new Date()
    const planEndAt = new Date(now)
    planEndAt.setMonth(planEndAt.getMonth() + months)

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data:  { plan: 'pro', planStartAt: now, planEndAt },
    })

    res.json({ message: 'Plan Pro activé', planEndAt: user.planEndAt })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/plan/downgrade  → retour au plan gratuit
router.post('/downgrade', authenticate, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data:  { plan: 'free', planEndAt: new Date() },
    })
    res.json({ message: 'Plan gratuit activé' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router