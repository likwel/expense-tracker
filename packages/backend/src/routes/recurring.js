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
  frequency:   Joi.string().valid('daily', 'weekly', 'monthly').required(),
  dayOfMonth:  Joi.number().integer().min(1).max(31).allow(null).optional(),
  dayOfWeek:   Joi.number().integer().min(0).max(6).allow(null).optional(),
  // 'all'     → tous les jours
  // 'working' → jours ouvrés seulement (lun-ven, hors fériés)
  // 'holiday' → jours fériés seulement
  dayType:     Joi.string().valid('all', 'working', 'holiday').default('all'),
  startDate:   Joi.string().isoDate().required(),
  endDate:     Joi.string().isoDate().allow(null).optional(),
})

const catSelect = { category: { select: { name:true, icon:true, color:true } } }

// GET /api/recurring
router.get('/', async (req, res) => {
  try {
    const data = await prisma.recurringExpense.findMany({
      where:   { userId: req.user.id },
      include: catSelect,
      orderBy: { createdAt: 'desc' },
    })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/recurring
router.post('/', validate(schema), async (req, res) => {
  try {
    const row = await prisma.recurringExpense.create({
      data: {
        ...req.body,
        userId:    req.user.id,
        startDate: new Date(req.body.startDate),
        endDate:   req.body.endDate ? new Date(req.body.endDate) : null,
      },
      include: catSelect,
    })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/recurring/:id
router.put('/:id', validate(schema), async (req, res) => {
  try {
    const row = await prisma.recurringExpense.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data: {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate:   req.body.endDate ? new Date(req.body.endDate) : null,
      },
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH /api/recurring/:id/toggle  — activer/désactiver
router.patch('/:id/toggle', async (req, res) => {
  try {
    const current = await prisma.recurringExpense.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!current) return res.status(404).json({ error: 'Non trouvé' })
    const updated = await prisma.recurringExpense.update({
      where: { id: current.id },
      data:  { isActive: !current.isActive },
    })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/recurring/:id
router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.recurringExpense.deleteMany({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/recurring/generate — génère les dépenses du jour
// À appeler chaque jour via un cron job ou manuellement
router.post('/generate', async (req, res) => {
  const today     = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDay  = today.getDate()
  const todayDow  = today.getDay()   // 0=dim, 6=sam

  try {
    // Vérifier si aujourd'hui est férié
    const holiday = await prisma.publicHoliday.findUnique({
      where: { date: today },
    })
    const isHoliday  = !!holiday
    const isWeekend  = todayDow === 0 || todayDow === 6
    const isWorkingDay = !isHoliday && !isWeekend

    // Récupérer toutes les récurrences actives
    const recurrings = await prisma.recurringExpense.findMany({
      where: {
        isActive:  true,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
    })

    const generated = []

    for (const rec of recurrings) {
      // Vérifier le type de jour
      if (rec.dayType === 'working' && !isWorkingDay) continue
      if (rec.dayType === 'holiday' && !isHoliday)    continue

      // Vérifier la fréquence
      let shouldGenerate = false
      if (rec.frequency === 'daily') {
        shouldGenerate = true
      } else if (rec.frequency === 'weekly') {
        shouldGenerate = rec.dayOfWeek !== null && rec.dayOfWeek === todayDow
      } else if (rec.frequency === 'monthly') {
        shouldGenerate = rec.dayOfMonth !== null && rec.dayOfMonth === todayDay
      }

      if (!shouldGenerate) continue

      // Éviter les doublons sur la même journée
      const exists = await prisma.expense.findFirst({
        where: {
          userId:             rec.userId,
          recurringExpenseId: rec.id,
          date:               today,
        },
      })
      if (exists) continue

      // Créer la dépense
      const expense = await prisma.expense.create({
        data: {
          userId:             rec.userId,
          categoryId:         rec.categoryId,
          recurringExpenseId: rec.id,
          amount:             rec.amount,
          description:        rec.description,
          date:               today,
          isRecurring:        true,
        },
      })
      generated.push(expense)

      // Mettre à jour lastRunAt
      await prisma.recurringExpense.update({
        where: { id: rec.id },
        data:  { lastRunAt: today },
      })
    }

    res.json({
      date:      today.toISOString().split('T')[0],
      isHoliday,
      isWorkingDay,
      holidayName: holiday?.name || null,
      generated: generated.length,
      expenses:  generated,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/recurring/holidays — liste les jours fériés
router.get('/holidays', async (req, res) => {
  const { year = new Date().getFullYear() } = req.query
  try {
    const data = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      orderBy: { date: 'asc' },
    })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router