const router   = require('express').Router()
const Joi      = require('joi')
const prisma   = require('../config/prisma')
const auth     = require('../middleware/auth')
const validate = require('../middleware/validate')
const { convert, getUserCurrencies } = require('../services/currencyService')

router.use(auth)

const schema = Joi.object({
  categoryId:  Joi.number().integer().allow(null).optional(),
  amount:      Joi.number().positive().required(),
  description: Joi.string().max(500).allow('').optional(),
  frequency:   Joi.string().valid('daily', 'weekly', 'monthly').required(),
  dayOfMonth:  Joi.number().integer().min(1).max(31).allow(null).optional(),
  dayOfWeek:   Joi.number().integer().min(0).max(6).allow(null).optional(),
  dayType:     Joi.string().valid('all', 'working', 'holiday').default('all'),
  startDate:   Joi.string().isoDate().required(),
  endDate:     Joi.string().isoDate().allow(null).optional(),
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
  const { orgId } = req.query
  try {
    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]

    const data = await prisma.recurringIncome.findMany({
      where:   { userId: { in: userIds } },
      include: catSelect,
      orderBy: { createdAt: 'desc' },
    })
    res.json(data)
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── POST / ────────────────────────────────────────────────────────
router.post('/', validate(schema), async (req, res) => {
  try {
    const { currency: from, defaultCurrency: to } = await getUserCurrencies(prisma, req.user.id)
    const { amountInBase } = await convert(Number(req.body.amount), from, to)

    const row = await prisma.recurringIncome.create({
      data: {
        ...req.body,
        userId:    req.user.id,
        amount:    amountInBase,
        startDate: new Date(req.body.startDate),
        endDate:   req.body.endDate ? new Date(req.body.endDate) : null,
      },
      include: catSelect,
    })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /:id ──────────────────────────────────────────────────────
router.put('/:id', validate(schema), async (req, res) => {
  try {
    const { currency: from, defaultCurrency: to } = await getUserCurrencies(prisma, req.user.id)
    const { amountInBase } = await convert(Number(req.body.amount), from, to)

    const row = await prisma.recurringIncome.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data: {
        ...req.body,
        amount:    amountInBase,
        startDate: new Date(req.body.startDate),
        endDate:   req.body.endDate ? new Date(req.body.endDate) : null,
      },
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PATCH /:id/toggle ─────────────────────────────────────────────
router.patch('/:id/toggle', async (req, res) => {
  try {
    const current = await prisma.recurringIncome.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!current) return res.status(404).json({ error: 'Non trouvé' })
    const updated = await prisma.recurringIncome.update({
      where: { id: current.id },
      data:  { isActive: !current.isActive },
    })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.recurringIncome.deleteMany({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /generate ────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDay = today.getDate()
  const todayDow = today.getDay()

  try {
    const holiday      = await prisma.publicHoliday.findUnique({ where: { date: today } })
    const isHoliday    = !!holiday
    const isWeekend    = todayDow === 0 || todayDow === 6
    const isWorkingDay = !isHoliday && !isWeekend

    const recurrings = await prisma.recurringIncome.findMany({
      where: {
        isActive:  true,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
    })

    const generated = []

    for (const rec of recurrings) {
      if (rec.dayType === 'working' && !isWorkingDay) continue
      if (rec.dayType === 'holiday' && !isHoliday)    continue

      let ok = false
      if      (rec.frequency === 'daily')   ok = true
      else if (rec.frequency === 'weekly')  ok = rec.dayOfWeek  === todayDow
      else if (rec.frequency === 'monthly') ok = rec.dayOfMonth === todayDay
      if (!ok) continue

      const exists = await prisma.income.findFirst({
        where: { userId: rec.userId, recurringIncomeId: rec.id, date: today },
      })
      if (exists) continue

      const income = await prisma.income.create({
        data: {
          userId:            rec.userId,
          categoryId:        rec.categoryId,
          recurringIncomeId: rec.id,
          amount:            rec.amount,
          description:       rec.description,
          date:              today,
          isRecurring:       true,
        },
      })
      generated.push(income)

      await prisma.recurringIncome.update({
        where: { id: rec.id },
        data:  { lastRunAt: today },
      })
    }

    res.json({
      date:        today.toISOString().split('T')[0],
      isHoliday,
      isWorkingDay,
      holidayName: holiday?.name || null,
      generated:   generated.length,
      incomes:     generated,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router