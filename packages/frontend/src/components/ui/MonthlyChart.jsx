import { useRef, useEffect, useState } from 'react'
import { MONTHS_SM } from '../../utils/format'

/**
 * Graphique barres mensuel — s'adapte à la largeur réelle du conteneur.
 * Props :
 *   data  — tableau de 12 objets { month, expenses, incomes }
 *   fmt   — fonction de formatage montant
 */
function MonthlyChartBar({ data, fmt }) {
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

export default function MonthlyChart({ data, fmt }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(320)
  const [tooltip, setTooltip] = useState(null)  // { x, y, d, i }

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

  const padL    = 8
  const padR    = 8
  const padT    = 16
  const padB    = 24
  const chartW  = width - padL - padR
  const chartH  = 110
  const totalH  = chartH + padT + padB
  const cols    = data.length

  const max = Math.max(...data.map(d => Math.max(Number(d.totalIncomes || 0), Number(d.totalExpenses || 0))), 1)

  // Coordonnée X d'un point
  const px = i => padL + (i / (cols - 1)) * chartW

  // Coordonnée Y d'un valeur
  const py = v => padT + chartH - (v / max) * chartH

  // Construire un path SVG smooth (courbe de Bézier)
  const smoothPath = (points) => {
    if (points.length < 2) return ''
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const cp1x = points[i].x     + (points[i + 1].x - points[i].x) / 3
      const cp1y = points[i].y
      const cp2x = points[i + 1].x - (points[i + 1].x - points[i].x) / 3
      const cp2y = points[i + 1].y
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`
    }
    return d
  }

  // Construire le path de remplissage (aire sous la courbe)
  const areaPath = (points) => {
    if (points.length < 2) return ''
    const bottom = padT + chartH
    return smoothPath(points)
      + ` L ${points[points.length - 1].x} ${bottom}`
      + ` L ${points[0].x} ${bottom} Z`
  }

  const incPoints = data.map((d, i) => ({ x: px(i), y: py(Number(d.totalIncomes  || 0)) }))
  const expPoints = data.map((d, i) => ({ x: px(i), y: py(Number(d.totalExpenses || 0)) }))

  const incPath  = smoothPath(incPoints)
  const expPath  = smoothPath(expPoints)
  const incArea  = areaPath(incPoints)
  const expArea  = areaPath(expPoints)

  const labelSize = width < 340 ? 7 : 9

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative', userSelect: 'none' }}>
      <svg
        width={width}
        height={totalH}
        viewBox={`0 0 ${width} ${totalH}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Gradient revenus */}
          <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00b894" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#00b894" stopOpacity="0"/>
          </linearGradient>
          {/* Gradient dépenses */}
          <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e74c3c" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#e74c3c" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Lignes horizontales guides */}
        {[0.25, 0.5, 0.75, 1].map(r => (
          <line
            key={r}
            x1={padL} y1={padT + chartH - r * chartH}
            x2={padL + chartW} y2={padT + chartH - r * chartH}
            stroke="#f0f0f0" strokeWidth={1}
          />
        ))}

        {/* Aires */}
        <path d={incArea} fill="url(#gradInc)"/>
        <path d={expArea} fill="url(#gradExp)"/>

        {/* Courbes */}
        <path d={incPath} fill="none" stroke="#00b894" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        <path d={expPath} fill="none" stroke="#e74c3c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>

        {/* Points + zones interactives */}
        {data.map((d, i) => {
          const ix = incPoints[i].x, iy = incPoints[i].y
          const ex = expPoints[i].x, ey = expPoints[i].y
          const isHov = tooltip?.i === i
          return (
            <g key={i}>
              {/* Ligne verticale survol */}
              {isHov && (
                <line x1={ix} y1={padT} x2={ix} y2={padT + chartH} stroke="#ddd" strokeWidth={1} strokeDasharray="3 3"/>
              )}

              {/* Point revenus */}
              <circle cx={ix} cy={iy} r={isHov ? 5 : 3} fill="#00b894" stroke="#fff" strokeWidth={1.5}/>
              {/* Point dépenses */}
              <circle cx={ex} cy={ey} r={isHov ? 5 : 3} fill="#e74c3c" stroke="#fff" strokeWidth={1.5}/>

              {/* Zone invisible interactive (toute la colonne) */}
              <rect
                x={px(i) - chartW / cols / 2} y={padT}
                width={chartW / cols} height={chartH}
                fill="transparent"
                onMouseEnter={e => setTooltip({ x: ix, i, d })}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={() => setTooltip(t => t?.i === i ? null : { x: ix, i, d })}
                style={{ cursor: 'pointer' }}
              />

              {/* Label mois */}
              <text
                x={ix} y={padT + chartH + padB - 6}
                textAnchor="middle"
                fontSize={labelSize}
                fill={isHov ? '#6C5CE7' : '#bbb'}
                fontWeight={isHov ? 700 : 400}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {MONTHS_SM[i] ?? `M${i + 1}`}
              </text>
            </g>
          )
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx  = Math.min(tooltip.x, width - 90)
          const ty  = padT
          const inc = Number(tooltip.d.totalIncomes  || 0)
          const exp = Number(tooltip.d.totalExpenses || 0)
          return (
            <g>
              <rect x={tx - 4} y={ty - 4} width={94} height={46} rx={8} fill="#1a1a2e" opacity={0.92}/>
              <circle cx={tx + 7} cy={ty + 13} r={3} fill="#00b894"/>
              <text x={tx + 14} y={ty + 17} fontSize={10} fill="#fff" fontFamily="Inter, system-ui, sans-serif">
                {fmt(inc)}
              </text>
              <circle cx={tx + 7} cy={ty + 30} r={3} fill="#e74c3c"/>
              <text x={tx + 14} y={ty + 34} fontSize={10} fill="#fff" fontFamily="Inter, system-ui, sans-serif">
                {fmt(exp)}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}