// ─── Définition des limites par plan ──────────────────────────────────────────
export const PLAN_LIMITS = {
  free: {
    transactionsPerMonth: 30,   // expenses + incomes combinés
    categories:           3,
    budgets:              0,    // pas de budget
    recurring:            0,    // pas de récurrents
    reports:             'basic',
    export:              false,
    multiCurrency:       false,
  },
  pro: {
    transactionsPerMonth: Infinity,
    categories:           Infinity,
    budgets:              Infinity,
    recurring:            Infinity,
    reports:             'advanced',
    export:              true,
    multiCurrency:       true,
  },
  business: {
    transactionsPerMonth: Infinity,
    categories:           Infinity,
    budgets:              Infinity,
    recurring:            Infinity,
    reports:             'advanced',
    export:              true,
    multiCurrency:       true,
  },
}

// ─── Résoudre le plan effectif (trial compris) ────────────────────────────────
export function getEffectivePlan(user) {
  const now = new Date()

  // Pendant la période d'essai → accès Pro
  if (user.trialEndAt && now <= new Date(user.trialEndAt)) return 'pro'

  // Plan payant expiré → retombe sur free
  if (user.planEndAt && now > new Date(user.planEndAt)) return 'free'

  return user.plan || 'free'
}

export function getLimits(user) {
  return PLAN_LIMITS[getEffectivePlan(user)]
}

// ─── Vérifications ────────────────────────────────────────────────────────────

// Transactions ce mois-ci (expenses + incomes)
export async function canAddTransaction(prisma, userId, user) {
  const limits = getLimits(user)
  if (limits.transactionsPerMonth === Infinity) return { ok: true }

  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [expCount, incCount] = await Promise.all([
    prisma.expense.count({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.income.count({  where: { userId, date: { gte: start, lte: end } } }),
  ])

  const total = expCount + incCount
  if (total >= limits.transactionsPerMonth) {
    return {
      ok: false,
      reason: `Limite de ${limits.transactionsPerMonth} transactions/mois atteinte.`,
      upgrade: true,
    }
  }
  return { ok: true, remaining: limits.transactionsPerMonth - total }
}

// Catégories
export async function canAddCategory(prisma, userId, user) {
  const limits = getLimits(user)
  if (limits.categories === Infinity) return { ok: true }

  const count = await prisma.category.count({ where: { userId } })
  if (count >= limits.categories) {
    return {
      ok: false,
      reason: `Limite de ${limits.categories} catégories atteinte.`,
      upgrade: true,
    }
  }
  return { ok: true, remaining: limits.categories - count }
}

// Budgets
export function canUseBudgets(user) {
  const limits = getLimits(user)
  if (limits.budgets === 0) return { ok: false, reason: 'Les budgets sont réservés au plan Pro.', upgrade: true }
  return { ok: true }
}

// Récurrents
export function canUseRecurring(user) {
  const limits = getLimits(user)
  if (limits.recurring === 0) return { ok: false, reason: 'Les dépenses récurrentes sont réservées au plan Pro.', upgrade: true }
  return { ok: true }
}

// Export
export function canExport(user) {
  const limits = getLimits(user)
  if (!limits.export) return { ok: false, reason: "L'export est réservé au plan Pro.", upgrade: true }
  return { ok: true }
}