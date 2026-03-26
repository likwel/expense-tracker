const router   = require('express').Router()
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const Joi      = require('joi')
const prisma   = require('../config/prisma')
const validate = require('../middleware/validate')
const auth     = require('../middleware/auth')

// ── Constantes plan ───────────────────────────────────────────────
const TRIAL_MONTHS = 2

// Plan trial déduit du usageType choisi à l'inscription
const TRIAL_PLAN_MAP = {
  personal: 'pro',
  family:   'family',
  business: 'business',
}

// Capacité max par plan (null = illimité)
const PLAN_MAX_MEMBERS = {
  pro:      1,
  family:   5,
  business: null,
}

// ── Schemas Joi ───────────────────────────────────────────────────
const registerSchema = Joi.object({
  name:      Joi.string().min(2).max(100).required(),
  email:     Joi.string().email().required(),
  password:  Joi.string().min(6).required(),
  currency:  Joi.string().max(10).default('MGA'),
  usageType: Joi.string().valid('personal', 'family', 'business').default('personal'),
  orgId:     Joi.number().integer().optional(),
  orgName:   Joi.string().max(150).optional().allow(''),
  orgCreate: Joi.boolean().default(false),
})

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
})

// ── Champs sûrs à retourner ───────────────────────────────────────
const USER_SELECT = {
  id:              true,
  name:            true,
  email:           true,
  currency:        true,
  defaultCurrency: true,
  role:            true,
  usageType:       true,
  plan:            true,
  trialPlan:       true,
  trialStartAt:    true,
  trialEndAt:      true,
  planStartAt:     true,
  planEndAt:       true,
  isBanned:        true,
  createdAt:       true,
}

