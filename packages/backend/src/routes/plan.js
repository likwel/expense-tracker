const express = require('express')
const router  = express.Router()
const prisma  = require('../config/prisma')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const authMiddleware              = require('../middleware/auth')
const authenticate                = authMiddleware.authenticate ?? authMiddleware.default ?? authMiddleware
const { getEffectivePlan, getLimits } = require('../lib/planLimits')

// ── Multer — stockage justificatifs ───────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/justificatifs')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Format non supporté'))
  },
})

// ── GET /api/plan/status ─────────────────────────────────────────
router.get('/status', authenticate, async (req, res) => {
  try {
    const user          = await prisma.user.findUnique({ where: { id: req.user.id } })
    const effectivePlan = getEffectivePlan(user)
    const limits        = getLimits(user)

    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [expCount, incCount, catCount] = await Promise.all([
      prisma.expense.count({  where: { userId: user.id, date: { gte: start, lte: end } } }),
      prisma.income.count({   where: { userId: user.id, date: { gte: start, lte: end } } }),
      prisma.category.count({ where: { userId: user.id } }),
    ])

    const txUsed = expCount + incCount

    res.json({
      plan: user.plan,
      effectivePlan,
      trialEndAt: user.trialEndAt,
      planEndAt:  user.planEndAt,
      isTrial:    !!(user.trialEndAt && now <= new Date(user.trialEndAt)),
      usage: {
        transactions: {
          used:      txUsed,
          limit:     limits.transactionsPerMonth,
          remaining: limits.transactionsPerMonth === Infinity
            ? null : Math.max(0, limits.transactionsPerMonth - txUsed),
        },
        categories: {
          used:      catCount,
          limit:     limits.categories,
          remaining: limits.categories === Infinity
            ? null : Math.max(0, limits.categories - catCount),
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
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/plan/upgrade ───────────────────────────────────────
// Activation directe (sans paiement) — utilisé en interne / admin
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { months = 1 } = req.body
    const now       = new Date()
    const planEndAt = new Date(now)
    planEndAt.setMonth(planEndAt.getMonth() + Number(months))

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data:  { plan: 'pro', planStartAt: now, planEndAt },
    })
    res.json({ message: 'Plan Pro activé', planEndAt: user.planEndAt })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/plan/upgrade/mobile-money ─────────────────────────
// Reçoit le justificatif, crée une demande en attente de vérification
router.post('/upgrade/mobile-money', authenticate, upload.single('justificatif'), async (req, res) => {
  const { operator, senderNumber, months } = req.body
  const file = req.file

  if (!file)     return res.status(400).json({ error: 'Justificatif requis' })
  if (!operator) return res.status(400).json({ error: 'Opérateur requis' })
  if (!months)   return res.status(400).json({ error: 'Durée requise' })

  try {
    const PRICES = { 1: 15000, 12: 150000 }
    const request = await prisma.paymentRequest.create({
      data: {
        userId:       Number(req.user.id),
        method:       'mobile_money',
        operator,
        senderNumber: senderNumber || null,
        months:       Number(months),
        amount:       PRICES[Number(months)] ?? 15000,
        status:       'pending',
        justificatif: file.filename,
      },
    })

    // Optionnel : notifier l'admin par email ici
    // await notifyAdmin(request)

    res.status(201).json({
      success:   true,
      message:   'Demande enregistrée — vérification sous 24h',
      requestId: request.id,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/plan/upgrade/stripe-checkout ───────────────────────
router.post('/upgrade/stripe-checkout', authenticate, async (req, res) => {
  const { months } = req.body
  try {
    const Stripe  = require('stripe')
    const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY)
    const prices  = {
      1:  process.env.STRIPE_PRICE_MONTHLY,
      12: process.env.STRIPE_PRICE_ANNUAL,
    }
    const priceId = prices[Number(months)]
    if (!priceId) return res.status(400).json({ error: 'Durée invalide' })

    const session = await stripe.checkout.sessions.create({
      mode:                'subscription',
      line_items:          [{ price: priceId, quantity: 1 }],
      success_url:         `${process.env.FRONTEND_URL}/plan?success=1`,
      cancel_url:          `${process.env.FRONTEND_URL}/plan?cancelled=1`,
      metadata:            { userId: req.user.id, months: String(months) },
      client_reference_id: req.user.id,
    })

    res.json({ checkoutUrl: session.url })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/plan/downgrade ─────────────────────────────────────
router.post('/downgrade', authenticate, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data:  { plan: 'free', planEndAt: new Date() },
    })
    res.json({ message: 'Plan gratuit activé' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/plan/approve/:requestId (admin) ────────────────────
// Appeler après vérification manuelle du justificatif Mobile Money
router.post('/approve/:requestId', authenticate, async (req, res) => {
  try {
    const request = await prisma.paymentRequest.findUnique({
      where: { id: req.params.requestId },
    })
    if (!request)                    return res.status(404).json({ error: 'Demande introuvable' })
    if (request.status !== 'pending') return res.status(400).json({ error: 'Demande déjà traitée' })

    const planEndAt = new Date()
    planEndAt.setMonth(planEndAt.getMonth() + request.months)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.userId },
        data:  { plan: 'pro', planStartAt: new Date(), planEndAt, isTrial: false },
      }),
      prisma.paymentRequest.update({
        where: { id: request.id },
        data:  { status: 'approved', approvedAt: new Date() },
      }),
    ])

    res.json({ success: true, planEndAt })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router