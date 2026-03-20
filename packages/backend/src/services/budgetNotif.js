const prisma = require('../config/prisma')

const THRESHOLDS = [
  { pct: 100, level: 'danger',  title: 'Budget épuisé !'            },
  { pct:  90, level: 'warning', title: 'Budget presque épuisé (90%)' },
  { pct:  75, level: 'alert',   title: '75% du budget atteint'       },
]

// ── Créer et émettre une notification ────────────────────────────
async function createNotification({ userId, type, level, title, message, data, dedupKey }, emitToUser) {
  try {
    // Évite les doublons via dedupKey unique
    const notif = await prisma.notification.upsert({
      where:  { dedupKey: dedupKey || `${userId}-${type}-${Date.now()}` },
      update: {},   // si déjà existante → ne rien faire
      create: { userId, type, level, title, message, data, dedupKey },
    })

    // Émettre en temps réel si l'utilisateur est connecté
    if (emitToUser) {
      emitToUser(userId, type, {
        id:       notif.id,
        level,
        label:    title,
        message,
        dedupKey: notif.dedupKey,
        ...data,
      })
    }

    return notif
  } catch (e) {
    // dedupKey déjà en base → notification déjà envoyée, on ignore
    if (e.code === 'P2002') return null
    throw e
  }
}

// ── Vérifier et notifier les budgets dépassés ────────────────────
async function checkAndNotifyBudgets(userId, month, year, emitToUser) {
  const m = Number(month), y = Number(year)

  const budgets = await prisma.budget.findMany({
    where:   { userId, month: m, year: y },
    include: { category: { select: { name: true, color: true } } },
  })

  for (const b of budgets) {
    const agg = await prisma.expense.aggregate({
      where: {
        userId, categoryId: b.categoryId,
        date: { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0) },
      },
      _sum: { amount: true },
    })

    const spent  = Number(agg._sum.amount || 0)
    const amount = Number(b.amount)
    const pct    = amount > 0 ? Math.round((spent / amount) * 100) : 0
    const thresh = THRESHOLDS.find(t => pct >= t.pct)
    if (!thresh) continue

    const dedupKey = `budget-${b.id}-${thresh.level}-${m}-${y}`

    await createNotification({
      userId,
      type:     'budget_alert',
      level:    thresh.level,
      title:    thresh.title,
      message:  `${b.category?.name} — ${pct}% utilisé`,
      data:     { category: b.category?.name, pct, spent, amount, budgetId: b.id },
      dedupKey,
    }, emitToUser)
  }
}

// ── Notifier revenu récurrent généré ────────────────────────────
async function notifyIncomeGenerated(userId, rec, emitToUser) {
  const today    = new Date()
  const dedupKey = `income-generated-${rec.id}-${today.toISOString().split('T')[0]}`

  await createNotification({
    userId,
    type:    'income_generated',
    level:   'success',
    title:   'Revenu récurrent généré',
    message: rec.description || 'Revenu automatique',
    data:    { amount: Number(rec.amount), recurringId: rec.id },
    dedupKey,
  }, emitToUser)
}

// ── Notifier dépense récurrente générée ─────────────────────────
async function notifyExpenseGenerated(userId, rec, emitToUser) {
  const today    = new Date()
  const dedupKey = `expense-generated-${rec.id}-${today.toISOString().split('T')[0]}`

  await createNotification({
    userId,
    type:    'recurring_generated',
    level:   'info',
    title:   'Dépense récurrente générée',
    message: rec.description || 'Dépense automatique',
    data:    { amount: Number(rec.amount), recurringId: rec.id },
    dedupKey,
  }, emitToUser)
}

module.exports = {
  checkAndNotifyBudgets,
  notifyIncomeGenerated,
  notifyExpenseGenerated,
  createNotification,
}