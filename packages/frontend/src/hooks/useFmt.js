import { useCallback, useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { fmt as fmtBase, convert } from '../utils/format'

export function useFmt() {
  const auth            = useContext(AuthContext)
  const currency        = auth?.user?.currency        || 'MGA'  // devise d'affichage
  const defaultCurrency = auth?.user?.defaultCurrency || 'MGA'  // devise de stockage en DB
  const ratesReady      = auth?.ratesReady ?? true

  // Afficher un montant stocké en defaultCurrency → converti en currency
  const fmt = useCallback(
    (n) => {
      if (!ratesReady) return '—'
      return fmtBase(n, currency, defaultCurrency)
    },
    [currency, defaultCurrency, ratesReady]
  )

  // Convertir une saisie (en currency) → defaultCurrency avant sauvegarde en DB
  const toBase = useCallback(
    (n) => {
      if (!ratesReady) return null
      return convert(n, currency, defaultCurrency)
    },
    [currency, defaultCurrency, ratesReady]
  )

  // Convertir un montant defaultCurrency → currency (valeur brute, sans formatage)
  const fromBase = useCallback(
    (n) => {
      if (!ratesReady) return null
      return convert(n, defaultCurrency, currency)
    },
    [currency, defaultCurrency, ratesReady]
  )

  return { fmt, toBase, fromBase, currency, defaultCurrency, ratesReady }
}