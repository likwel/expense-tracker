const router = require('express').Router()
const Joi    = require('joi')
const prisma = require('../config/prisma')
const auth   = require('../middleware/auth')
const validate = require('../middleware/validate')

router.use(auth)

const schema = Joi.object({
  name:  Joi.string().max(100).required(),
  icon:  Joi.string().max(50).optional(),
  color: Joi.string().max(20).optional(),
  type:  Joi.string().valid('expense','income').required(),
})

router.get('/', async (req, res) => {
  try {
    const data = await prisma.category.findMany({
      where:   { OR: [{ userId: req.user.id }, { userId: null }] },
      orderBy: { name: 'asc' },
    })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', validate(schema), async (req, res) => {
  try {
    const row = await prisma.category.create({ data: { ...req.body, userId: req.user.id } })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', validate(schema), async (req, res) => {
  try {
    const row = await prisma.category.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data:  req.body,
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé ou catégorie système' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.category.deleteMany({ where: { id: Number(req.params.id), userId: req.user.id } })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé ou catégorie système' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
