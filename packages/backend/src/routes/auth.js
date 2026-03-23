const router   = require('express').Router()
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const Joi      = require('joi')
const prisma   = require('../config/prisma')
const validate = require('../middleware/validate')
const auth     = require('../middleware/auth')

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  currency: Joi.string().max(10).default('MGA'),
})

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
})


// Champs à retourner — identiques dans login et /me
const USER_SELECT = {
  id:              true,
  name:            true,
  email:           true,
  currency:        true,
  defaultCurrency: true,
  role:            true,
  usageType:       true,
  plan:            true,
  trialStartAt:    true,
  trialEndAt:      true,
  planStartAt:     true,
  planEndAt:       true,
  createdAt:       true,
}
router.post('/register', async (req, res) => {
  const {
    name, email, password, currency = 'MGA',
    usageType = 'personal',
    orgId, orgName, orgCreate,
  } = req.body

  try {
    // ── Rôle global : Super Admin si premier utilisateur ──────
    const userCount  = await prisma.user.count()
    const globalRole = userCount === 0 ? 'admin' : 'member'

    const hashed   = await bcrypt.hash(password, 10)
    const now      = new Date()
    const trialEnd = new Date(now)
    trialEnd.setMonth(trialEnd.getMonth() + 3)

    // ── Créer l'utilisateur ───────────────────────────────────
    const user = await prisma.user.create({
      data: {
        name:            name.trim(),
        email:           email.trim().toLowerCase(),
        password:        hashed,
        currency,
        defaultCurrency: currency,
        role:            globalRole,
        usageType,
        plan:            'free',
        trialStartAt:    now,
        trialEndAt:      trialEnd,
      },
    })

    // ── Gérer l'organisation ──────────────────────────────────
    if (usageType !== 'personal') {

      if (orgCreate && orgName?.trim()) {
        // Créer une nouvelle organisation
        // → créateur = fondateur ET admin de l'organisation
        const org = await prisma.organization.create({
          data: {
            name:      orgName.trim(),
            type:      usageType,  // 'family' | 'business'
            founderId: user.id,
            currency,
          },
        })
        await prisma.orgMember.create({
          data: {
            organizationId: org.id,
            userId:         user.id,
            role:           'admin',   // créateur = admin org
          },
        })

      } else if (orgId) {
        // Rejoindre une organisation existante
        // → toujours membre simple, l'admin existant gère les droits
        const org = await prisma.organization.findUnique({
          where: { id: Number(orgId) },
        })
        if (!org) return res.status(404).json({ error: 'Organisation introuvable' })

        await prisma.orgMember.create({
          data: {
            organizationId: org.id,
            userId:         user.id,
            role:           'member',  // rejoindre = membre
          },
        })
      }
    }

    // ── Catégories par défaut ─────────────────────────────────
    await prisma.category.createMany({
      data: [
        { name:'Alimentation', icon:'ShoppingCart',  color:'#E24B4A', type:'expense', userId: user.id },
        { name:'Transport',    icon:'Car',            color:'#185FA5', type:'expense', userId: user.id },
        { name:'Logement',     icon:'Home',           color:'#BA7517', type:'expense', userId: user.id },
        { name:'Salaire',      icon:'Briefcase',      color:'#0F6E56', type:'income',  userId: user.id },
        { name:'Autres',       icon:'MoreHorizontal', color:'#888888', type:'expense', userId: user.id },
      ],
    })

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
        trialEndAt:      user.trialEndAt,
        createdAt:       user.createdAt,
      },
    })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email déjà utilisé' })
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/organizations/search ────────────────────────────────
// Recherche d'organisations pour la page register
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
      include: { _count: { select: { members: true } } },
      take: 8,
    })
    res.json(orgs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})


router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } })
    if (!user || !(await bcrypt.compare(req.body.password, user.password)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    // Retourner uniquement les champs sûrs
    const safe = Object.fromEntries(
      Object.keys(USER_SELECT).map(k => [k, user[k]])
    )
    res.json({ user: safe, token })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

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

// ── PUT /api/auth/profile — modifier nom + email ──────────────────
router.put('/profile', auth, async (req, res) => {
  const { name, email } = req.body
  if (!name?.trim())  return res.status(400).json({ error: 'Nom requis' })
  if (!email?.trim()) return res.status(400).json({ error: 'Email requis' })
  try {
    // Vérifier que l'email n'est pas déjà pris par un autre compte
    const existing = await prisma.user.findFirst({
      where: { email: email.trim(), NOT: { id: req.user.id } },
    })
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' })

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data:  { name: name.trim(), email: email.trim() },
      select: { id: true, name: true, email: true, currency: true, createdAt: true },
    })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /api/auth/password — changer le mot de passe ─────────────
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Champs requis' })
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Minimum 6 caractères' })
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})



// Ajouter dans routes/auth.js

const VALID_CURRENCIES = ['MGA','EUR','USD','GBP','CHF','JPY','CAD','MAD','XOF', 'CNY', 'MUR']

// ── PUT /api/auth/currency — changer la devise d'affichage ────────
router.put('/currency', auth, async (req, res) => {
  const { currency } = req.body
  if (!currency) return res.status(400).json({ error: 'Devise requise' })
  if (!VALID_CURRENCIES.includes(currency))
    return res.status(400).json({ error: 'Devise non supportée' })
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
