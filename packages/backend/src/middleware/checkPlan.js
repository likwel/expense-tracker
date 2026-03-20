import { canAddTransaction, canAddCategory, canUseBudgets, canUseRecurring, canExport } from '../lib/planLimits.js'
import prisma from '../lib/prisma.js'

// Réponse d'erreur standard pour limite atteinte
const limitReached = (res, check) =>
  res.status(403).json({ error: check.reason, upgrade: check.upgrade ?? false })

// ── Middleware : limite transactions ─────────────────────────────────────────
export async function checkTransactionLimit(req, res, next) {
  const user  = await prisma.user.findUnique({ where: { id: req.user.id } })
  const check = await canAddTransaction(prisma, user.id, user)
  if (!check.ok) return limitReached(res, check)
  req.planCheck = check
  next()
}

// ── Middleware : limite catégories ───────────────────────────────────────────
export async function checkCategoryLimit(req, res, next) {
  const user  = await prisma.user.findUnique({ where: { id: req.user.id } })
  const check = await canAddCategory(prisma, user.id, user)
  if (!check.ok) return limitReached(res, check)
  next()
}

// ── Middleware : accès budgets ────────────────────────────────────────────────
export async function checkBudgetAccess(req, res, next) {
  const user  = await prisma.user.findUnique({ where: { id: req.user.id } })
  const check = canUseBudgets(user)
  if (!check.ok) return limitReached(res, check)
  next()
}

// ── Middleware : accès récurrents ─────────────────────────────────────────────
export async function checkRecurringAccess(req, res, next) {
  const user  = await prisma.user.findUnique({ where: { id: req.user.id } })
  const check = canUseRecurring(user)
  if (!check.ok) return limitReached(res, check)
  next()
}

// ── Middleware : accès export ─────────────────────────────────────────────────
export async function checkExportAccess(req, res, next) {
  const user  = await prisma.user.findUnique({ where: { id: req.user.id } })
  const check = canExport(user)
  if (!check.ok) return limitReached(res, check)
  next()
}