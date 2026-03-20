require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const rateLimit = require('express-rate-limit')
const cron      = require('node-cron')

const prisma                    = require('./config/prisma')
const { router: sseRouter,
        emitToUser }            = require('./routes/sse')
        
const {
  checkAndNotifyBudgets,
  notifyIncomeGenerated,
  notifyExpenseGenerated,
}                               = require('./services/budgetNotif')

const app = express()

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
  exposedHeaders: ['Content-Type'],
}))

// SSE a besoin de OPTIONS preflight aussi
app.options('*', cors())

// app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(rateLimit({ windowMs: 15*60*1000, max: 300, message: { error: 'Trop de requêtes' } }))

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',             require('./routes/auth'))
app.use('/api/expenses',         require('./routes/expenses'))
app.use('/api/incomes',          require('./routes/incomes'))
app.use('/api/budgets',          require('./routes/budgets'))
app.use('/api/categories',       require('./routes/categories'))
app.use('/api/reports',          require('./routes/reports'))
app.use('/api/recurring',        require('./routes/recurring'))
app.use('/api/recurring-income', require('./routes/recurringIncome'))
app.use('/api/plan',             require('./routes/plan'))
app.use('/api/sse',              sseRouter)
app.use('/api/notifications',    require('./routes/notifications'))

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }))

// ── Erreurs globales ──────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message })
})

// ── Helpers cron ──────────────────────────────────────────────────
async function getDateContext(today) {
  const holiday      = await prisma.publicHoliday.findUnique({ where: { date: today } })
  const dow          = today.getDay()
  const isHoliday    = !!holiday
  const isWorkingDay = !isHoliday && dow !== 0 && dow !== 6
  return { dow, isHoliday, isWorkingDay, holidayName: holiday?.name }
}

function shouldRun(rec, dow, today) {
  if (rec.frequency === 'daily')   return true
  if (rec.frequency === 'weekly')  return rec.dayOfWeek  === dow
  if (rec.frequency === 'monthly') return rec.dayOfMonth === today.getDate()
  return false
}

async function runRecurringExpenses(today, ctx) {
  const recurrings = await prisma.recurringExpense.findMany({
    where: {
      isActive:  true,
      startDate: { lte: today },
      OR: [{ endDate: null }, { endDate: { gte: today } }],
    },
  })

  let count = 0
  for (const rec of recurrings) {
    if (rec.dayType === 'working' && !ctx.isWorkingDay) continue
    if (rec.dayType === 'holiday' && !ctx.isHoliday)    continue
    if (!shouldRun(rec, ctx.dow, today))                continue

    const exists = await prisma.expense.findFirst({
      where: { userId: rec.userId, recurringExpenseId: rec.id, date: today },
    })
    if (exists) continue

    await prisma.expense.create({
      data: {
        userId: rec.userId, categoryId: rec.categoryId,
        recurringExpenseId: rec.id, amount: rec.amount,
        description: rec.description, date: today, isRecurring: true,
      },
    })
    await prisma.recurringExpense.update({ where: { id: rec.id }, data: { lastRunAt: today } })
    count++

    await checkAndNotifyBudgets(rec.userId, today.getMonth() + 1, today.getFullYear(), emitToUser)
    await notifyExpenseGenerated(rec.userId, rec, emitToUser)
  }
  return count
}

async function runRecurringIncomes(today, ctx) {
  const recurrings = await prisma.recurringIncome.findMany({
    where: {
      isActive:  true,
      startDate: { lte: today },
      OR: [{ endDate: null }, { endDate: { gte: today } }],
    },
  })

  let count = 0
  for (const rec of recurrings) {
    if (rec.dayType === 'working' && !ctx.isWorkingDay) continue
    if (rec.dayType === 'holiday' && !ctx.isHoliday)    continue
    if (!shouldRun(rec, ctx.dow, today))                continue

    const exists = await prisma.income.findFirst({
      where: { userId: rec.userId, recurringIncomeId: rec.id, date: today },
    })
    if (exists) continue

    await prisma.income.create({
      data: {
        userId: rec.userId, categoryId: rec.categoryId,
        recurringIncomeId: rec.id, amount: rec.amount,
        description: rec.description, date: today, isRecurring: true,
      },
    })
    await prisma.recurringIncome.update({ where: { id: rec.id }, data: { lastRunAt: today } })
    count++

    await notifyIncomeGenerated(rec.userId, rec, emitToUser)
  }
  return count
}

// ── Démarrage ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`\n  Backend → http://localhost:${PORT}\n`)

  cron.schedule('5 0 * * *', async () => {
    console.log('[CRON] Démarrage génération récurrents...')
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const ctx        = await getDateContext(today)
      const [exp, inc] = await Promise.all([
        runRecurringExpenses(today, ctx),
        runRecurringIncomes(today, ctx),
      ])
      console.log(`[CRON] ${exp} dépenses + ${inc} revenus générés`)
    } catch (e) {
      console.error('[CRON] Erreur:', e.message)
    }
  }, { timezone: 'Indian/Antananarivo' })
})