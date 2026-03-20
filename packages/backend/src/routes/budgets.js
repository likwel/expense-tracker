const router = require('express').Router()
const prisma  = require('../config/prisma')
const auth    = require('../middleware/auth')

router.use(auth)

// ── GET / — liste budgets du mois avec spent calculé dynamiquement ──
router.get('/', async (req, res) => {
  const { month, year } = req.query
  const m = Number(month), y = Number(year)
  try {
    const budgets = await prisma.budget.findMany({
      where:   { userId: req.user.id, month: m, year: y },
      include: { category: { select: { name:true, icon:true, color:true } } },
    })
    const result = await Promise.all(budgets.map(async b => {
      const agg = await prisma.expense.aggregate({
        where: {
          userId:     req.user.id,
          categoryId: b.categoryId,
          date: { gte: new Date(y, m-1, 1), lte: new Date(y, m, 0) },
        },
        _sum: { amount: true },
      })
      return { ...b, spent: Number(agg._sum.amount || 0) }
    }))
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST / — créer ou mettre à jour (upsert) ──────────────────────
router.post('/', async (req, res) => {
  const { categoryId, amount, month, year } = req.body
  try {
    const row = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId:     req.user.id,
          categoryId: Number(categoryId),
          month:      Number(month),
          year:       Number(year),
        },
      },
      update: { amount: Number(amount) },
      create: {
        userId:     req.user.id,
        categoryId: Number(categoryId),
        amount:     Number(amount),
        month:      Number(month),
        year:       Number(year),
      },
      include: { category: { select: { name:true, icon:true, color:true } } },
    })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /:id — modifier le montant d'un budget existant ───────────
router.put('/:id', async (req, res) => {
  const { amount } = req.body
  try {
    const existing = await prisma.budget.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!existing) return res.status(404).json({ error: 'Budget non trouvé' })

    const row = await prisma.budget.update({
      where:   { id: Number(req.params.id) },
      data:    { amount: Number(amount) },
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