// ── POST /api/auth/register ───────────────────────────────────────
router.post('/register', validate(registerSchema), async (req, res) => {
  const {
    name, email, password,
    currency  = 'MGA',
    usageType = 'personal',
    orgId, orgName, orgCreate,
  } = req.body

  try {
    // Premier utilisateur = super admin
    const userCount  = await prisma.user.count()
    const globalRole = userCount === 0 ? 'admin' : 'member'

    const hashed    = await bcrypt.hash(password, 10)
    const now       = new Date()
    const trialEnd  = new Date(now)
    trialEnd.setMonth(trialEnd.getMonth() + TRIAL_MONTHS)

    // Plan trial selon le type d'utilisation choisi
    // personal → pro trial, family → family trial, business → business trial
    const trialPlan = TRIAL_PLAN_MAP[usageType] ?? 'pro'

    // ── Créer l'utilisateur ──────────────────────────────────────
    const user = await prisma.user.create({
      data: {
        name:            name.trim(),
        email:           email.trim().toLowerCase(),
        password:        hashed,
        currency,
        defaultCurrency: currency,
        role:            globalRole,
        usageType,
        // Pendant le trial, plan = trialPlan (accès complet)
        plan:            trialPlan,
        trialPlan,
        trialStartAt:    now,
        trialEndAt:      trialEnd,
      },
    })

    // ── Gérer l'organisation ─────────────────────────────────────
    if (usageType !== 'personal') {

      if (orgCreate && orgName?.trim()) {
        // Créer une nouvelle organisation (fondateur = admin org)
        const org = await prisma.organization.create({
          data: {
            name:      orgName.trim(),
            type:      usageType,     // 'family' | 'business'
            founderId: user.id,
            currency,
          },
        })
        await prisma.orgMember.create({
          data: {
            organizationId: org.id,
            userId:         user.id,
            role:           'founder', // MemberRole.founder
          },
        })

      } else if (orgId) {
        // Rejoindre une organisation existante
        const org = await prisma.organization.findUnique({
          where:   { id: Number(orgId) },
          include: {
            _count:  { select: { members: true } },
            founder: { select: { plan: true } },
          },
        })
        if (!org) return res.status(404).json({ error: 'Organisation introuvable' })

        // Vérifier la capacité selon le plan du fondateur
        const maxMembers = PLAN_MAX_MEMBERS[org.founder.plan]
        if (maxMembers !== null && org._count.members >= maxMembers) {
          return res.status(403).json({
            error: `Cette organisation a atteint sa limite de ${maxMembers} membre(s). Le fondateur doit passer à un plan supérieur.`,
          })
        }

        await prisma.orgMember.create({
          data: {
            organizationId: org.id,
            userId:         user.id,
            role:           'member',
          },
        })
      }
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.status(201).json({
      token,
      user: {
        id:              user.id,
        name:            user.name,
        email:           user.email,
        currency:        user.currency,
        defaultCurrency: user.defaultCurrency,
        role:            user.role,
        usageType:       user.usageType,
        plan:            user.plan,
        trialPlan:       user.trialPlan,
        trialEndAt:      user.trialEndAt,
        createdAt:       user.createdAt,
      },
    })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email déjà utilisé' })
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/auth/organizations/search ───────────────────────────
// Recherche d'organisations pour la page register (sans auth)
router.get('/organizations/search', async (req, res) => {
  const { q, type } = req.query
  if (!q || q.length < 2) return res.json([])
  try {
    const orgs = await prisma.organization.findMany({
      where: {
        name:   { contains: q, mode: 'insensitive' },
        status: 'active',
        ...(type && type !== 'personal' ? { type } : {}),
      },
      include: {
        _count:  { select: { members: true } },
        founder: { select: { plan: true } },
      },
      take: 8,
    })

    // Enrichir chaque résultat avec la capacité restante
    const enriched = orgs.map(org => {
      const max  = PLAN_MAX_MEMBERS[org.founder.plan]
      const full = max !== null && org._count.members >= max
      return {
        id:      org.id,
        name:    org.name,
        type:    org.type,
        _count:  org._count,
        maxMembers: max,
        isFull:  full,
      }
    })

    res.json(enriched)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } })
    if (!user || !(await bcrypt.compare(req.body.password, user.password)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

    if (user.isBanned)
      return res.status(403).json({ error: 'Compte suspendu' })

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    const safe = Object.fromEntries(
      Object.keys(USER_SELECT).map(k => [k, user[k]])
    )
    res.json({ user: safe, token })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /api/auth/me ──────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: USER_SELECT,
    })
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /api/auth/profile ─────────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  const { name, email } = req.body
  if (!name?.trim())  return res.status(400).json({ error: 'Nom requis' })
  if (!email?.trim()) return res.status(400).json({ error: 'Email requis' })
  try {
    const existing = await prisma.user.findFirst({
      where: { email: email.trim(), NOT: { id: req.user.id } },
    })
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' })

    const updated = await prisma.user.update({
      where:  { id: req.user.id },
      data:   { name: name.trim(), email: email.trim() },
      select: { id: true, name: true, email: true, currency: true, createdAt: true },
    })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /api/auth/password ────────────────────────────────────────
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Champs requis' })
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Minimum 6 caractères' })
  try {
    const user  = await prisma.user.findUnique({ where: { id: req.user.id } })
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /api/auth/currency ────────────────────────────────────────
const VALID_CURRENCIES = ['MGA', 'EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'MAD', 'XOF', 'CNY', 'MUR']

router.put('/currency', auth, async (req, res) => {
  const { currency } = req.body
  if (!currency) return res.status(400).json({ error: 'Devise requise' })
  if (!VALID_CURRENCIES.includes(currency))
    return res.status(400).json({ error: 'Devise non supportée' })

  // Seuls les plans payants (non free) et admin peuvent changer la devise
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  if (user.role !== 'admin' && user.plan === 'free')
    return res.status(403).json({ error: 'Plan Pro requis pour changer la devise' })

  try {
    const updated = await prisma.user.update({
      where:  { id: req.user.id },
      data:   { currency },
      select: { id: true, name: true, email: true, currency: true },
    })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router