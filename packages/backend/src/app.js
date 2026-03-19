// Installer d'abord : npm install node-cron -w packages/backend

require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const rateLimit = require('express-rate-limit')
const cron      = require('node-cron')
const axios     = require('axios') // npm install axios -w packages/backend

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(rateLimit({ windowMs:15*60*1000, max:300, message:{ error:'Trop de requêtes' } }))

app.use('/api/auth',             require('./routes/auth'))
app.use('/api/expenses',         require('./routes/expenses'))
app.use('/api/incomes',          require('./routes/incomes'))
app.use('/api/budgets',          require('./routes/budgets'))
app.use('/api/categories',       require('./routes/categories'))
app.use('/api/reports',          require('./routes/reports'))
app.use('/api/recurring',        require('./routes/recurring'))
app.use('/api/recurring-income', require('./routes/recurringIncome'))

app.get('/api/health', (_, res) => res.json({ status:'ok' }))

app.use((err, req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`\n  Backend → http://localhost:${PORT}\n`)

  // ── Cron : génère les dépenses récurrentes chaque jour à 00:05 ──
  cron.schedule('5 0 * * *', async () => {
    console.log('[CRON] Génération des dépenses récurrentes...')
    try {
      // Appel interne avec un token système (optionnel)
      // Ou appeler directement la logique de génération
      const prisma = require('./config/prisma')
      const today  = new Date()
      today.setHours(0, 0, 0, 0)

      const holiday = await prisma.publicHoliday.findUnique({ where: { date: today } })
      const dow     = today.getDay()
      const isHoliday    = !!holiday
      const isWorkingDay = !isHoliday && dow !== 0 && dow !== 6

      const recurrings = await prisma.recurringExpense.findMany({
        where: {
          isActive:  true,
          startDate: { lte: today },
          OR: [{ endDate: null }, { endDate: { gte: today } }],
        },
      })

      let count = 0
      for (const rec of recurrings) {
        if (rec.dayType === 'working' && !isWorkingDay) continue
        if (rec.dayType === 'holiday' && !isHoliday)    continue

        let ok = false
        if      (rec.frequency === 'daily')   ok = true
        else if (rec.frequency === 'weekly')  ok = rec.dayOfWeek  === dow
        else if (rec.frequency === 'monthly') ok = rec.dayOfMonth === today.getDate()
        if (!ok) continue

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
      }
      console.log(`[CRON] ${count} dépenses générées`)
    } catch (e) { console.error('[CRON] Erreur:', e.message) }
  }, { timezone: 'Indian/Antananarivo' })
})