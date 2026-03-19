const router   = require('express').Router()
const Joi      = require('joi')
const prisma   = require('../config/prisma')
const auth     = require('../middleware/auth')
const validate = require('../middleware/validate')

router.use(auth)

const schema = Joi.object({
  categoryId:  Joi.number().integer().allow(null).optional(),
  amount:      Joi.number().positive().required(),
  description: Joi.string().max(500).allow('').optional(),
  date:        Joi.string().isoDate().required(),
})

const catSelect = { category: { select: { name:true, icon:true, color:true } } }

router.get('/', async (req, res) => {
  const { month, year, categoryId, take='50', skip='0' } = req.query
  const where = { userId: req.user.id }
  if (month && year) {
    const m = Number(month), y = Number(year)
    where.date = { gte: new Date(y, m-1, 1), lte: new Date(y, m, 0) }
  }
  if (categoryId) where.categoryId = Number(categoryId)
  try {
    const [data, total] = await prisma.$transaction([
      prisma.expense.findMany({ where, include: catSelect, orderBy: { date:'desc' }, take: Number(take), skip: Number(skip) }),
      prisma.expense.count({ where }),
    ])
    res.json({ data, total })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', validate(schema), async (req, res) => {
  try {
    const row = await prisma.expense.create({
      data:    { ...req.body, userId: req.user.id, date: new Date(req.body.date) },
      include: catSelect,
    })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', validate(schema), async (req, res) => {
  try {
    const row = await prisma.expense.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data:  { ...req.body, date: new Date(req.body.date) },
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.expense.deleteMany({ where: { id: Number(req.params.id), userId: req.user.id } })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
