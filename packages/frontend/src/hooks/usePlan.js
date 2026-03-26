import { useState, useEffect } from 'react'
import api from '../utils/api'

// ── Cache module-level ────────────────────────────────────────────
let cache     = null
let fetchedAt = 0
let pending   = null   // Promise partagée pour éviter les requêtes simultanées
const TTL     = 60_000 // 1 minute

// ── Helpers locaux ────────────────────────────────────────────────

// Retourne true si l'utilisateur a un accès payant actif (trial OU plan payant)
function computeAccess(data) {
  if (!data) return false
  const now = Date.now()
  const trialActive = data.trialEndAt && now <= new Date(data.trialEndAt).getTime()
  const planActive  = data.planEndAt  && now <= new Date(data.planEndAt).getTime()
  return !!(trialActive || planActive)
}

// Retourne le plan effectif affiché côté UI
// Correspond à getEffectivePlan() côté backend
function computeEffectivePlan(data) {
  if (!data) return 'free'
  const now = Date.now()
  const trialActive = data.trialEndAt && now <= new Date(data.trialEndAt).getTime()
  const planActive  = data.planEndAt  && now <= new Date(data.planEndAt).getTime()
  if (planActive)  return data.plan        // plan payant actif
  if (trialActive) return data.trialPlan   // trial actif → plan visé
  return 'free'
}

// Jours restants avant expiration (trial ou plan payant)
function computeDaysLeft(data) {
  if (!data) return 0
  const endDate = data.trialEndAt && new Date(data.trialEndAt) > new Date()
    ? new Date(data.trialEndAt)
    : data.planEndAt
      ? new Date(data.planEndAt)
      : null
  if (!endDate) return 0
  return Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86_400_000))
}

// ── Hook ──────────────────────────────────────────────────────────
export function usePlan() {
  const [plan,    setPlan]    = useState(cache)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    const now = Date.now()

    // Cache encore valide → pas de requête
    if (cache && now - fetchedAt < TTL) {
      setPlan(cache)
      setLoading(false)
      return
    }

    // Requête déjà en cours → attendre la même Promise
    if (!pending) {
      pending = api.get('/plan/status')
        .then(r => {
          cache     = r.data
          fetchedAt = Date.now()
          return r.data
        })
        .catch(() => null)
        .finally(() => { pending = null })
    }

    pending.then(data => {
      setPlan(data)
      setLoading(false)
    })
  }, [])

  // Force un refresh complet (après paiement, upgrade, downgrade)
  const refetch = () => {
    cache     = null
    fetchedAt = 0
    pending   = null
    setLoading(true)
    api.get('/plan/status')
      .then(r => { cache = r.data; fetchedAt = Date.now(); setPlan(r.data) })
      .catch(() => setPlan(null))
      .finally(() => setLoading(false))
  }

  // ── Valeurs dérivées ──────────────────────────────────────────
  const effectivePlan = computeEffectivePlan(plan)
  const hasAccess     = computeAccess(plan)
  const daysLeft      = computeDaysLeft(plan)

  const isTrial   = !!(plan?.trialEndAt && Date.now() <= new Date(plan.trialEndAt).getTime())
  const isPaid    = !!(plan?.planEndAt  && Date.now() <= new Date(plan.planEndAt).getTime() && !isTrial)
  const isFree    = !hasAccess
  const isUrgent  = (isTrial || isPaid) && daysLeft <= 3

  // Features disponibles selon le plan effectif
  const features  = plan?.features ?? {
    budgets:       false,
    recurring:     false,
    export:        false,
    multiCurrency: false,
    reports:       false,
  }

  // Infos organisation (si accès via fondateur)
  const viaOrg = plan?.viaOrg ?? null

  return {
    // Données brutes
    plan,
    loading,
    refetch,

    // Plan résolu
    effectivePlan,   // 'free' | 'pro' | 'family' | 'business'
    hasAccess,       // true si trial OU plan payant actif
    isTrial,         // true si dans la période d'essai
    isPaid,          // true si abonnement payant actif (hors trial)
    isFree,          // true si aucun accès actif
    isUrgent,        // true si expiration dans <= 3 jours

    // Temps restant
    daysLeft,        // nombre de jours avant expiration

    // Usage
    usage: plan?.usage ?? null,

    // Features
    features,

    // Organisation (accès via fondateur)
    viaOrg,
  }
}