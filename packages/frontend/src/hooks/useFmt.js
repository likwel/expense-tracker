import { useCallback, useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { fmt as fmtBase } from '../utils/format'

export function useFmt() {
  const auth       = useContext(AuthContext)
  const currency   = auth?.user?.currency || 'MGA'
  const ratesReady = auth?.ratesReady ?? true   // si pas de contexte → afficher quand même

  // fmt attend que les taux soient chargés
  // si pas prêts → affiche en devise de base sans conversion
  const fmt = useCallback(
    (n) => {
      if (!ratesReady) return fmtBase(n, auth?.user?.defaultCurrency || 'MGA')
      return fmtBase(n, currency)
    },
    [currency, ratesReady, auth?.user?.defaultCurrency]
  )

  return { fmt, currency, ratesReady }
}