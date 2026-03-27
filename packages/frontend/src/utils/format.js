// ── Symboles ──────────────────────────────────────────────────────
export const SYMBOLS = {
  MGA: 'Ar', EUR: '€',  USD: '$',   GBP: '£',
  CHF: 'Fr', JPY: '¥',  CAD: 'CA$', MAD: 'د.م', XOF: 'CFA',
}

const PREFIX = ['EUR','USD','GBP','CHF','CAD']

// ── Taux depuis MGA comme pivot (mis à jour par CurrencyPage) ─────
// Structure : { EUR: 0.000203, USD: 0.000222, ... }
// Signification : 1 MGA = X devise
let _rates = {}

export function setRates(rates) { _rates = rates || {} }
export function getRates()      { return _rates }

// ── Convertir : fromCurrency → toCurrency (pivot MGA) ────────────
export function convert(amount, fromCurrency = 'MGA', toCurrency = 'MGA') {
  if (!amount || isNaN(amount)) return 0
  if (fromCurrency === toCurrency) return Number(amount)

  // Étape 1 : ramener en MGA
  let inMGA
  if (fromCurrency === 'MGA') {
    inMGA = Number(amount)
  } else {
    const rate = _rates[fromCurrency]
    if (!rate) return Number(amount)   // taux inconnu → retourne brut
    inMGA = Number(amount) / rate      // ex: EUR → MGA : 1.015 / 0.000203
  }

  // Étape 2 : MGA → devise cible
  if (toCurrency === 'MGA') return inMGA
  const rateTo = _rates[toCurrency]
  if (!rateTo) return inMGA            // taux inconnu → retourne en MGA
  return inMGA * rateTo
}

// ── Formater : montant stocké en defaultCurrency, affiché en currency ──
export function fmt(n, currency = 'MGA', defaultCurrency = 'MGA') {
  const converted = convert(n, defaultCurrency, currency)
  const sym       = SYMBOLS[currency] || currency
  const isWhole   = currency === 'MGA' || currency === 'JPY' || currency === 'XOF'
  const num       = isWhole
    ? Math.round(converted).toLocaleString('fr-FR')
    : converted.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return PREFIX.includes(currency) ? `${sym} ${num}` : `${num} ${sym}`
}

// ── Utilitaires ───────────────────────────────────────────────────
export const pct     = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0
export const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })

export const MONTHS_SM   = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
export const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
export const MONTHS      = MONTHS_FULL