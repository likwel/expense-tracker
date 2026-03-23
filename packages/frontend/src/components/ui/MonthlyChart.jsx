import { useRef, useEffect, useState } from 'react'
import { MONTHS_SM } from '../../utils/format'

/**
 * Graphique barres mensuel — s'adapte à la largeur réelle du conteneur.
 * Props :
 *   data  — tableau de 12 objets { month, expenses, incomes }
 *   fmt   — fonction de formatage montant
 */
export default function MonthlyChart({ data, fmt }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(320)

  // Mesure la largeur réelle du conteneur
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width
      if (w) setWidth(Math.floor(w))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!data || data.length === 0) return null

  const max       = Math.max(...data.map(d => Math.max(Number(d.expenses||0), Number(d.incomes||0))), 1)
  const chartH    = 100   // hauteur zone barres
  const labelH    = 18    // hauteur zone labels mois
  const totalH    = chartH + labelH
  const cols      = data.length           // 12
  const colW      = width / cols
  const barW      = Math.max(4, Math.min(12, colW * 0.3))  // barres adaptatives
  const gap       = Math.max(1, barW * 0.3)
  const groupW    = barW * 2 + gap
  // Taille de police responsive : plus petit sur téléphone
  const labelSize = width < 340 ? 7 : width < 500 ? 8 : 10

  return (
    <div ref={containerRef} style={{ width:'100%' }}>
      <svg
        width={width}
        height={totalH}
        viewBox={`0 0 ${width} ${totalH}`}
        style={{ display:'block', overflow:'visible' }}
      >
        {data.map((d, i) => {
          const inc = Number(d.incomes  || 0)
          const exp = Number(d.expenses || 0)
          const hr  = Math.max(2, (inc / max) * chartH)
          const he  = Math.max(2, (exp / max) * chartH)
          const cx  = i * colW + colW / 2              // centre de la colonne
          const x   = cx - groupW / 2                  // début du groupe

          return (
            <g key={i}>
              {/* Barre revenus */}
              <rect
                x={x} y={chartH - hr}
                width={barW} height={hr}
                fill="#00b894" rx={2} opacity={0.85}
              />
              {/* Barre dépenses */}
              <rect
                x={x + barW + gap} y={chartH - he}
                width={barW} height={he}
                fill="#e74c3c" rx={2} opacity={0.85}
              />
              {/* Label mois */}
              <text
                x={cx} y={chartH + labelH - 4}
                textAnchor="middle"
                fontSize={labelSize}
                fill="#bbb"
                fontFamily="system-ui, sans-serif"
              >
                {MONTHS_SM[i] ?? `M${i+1}`}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}