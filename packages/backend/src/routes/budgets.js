const router = require('express').Router()
const prisma  = require('../config/prisma')
const auth    = require('../middleware/auth')
const { convert, getUserCurrencies } = require('../services/currencyService')

router.use(auth)

// ── Helper : récupérer les userIds d'une org ──────────────────────
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
  const { month, year, orgId } = req.query
  const m = Number(month), y = Number(year)
  try {
    // Déterminer les userIds à agréger
    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]

    // Récupérer les budgets (union de tous les membres)
    const budgets = await prisma.budget.findMany({
      where: {
        userId: { in: userIds },
        month: m, year: y,
      },
      include: { category: { select: { name:true, icon:true, color:true } } },
    })

    // Grouper par categoryId et sommer les montants
    const grouped = {}
    budgets.forEach(b => {
      const key = b.categoryId
      if (!grouped[key]) {
        grouped[key] = { ...b, amount: 0 }
      }
      grouped[key].amount += Number(b.amount)
    })

    // Calculer le spent agrégé pour chaque catégorie
    const result = await Promise.all(Object.values(grouped).map(async b => {
      const agg = await prisma.expense.aggregate({
        where: {
          userId:     { in: userIds },
          categoryId: b.categoryId,
          date: { gte: new Date(y, m-1, 1), lte: new Date(y, m, 0) },
        },
        _sum: { amount: true },
      })
      return { ...b, amount: b.amount, spent: Number(agg._sum.amount || 0) }
    }))

    res.json(result)
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── POST / ────────────────────────────────────────────────────────
// Le budget est créé pour l'user courant (pas pour toute l'org)
router.post('/', async (req, res) => {
  const { categoryId, amount, month, year } = req.body
  try {
    const { currency: fromCurrency, defaultCurrency: toCurrency } =
      await getUserCurrencies(prisma, req.user.id)
    const { amountInBase } = await convert(Number(amount), fromCurrency, toCurrency)

    const row = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId:     req.user.id,
          categoryId: Number(categoryId),
          month:      Number(month),
          year:       Number(year),
        },
      },
      update: { amount: amountInBase },
      create: {
        userId:     req.user.id,
        categoryId: Number(categoryId),
        amount:     amountInBase,
        month:      Number(month),
        year:       Number(year),
      },
      include: { category: { select: { name:true, icon:true, color:true } } },
    })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /:id ──────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { amount } = req.body
  try {
    const { currency: fromCurrency, defaultCurrency: toCurrency } =
      await getUserCurrencies(prisma, req.user.id)
    const { amountInBase } = await convert(Number(amount), fromCurrency, toCurrency)

    const existing = await prisma.budget.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!existing) return res.status(404).json({ error: 'Budget non trouvé' })

    const row = await prisma.budget.update({
      where:   { id: Number(req.params.id) },
      data:    { amount: amountInBase },
      include: { category: { select: { name:true, icon:true, color:true } } },
    })
    res.json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.budget.deleteMany({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router