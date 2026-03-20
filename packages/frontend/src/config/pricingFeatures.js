// ─── Features par plan ────────────────────────────────────────────────────────

export const FREE_FEATURES = [
  "30 transactions par mois",
  "3 catégories personnalisées",
  "1 compte (pas de multi-devises)",
  "Rapport mensuel basique",
  "Historique limité à 3 mois",
]

export const PRO_FEATURES = [
  "Transactions illimitées",
  "Catégories & budgets illimités",
  "Dépenses & revenus récurrents",
  "Rapports avancés & graphiques",
  "Export CSV / PDF",
  "Alertes de budget personnalisées",
  "Multi-devises (Ar, €, $, £...)",
  "Historique complet",
  "Support prioritaire",
]

export const BUSINESS_FEATURES = [
  "Tout le plan Pro",
  "Jusqu'à 5 comptes utilisateurs",
  "Tableau de bord partagé",
  "API access",
  "Export automatique mensuel",
  "Gestionnaire de compte dédié",
]

// ─── Tarifications ────────────────────────────────────────────────────────────

export const PLANS = [
  {
    key:      'free',
    name:     'Gratuit',
    desc:     'Pour découvrir Depenzo',
    price:    { mga: 0,      usd: 0,    eur: 0   },
    features: FREE_FEATURES,
    cta:      'Commencer gratuitement',
    highlight: false,
  },
  {
    key:      'pro',
    name:     'Pro',
    desc:     'Pour un suivi complet',
    price:    { mga: 15000,  usd: 4.99, eur: 4.49 },
    yearlyDiscount: 2,           // 2 mois offerts sur abonnement annuel
    features: PRO_FEATURES,
    cta:      'Démarrer l\'essai gratuit',
    highlight: true,             // plan mis en avant
    trial:    3,                 // mois d'essai offerts
  },
  {
    key:      'business',
    name:     'Business',
    desc:     'Pour les petites entreprises',
    price:    { mga: 40000,  usd: 12.99, eur: 11.99 },
    yearlyDiscount: 2,
    features: BUSINESS_FEATURES,
    cta:      'Contacter l\'équipe',
    highlight: false,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatPrice(plan, currency = 'mga') {
  const amount = plan.price[currency]
  if (amount === 0) return 'Gratuit'
  if (currency === 'mga') return `${amount.toLocaleString('fr-MG')} Ar`
  if (currency === 'usd') return `$${amount.toFixed(2)}`
  if (currency === 'eur') return `${amount.toFixed(2)} €`
  return `${amount}`
}

export function formatYearlyPrice(plan, currency = 'mga') {
  const monthly = plan.price[currency]
  if (!monthly || !plan.yearlyDiscount) return null
  const months  = 12 - plan.yearlyDiscount   // ex: 10 mois payés pour 12
  const yearly  = monthly * months
  if (currency === 'mga') return `${yearly.toLocaleString('fr-MG')} Ar / an`
  if (currency === 'usd') return `$${yearly.toFixed(2)} / an`
  if (currency === 'eur') return `${yearly.toFixed(2)} € / an`
  return `${yearly}`
}