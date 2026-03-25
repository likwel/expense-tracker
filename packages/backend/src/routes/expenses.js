const router   = require('express').Router()
const Joi      = require('joi')
const prisma   = require('../config/prisma')
const auth     = require('../middleware/auth')
const validate = require('../middleware/validate')
const { convert, getUserCurrencies } = require('../services/currencyService')

let emitToUser = () => {}
try {
  const sse = require('./sse')
  if (typeof sse.emitToUser === 'function') emitToUser = sse.emitToUser
} catch {}

const { checkAndNotifyBudgets } = require('../services/budgetNotif')

router.use(auth)

const schema = Joi.object({
  categoryId:  Joi.number().integer().allow(null).optional(),
  amount:      Joi.number().positive().required(),
  description: Joi.string().max(500).allow('').optional(),
  date:        Joi.string().isoDate().required(),
})

const catSelect = { category: { select: { name:true, icon:true, color:true } } }

// ── Helper : récupérer les userIds selon orgId ────────────────────
const getOrgMemberIds = async (userId, orgId) => {
  const member = await prisma.orgMember.findFirst({
    where: { organizationId: Number(orgId), userId },
  })
  if (!member) throw { status: 403, message: 'Accès refusé à cette organisation' }
  const members = await prisma.orgMember.findMany({
    where:  { organizationId: Number(orgId) },
    select: { userId: true },
  })
  return members.map(m => m.userId)
}

// ── GET / ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { month, year, categoryId, take='50', skip='0', orgId } = req.query
  try {
    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]

    const where = { userId: { in: userIds } }
    if (month && year) {
      const m = Number(month), y = Number(year)
      where.date = { gte: new Date(y, m-1, 1), lte: new Date(y, m, 0) }
    }
    if (categoryId) where.categoryId = Number(categoryId)

    const [data, total] = await prisma.$transaction([
      prisma.expense.findMany({
        where, include: catSelect,
        orderBy: { date: 'desc' },
        take: Number(take), skip: Number(skip),
      }),
      prisma.expense.count({ where }),
    ])
    res.json({ data, total })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── POST / ────────────────────────────────────────────────────────
// Toujours créé pour l'user courant
router.post('/', validate(schema), async (req, res) => {
  try {
    const { currency: from, defaultCurrency: to } = await getUserCurrencies(prisma, req.user.id)
    const { amountInBase } = await convert(Number(req.body.amount), from, to)

    const row = await prisma.expense.create({
      data: {
        ...req.body,
        userId: req.user.id,
        amount: amountInBase,
        date:   new Date(req.body.date),
      },
      include: catSelect,
    })

    const date = new Date(req.body.date)
    await checkAndNotifyBudgets(
      req.user.id,
      date.getMonth() + 1,
      date.getFullYear(),
      emitToUser
    ).catch(e => console.error('[Budget notif]', e.message))

    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /:id ──────────────────────────────────────────────────────
// Seul le propriétaire peut modifier
router.put('/:id', validate(schema), async (req, res) => {
  try {
    const { currency: from, defaultCurrency: to } = await getUserCurrencies(prisma, req.user.id)
    const { amountInBase } = await convert(Number(req.body.amount), from, to)

    // ✅ Vérifier que la dépense appartient à l'user
    const existing = await prisma.expense.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!existing) return res.status(404).json({ error: 'Non trouvé' })

    const row = await prisma.expense.update({
      where: { id: Number(req.params.id) },
      data:  {
        ...req.body,
        amount: amountInBase,
        date:   new Date(req.body.date),
      },
      include: catSelect,
    })
    res.json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /:id ───────────────────────────────────────────────────
// Seul le propriétaire peut supprimer
router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.expense.deleteMany({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router