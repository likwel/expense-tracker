// ── Symboles ──────────────────────────────────────────────────────
export const SYMBOLS = {
  MGA: 'Ar', EUR: '€',  USD: '$',   GBP: '£',
  CHF: 'Fr', JPY: '¥',  CAD: 'CA$', MAD: 'د.م', XOF: 'CFA',
}

const PREFIX = ['EUR','USD','GBP','CHF','CAD']

// ── Taux depuis MGA (mis à jour par CurrencyPage) ─────────────────
// Structure : { EUR: 0.000203, USD: 0.000222, ... }
let _rates = {}

export function setRates(rates) { _rates = rates || {} }
export function getRates()      { return _rates }

// ── Convertir un montant MGA → devise cible ───────────────────────
export function convert(amountMGA, currency) {
  if (!currency || currency === 'MGA') return Number(amountMGA)
  const rate = _rates[currency]
  if (!rate) return Number(amountMGA)   // taux inconnu → pas de conversion
  return Number(amountMGA) * rate
}

// ── Formater un montant (MGA en base) selon devise cible ──────────
export function fmt(n, currency = 'MGA') {
  const converted = convert(n, currency)
  const sym       = SYMBOLS[currency] || currency

  // Arrondi selon devise : JPY = entier, autres = 2 décimales si pas MGA
  const isWhole = currency === 'MGA' || currency === 'JPY' || currency === 'XOF'
  const num = isWhole
    ? Math.round(converted).toLocaleString('fr-FR')
    : converted.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return PREFIX.includes(currency) ? `${sym} ${num}` : `${num} ${sym}`
}

// ── Reste inchangé ────────────────────────────────────────────────
export const pct     = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0
export const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })

export const MONTHS_SM   = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
export const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
export const MONTHS      = MONTHS_FULL