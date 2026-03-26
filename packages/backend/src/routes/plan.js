const express = require('express')
const router  = express.Router()
const prisma  = require('../config/prisma')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const authMiddleware                  = require('../middleware/auth')
const authenticate                    = authMiddleware.authenticate ?? authMiddleware.default ?? authMiddleware
const { getEffectivePlan, getLimits } = require('../lib/planLimits')

// ── Multer ────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/justificatifs')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) =>
      cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Format non supporté'))
  },
})

// ── Prix par plan et durée ─────────────────────────────────────────
const PLAN_PRICES = {
  pro:      { 1: 5000,  3: 15000,  12: 50000  },
  family:   { 1: 15000, 3: 45000,  12: 150000 },
  business: { 1: 40000, 3: 120000, 12: 400000 },
}

// ── Helper : synchroniser les membres d'une organisation ──────────
// Quand un fondateur active/change/annule son plan, tous les membres
// de ses organisations reçoivent le même plan et la même planEndAt.
//
// Règle métier :
//   - Activation / upgrade → membres passent au même plan + même planEndAt
//   - Downgrade (free)     → membres repassent à free également
//   - Les membres n'ont pas de trialPlan propre ; leur accès dépend du fondateur
async function syncOrgMembers(founderId, planData) {
  // Trouver toutes les organisations dont cet user est fondateur
  const orgs = await prisma.organization.findMany({
    where:   { founderId },
    include: { members: { select: { userId: true } } },
  })

  // Collecter tous les userId membres (hors fondateur lui-même)
  const memberIds = [
    ...new Set(
      orgs.flatMap(o => o.members.map(m => m.userId)).filter(id => id !== founderId)
    ),
  ]

  if (memberIds.length === 0) return 0

  // Mettre à jour tous les membres en une seule requête
  await prisma.user.updateMany({
    where: { id: { in: memberIds } },
    data:  planData,
  })

  return memberIds.length
}

