// services/currencyService.js

const rateCache = new Map()
const CACHE_TTL = 5 * 60 * 1000  // 5 minutes

/**
 * Récupère le taux de change depuis `from` vers `to`.
 * Utilise un cache mémoire de 5 min pour éviter les appels répétés.
 */
async function getRate(from, to) {
  if (from === to) return 1
  const key    = `${from}_${to}`
  const cached = rateCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.rate
  const res  = await fetch(`https://open.er-api.com/v6/latest/${from}`)
  const data = await res.json()
  const rate = data?.rates?.[to]
  if (!rate) throw new Error(`Taux introuvable : ${from} → ${to}`)
  rateCache.set(key, { rate, ts: Date.now() })
  return rate
}

/**
 * Convertit un montant depuis `fromCurrency` vers `toCurrency`.
 * Retourne le montant tel quel si les devises sont identiques ou en cas d'erreur.
 * @param {number} amount
 * @param {string} fromCurrency  — devise source (ex: 'EUR')
 * @param {string} toCurrency    — devise cible  (ex: 'MGA')
 * @returns {Promise<{ amountInBase: number, rate: number }>}
 */
async function convert(amount, fromCurrency, toCurrency) {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
    return { amountInBase: amount, rate: 1 }
  }
  try {
    const rate = await getRate(fromCurrency, toCurrency)
    return { amountInBase: Math.ceil(amount * rate), rate }
  } catch (_) {
    console.warn(`[currencyService] Conversion échouée ${fromCurrency}→${toCurrency}, montant brut conservé`)
    return { amountInBase: amount, rate: 1 }
  }
}

/**
 * Résout les devises d'un utilisateur depuis Prisma.
 * @param {object} prisma
 * @param {string} userId
 * @returns {Promise<{ currency: string, defaultCurrency: string }>}
 */
async function getUserCurrencies(prisma, userId) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { currency: true, defaultCurrency: true },
  })
  return {
    currency:        user?.currency        || 'MGA',
    defaultCurrency: user?.defaultCurrency || 'MGA',
  }
}

module.exports = { convert, getUserCurrencies, getRate }