// ── GET /api/plan/status ──────────────────────────────────────────
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

    // Vérifier si le user est membre d'une organisation (accès via fondateur)
    const membership = await prisma.orgMember.findFirst({
      where:   { userId: user.id },
      include: { organization: { include: { founder: true } } },
    })

    res.json({
      plan:         user.plan,
      trialPlan:    user.trialPlan,
      effectivePlan,
      trialEndAt:   user.trialEndAt,
      planEndAt:    user.planEndAt,
      isTrial:      !!(user.trialEndAt && now <= new Date(user.trialEndAt)),
      // Indique si l'accès vient d'une organisation (et laquelle)
      viaOrg: membership
        ? {
            orgId:      membership.organizationId,
            orgName:    membership.organization.name,
            orgType:    membership.organization.type,
            founderPlan: membership.organization.founder.plan,
          }
        : null,
      usage: {
        transactions: {
          used:      txUsed,
          limit:     limits.transactionsPerMonth === Infinity ? null : limits.transactionsPerMonth,
          remaining: limits.transactionsPerMonth === Infinity
            ? null : Math.max(0, limits.transactionsPerMonth - txUsed),
        },
        categories: {
          used:      catCount,
          limit:     limits.categories === Infinity ? null : limits.categories,
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

// ── POST /api/plan/upgrade/mobile-money ──────────────────────────
router.post(
  '/upgrade/mobile-money',
  authenticate,
  upload.single('justificatif'),
  async (req, res) => {
    const { operator, senderNumber, months, planId } = req.body
    const file = req.file

    if (!file)     return res.status(400).json({ error: 'Justificatif requis' })
    if (!operator) return res.status(400).json({ error: 'Opérateur requis' })
    if (!months)   return res.status(400).json({ error: 'Durée requise' })
    if (!planId)   return res.status(400).json({ error: 'Plan requis' })

    const validPlans = ['pro', 'family', 'business']
    if (!validPlans.includes(planId))
      return res.status(400).json({ error: 'Plan invalide' })

    const m      = Number(months)
    const prices = PLAN_PRICES[planId]
    const amount = prices?.[m] ?? prices?.[1]

    try {
      const request = await prisma.paymentRequest.create({
        data: {
          userId:       Number(req.user.id),
          method:       'mobile_money',
          operator,
          senderNumber: senderNumber || null,
          months:       m,
          planId,
          amount,
          status:       'pending',
          justificatif: file.filename,
        },
      })

      res.status(201).json({
        success:   true,
        message:   'Demande enregistrée — vérification sous 24h',
        requestId: request.id,
      })
    } catch (e) { res.status(500).json({ error: e.message }) }
  }
)

// ── GET /api/plan/stripe-prices ──────────────────────────────────
// Retourne les prix Stripe en temps réel depuis l'API Stripe.
// Le frontend affiche ces montants directement (pas de hardcode).
router.get('/stripe-prices', authenticate, async (req, res) => {
  try {
    const Stripe = require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Récupérer tous les prix actifs avec leurs produits
    const { data: prices } = await stripe.prices.list({
      active:  true,
      expand:  ['data.product'],
      limit:   100,
    })

    // Construire une map { planId: { months: { priceId, amount, currency } } }
    // On identifie chaque prix via ses metadata Stripe :
    //   metadata.planId  = 'pro' | 'family' | 'business'
    //   metadata.months  = '1' | '3' | '12'
    // (à définir dans le dashboard Stripe sur chaque Price)
    const map = {}
    for (const price of prices) {
      const planId = price.metadata?.planId
      const months = price.metadata?.months
      if (!planId || !months) continue

      if (!map[planId]) map[planId] = {}
      map[planId][months] = {
        priceId:  price.id,
        amount:   price.unit_amount,           // en centimes / fractional units
        currency: price.currency.toUpperCase(),
        interval: price.recurring?.interval ?? null,
      }
    }

    res.json({ prices: map })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/plan/upgrade/stripe-checkout ───────────────────────
router.post('/upgrade/stripe-checkout', authenticate, async (req, res) => {
  const { months, planId } = req.body

  const validPlans = ['pro', 'family', 'business']
  if (!validPlans.includes(planId))
    return res.status(400).json({ error: 'Plan invalide' })

  try {
    const Stripe = require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Résoudre le priceId dynamiquement via les metadata Stripe
    // (pas de clé .env par plan — tout vient de l'API Stripe)
    const { data: prices } = await stripe.prices.list({ active: true, limit: 100 })
    const match = prices.find(
      p => p.metadata?.planId === planId && p.metadata?.months === String(months)
    )
    if (!match)
      return res.status(400).json({
        error: `Aucun prix Stripe trouvé pour plan=${planId} months=${months}. Vérifiez les metadata sur le dashboard Stripe.`,
      })

    const session = await stripe.checkout.sessions.create({
      mode:       'subscription',
      line_items: [{ price: match.id, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/settings/plan?success=1&plan=${planId}`,
      cancel_url:  `${process.env.FRONTEND_URL}/settings/plan?cancelled=1`,
      metadata:    { userId: String(req.user.id), months: String(months), planId },
      client_reference_id: String(req.user.id),
    })

    res.json({
      checkoutUrl: session.url,
      amount:      match.unit_amount,
      currency:    match.currency.toUpperCase(),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/plan/approve/:requestId (admin) ─────────────────────
// Appelé après vérification manuelle du justificatif Mobile Money.
// Met à jour le fondateur ET tous les membres de ses organisations.
router.post('/approve/:requestId', authenticate, async (req, res) => {
  // Seul un admin peut approuver
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Accès refusé' })

  try {
    const request = await prisma.paymentRequest.findUnique({
      where: { id: Number(req.params.requestId) },
    })
    if (!request)
      return res.status(404).json({ error: 'Demande introuvable' })
    if (request.status !== 'pending')
      return res.status(400).json({ error: 'Demande déjà traitée' })

    const planEndAt = new Date()
    planEndAt.setMonth(planEndAt.getMonth() + request.months)

    const founderPlanData = {
      plan:         request.planId,   // 'pro' | 'family' | 'business'
      trialPlan:    null,
      trialStartAt: null,
      trialEndAt:   null,
      planStartAt:  new Date(),
      planEndAt,
    }

    // Données poussées aux membres (même plan, même fin de période)
    // Les membres n'ont pas de trialPlan — leur accès suit le fondateur
    const memberPlanData = {
      plan:      request.planId,
      planEndAt,
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le fondateur
      await tx.user.update({
        where: { id: request.userId },
        data:  founderPlanData,
      })

      // 2. Marquer la demande comme approuvée
      await tx.paymentRequest.update({
        where: { id: request.id },
        data:  { status: 'approved', approvedAt: new Date() },
      })

      // 3. Trouver les orgs du fondateur et leurs membres
      const orgs = await tx.organization.findMany({
        where:   { founderId: request.userId },
        include: { members: { select: { userId: true } } },
      })

      const memberIds = [
        ...new Set(
          orgs.flatMap(o => o.members.map(m => m.userId))
              .filter(id => id !== request.userId)
        ),
      ]

      // 4. Sync membres si applicable
      if (memberIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: memberIds } },
          data:  memberPlanData,
        })
      }

      return memberIds.length
    })

    // Compter pour la réponse (hors transaction)
    const syncedCount = await (async () => {
      const orgs = await prisma.organization.findMany({
        where:   { founderId: request.userId },
        include: { members: { select: { userId: true } } },
      })
      return new Set(
        orgs.flatMap(o => o.members.map(m => m.userId))
            .filter(id => id !== request.userId)
      ).size
    })()

    res.json({
      success:      true,
      planId:       request.planId,
      planEndAt,
      membersSync:  syncedCount,
      message:      `Plan ${request.planId} activé${syncedCount > 0 ? ` + ${syncedCount} membre(s) synchronisé(s)` : ''}`,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/plan/downgrade ──────────────────────────────────────
// Annule le plan du fondateur ET repasse tous ses membres à free
router.post('/downgrade', authenticate, async (req, res) => {
  try {
    const freePlanData = {
      plan:         'free',
      trialPlan:    null,
      trialStartAt: null,
      trialEndAt:   null,
      planStartAt:  null,
      planEndAt:    null,
    }

    await prisma.$transaction(async (tx) => {
      // 1. Downgrade le fondateur
      await tx.user.update({
        where: { id: req.user.id },
        data:  freePlanData,
      })

      // 2. Trouver les membres de ses orgs
      const orgs = await tx.organization.findMany({
        where:   { founderId: req.user.id },
        include: { members: { select: { userId: true } } },
      })

      const memberIds = [
        ...new Set(
          orgs.flatMap(o => o.members.map(m => m.userId))
              .filter(id => id !== req.user.id)
        ),
      ]

      // 3. Repasser les membres à free
      if (memberIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: memberIds } },
          data:  { plan: 'free', planEndAt: null },
        })
      }
    })

    // Notifier les membres via notification en BDD
    const orgs = await prisma.organization.findMany({
      where:   { founderId: req.user.id },
      include: { members: { select: { userId: true } }, founder: true },
    })
    const memberIds = [
      ...new Set(
        orgs.flatMap(o => o.members.map(m => m.userId))
            .filter(id => id !== req.user.id)
      ),
    ]
    if (memberIds.length > 0) {
      await prisma.notification.createMany({
        data: memberIds.map(userId => ({
          userId,
          type:     'plan_downgraded',
          level:    'warning',
          title:    'Accès modifié',
          message:  'Le fondateur de votre organisation a annulé son abonnement. Votre compte est repassé en mode gratuit.',
          dedupKey: `plan_downgrade_${userId}_${Date.now()}`,
        })),
      })
    }

    res.json({ success: true, message: 'Plan gratuit activé', membersDowngraded: memberIds.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/plan/upgrade (admin direct, sans paiement) ─────────
router.post('/upgrade', authenticate, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Accès refusé' })

  try {
    const { months = 1, planId = 'pro', userId: targetId } = req.body
    const id      = targetId ? Number(targetId) : req.user.id
    const now     = new Date()
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

    await prisma.user.update({ where: { id }, data: founderData })

    // Sync membres
    const synced = await syncOrgMembers(id, { plan: planId, planEndAt })

    res.json({
      success:     true,
      message:     `Plan ${planId} activé${synced > 0 ? ` + ${synced} membre(s) synchronisé(s)` : ''}`,
      planEndAt,
      membersSync: synced,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router