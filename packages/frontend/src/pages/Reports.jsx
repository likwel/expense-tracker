import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import Header  from '../components/layout/Header'
import Card    from '../components/ui/Card'
import Button  from '../components/ui/Button'
import { fmt, pct, MONTHS } from '../utils/format'
import { useApi }     from '../hooks/useApi'
import { reportsApi } from '../services/api'
import MonthPicker from '../components/ui/MonthPicker'

const now = new Date()

// ── Camembert SVG ─────────────────────────────────────────────────
const PieChart = ({ data }) => {
  const total = data.reduce((s, d) => s + Number(d.total || 0), 0)
  if (!total) return null
  let angle = -Math.PI / 2
  const cx = 55, cy = 55, r = 46
  return (
    <svg width="115" height="115" viewBox="0 0 115 115">
      {data.map((d, i) => {
        const slice = (Number(d.total) / total) * Math.PI * 2
        const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
        angle += slice
        const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
        return (
          <path key={i}
            d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${slice > Math.PI ? 1 : 0},1 ${x2},${y2} Z`}
            fill={d.color || '#ccc'} stroke="#fff" strokeWidth={2}/>
        )
      })}
      <circle cx={cx} cy={cy} r={26} fill="#fff"/>
    </svg>
  )
}

// ── Téléchargement blob ───────────────────────────────────────────
const download = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Helper filtre récurrences actives du mois ─────────────────────
const filterActive = (list, year, month) => (list || []).filter(r => {
  if (!r.isActive) return false
  const start  = new Date(r.startDate)
  const end    = r.endDate ? new Date(r.endDate) : null
  const mStart = new Date(year, month - 1, 1)
  const mEnd   = new Date(year, month, 0)
  return start <= mEnd && (!end || end >= mStart)
})

// ── Helper estimation montant récurrent ───────────────────────────
const estimateAmount = (list, daysInMonth, workingDays) =>
  list.reduce((s, r) => {
    const amt = Number(r.amount)
    if (r.frequency === 'monthly') return s + amt
    if (r.frequency === 'weekly')  return s + amt * 4
    if (r.frequency === 'daily')
      return s + amt * (r.dayType === 'working' ? workingDays : daysInMonth)
    return s
  }, 0)

export default function Reports() {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year]            = useState(now.getFullYear())

  const { data: summary }   = useApi('/reports/summary',   { month, year })
  const { data: recurExpList } = useApi('/recurring')
  const { data: recurIncList } = useApi('/recurring-income')

  // ── Valeurs backend ───────────────────────────────────────────
  const punctualExp    = summary?.punctualExpenses  || 0
  const recurringExp   = summary?.recurringExpenses || 0
  const punctualInc    = summary?.punctualIncomes   || 0
  const recurringInc   = summary?.recurringIncomes  || 0
  const totalIncReal   = summary?.totalIncomes      || 0
  const byCat          = summary?.byCategory        || []

  // ── Récurrences actives ce mois ───────────────────────────────
  const activeRecurExp = filterActive(recurExpList, year, month)
  const activeRecurInc = filterActive(recurIncList, year, month)

  const daysInMonth = new Date(year, month, 0).getDate()
  const workingDays = Math.round(daysInMonth * 5 / 7)

  const estimatedExp = estimateAmount(activeRecurExp, daysInMonth, workingDays)
  const estimatedInc = estimateAmount(activeRecurInc, daysInMonth, workingDays)

  // ── Totaux cohérents ──────────────────────────────────────────
  const totalRecurExp = recurringExp > 0 ? recurringExp : estimatedExp
  const totalRecurInc = recurringInc > 0 ? recurringInc : estimatedInc
  const totalExp      = punctualExp + totalRecurExp
  const totalInc      = totalIncReal > 0
    ? totalIncReal + (recurringInc === 0 ? estimatedInc : 0)
    : punctualInc + totalRecurInc
  const balance       = totalInc - totalExp
  const savings       = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0

  const isExpEstimated = recurringExp === 0 && estimatedExp > 0
  const isIncEstimated = recurringInc === 0 && estimatedInc > 0

  // ── Export ────────────────────────────────────────────────────
  const exportPDF = async () => {
    try {
      const r = await reportsApi.pdf({ month, year })
      download(r.data, `rapport-${year}-${String(month).padStart(2,'0')}.pdf`)
    } catch { alert('Erreur export PDF') }
  }
  const exportExcel = async () => {
    try {
      const r = await reportsApi.excel({ month, year })
      download(r.data, `rapport-${year}-${String(month).padStart(2,'0')}.xlsx`)
    } catch { alert('Erreur export Excel') }
  }

  return (
    <div>
      <Header title="Rapports"/>
      <div style={{ padding: '12px 16px' }}>

        {/* ── Filtre mois ─────────────────────────────────────── */}
        <MonthPicker month={month} setMonth={setMonth} months={MONTHS} />

        {/* ── Hero taux d'épargne ─────────────────────────────── */}
        <div style={{ background: '#00b894', borderRadius: 20,
          padding: '20px', marginBottom: 14, color: '#fff' }}>
          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4,
            textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
            Taux d'épargne
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1,
            color: savings >= 0 ? '#fff' : '#ffb3b3' }}>
            {savings >= 0 ? savings : 0}%
          </div>
          {(isExpEstimated || isIncEstimated) && (
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
              * valeurs estimées, non encore générées
            </div>
          )}
          <div style={{ display: 'flex', marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>
                Revenus {isIncEstimated && '~'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(totalInc)}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.25)', margin: '0 10px' }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>
                Dépenses {isExpEstimated && '~'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(totalExp)}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.25)', margin: '0 10px' }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>Solde</div>
              <div style={{ fontWeight: 700, fontSize: 13,
                color: balance >= 0 ? '#fff' : '#ffb3b3' }}>
                {fmt(balance)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Revenus ─────────────────────────────────────────── */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#222', marginBottom: 10 }}>
            Revenus totaux
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#00b894' }}>
              {isIncEstimated ? '~' : ''}{fmt(totalInc)}
            </span>
            {isIncEstimated && (
              <span style={{ fontSize: 11, color: '#aaa', background: '#f5f5f5',
                borderRadius: 8, padding: '3px 8px' }}>
                estimation incluse
              </span>
            )}
          </div>
          {totalInc > 0 && (
            <>
              <div style={{ display: 'flex', height: 8, borderRadius: 99,
                overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${pct(punctualInc, totalInc)}%`,
                  background: '#00b894', transition: 'width 0.4s' }}/>
                <div style={{ flex: 1, background: '#6C5CE7' }}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3,
                    background: '#00b894', display: 'block', flexShrink: 0 }}/>
                  <span style={{ color: '#555' }}>Ponctuel</span>
                  <span style={{ fontWeight: 700, color: '#00b894' }}>{fmt(punctualInc)}</span>
                  <span style={{ color: '#aaa' }}>({pct(punctualInc, totalInc)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3,
                    background: '#6C5CE7', display: 'block', flexShrink: 0 }}/>
                  <span style={{ color: '#555' }}>
                    Récurrent {isIncEstimated && <span style={{ color: '#bbb' }}>(estimé)</span>}
                  </span>
                  <span style={{ fontWeight: 700, color: '#6C5CE7' }}>{fmt(totalRecurInc)}</span>
                  <span style={{ color: '#aaa' }}>({pct(totalRecurInc, totalInc)}%)</span>
                </div>
              </div>
            </>
          )}

          {/* Liste récurrents revenus actifs */}
          {activeRecurInc.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid #f5f5f5', paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <RefreshCw size={13} color="#6C5CE7" strokeWidth={1.8}/>
                <span style={{ fontSize: 12, color: '#6C5CE7', fontWeight: 600 }}>
                  Revenus récurrents ce mois
                </span>
              </div>
              {activeRecurInc.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center',
                  gap: 10, padding: '7px 0', borderBottom: '1px solid #f9f9f9' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: (r.category?.color || '#00b894') + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={13} color={r.category?.color || '#00b894'} strokeWidth={1.8}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#222' }}>
                      {r.description || r.category?.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>
                      {r.frequency === 'daily'   && 'Quotidien'}
                      {r.frequency === 'weekly'  && 'Hebdomadaire'}
                      {r.frequency === 'monthly' && `Le ${r.dayOfMonth} du mois`}
                      {r.dayType === 'working'   && ' · jours ouvrés'}
                      {r.dayType === 'holiday'   && ' · jours fériés'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12,
                    color: '#00b894', flexShrink: 0 }}>
                    +{fmt(r.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Dépenses ────────────────────────────────────────── */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#222', marginBottom: 10 }}>
            Dépenses totales
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#e74c3c' }}>
              {isExpEstimated ? '~' : ''}{fmt(totalExp)}
            </span>
            {isExpEstimated && (
              <span style={{ fontSize: 11, color: '#aaa', background: '#f5f5f5',
                borderRadius: 8, padding: '3px 8px' }}>
                estimation incluse
              </span>
            )}
          </div>
          {totalExp > 0 && (
            <>
              <div style={{ display: 'flex', height: 8, borderRadius: 99,
                overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${pct(punctualExp, totalExp)}%`,
                  background: '#e74c3c', transition: 'width 0.4s' }}/>
                <div style={{ flex: 1, background: '#6C5CE7' }}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3,
                    background: '#e74c3c', display: 'block', flexShrink: 0 }}/>
                  <span style={{ color: '#555' }}>Ponctuel</span>
                  <span style={{ fontWeight: 700, color: '#e74c3c' }}>{fmt(punctualExp)}</span>
                  <span style={{ color: '#aaa' }}>({pct(punctualExp, totalExp)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3,
                    background: '#6C5CE7', display: 'block', flexShrink: 0 }}/>
                  <span style={{ color: '#555' }}>
                    Récurrent {isExpEstimated && <span style={{ color: '#bbb' }}>(estimé)</span>}
                  </span>
                  <span style={{ fontWeight: 700, color: '#6C5CE7' }}>{fmt(totalRecurExp)}</span>
                  <span style={{ color: '#aaa' }}>({pct(totalRecurExp, totalExp)}%)</span>
                </div>
              </div>
            </>
          )}

          {/* Liste récurrents dépenses actifs */}
          {activeRecurExp.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid #f5f5f5', paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <RefreshCw size={13} color="#6C5CE7" strokeWidth={1.8}/>
                <span style={{ fontSize: 12, color: '#6C5CE7', fontWeight: 600 }}>
                  Dépenses récurrentes ce mois
                </span>
              </div>
              {activeRecurExp.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center',
                  gap: 10, padding: '7px 0', borderBottom: '1px solid #f9f9f9' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: (r.category?.color || '#e74c3c') + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={13} color={r.category?.color || '#e74c3c'} strokeWidth={1.8}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#222' }}>
                      {r.description || r.category?.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>
                      {r.frequency === 'daily'   && 'Quotidien'}
                      {r.frequency === 'weekly'  && 'Hebdomadaire'}
                      {r.frequency === 'monthly' && `Le ${r.dayOfMonth} du mois`}
                      {r.dayType === 'working'   && ' · jours ouvrés'}
                      {r.dayType === 'holiday'   && ' · jours fériés'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12,
                    color: '#e74c3c', flexShrink: 0 }}>
                    -{fmt(r.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Répartition dépenses par catégorie ──────────────── */}
        {byCat.length > 0 && (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#222', marginBottom: 12 }}>
              Répartition par catégorie
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <PieChart data={byCat}/>
              <div style={{ flex: 1 }}>
                {byCat.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center',
                    gap: 8, marginBottom: 9 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 99,
                      background: c.color || '#ccc', flexShrink: 0 }}/>
                    <div style={{ flex: 1, fontSize: 12, color: '#555',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.name || 'Autre'}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#222', flexShrink: 0 }}>
                      {fmt(c.total)}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>
                      {pct(c.total, totalExp)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── Export ──────────────────────────────────────────── */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#222', marginBottom: 12 }}>
            Exporter {MONTHS[month - 1]} {year}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={exportPDF}
              style={{ flex: 1, background: '#e74c3c', padding: '13px 0', fontSize: 13 }}>
              <Download size={15}/> PDF
            </Button>
            <Button onClick={exportExcel}
              style={{ flex: 1, background: '#00b894', padding: '13px 0', fontSize: 13 }}>
              <Download size={15}/> Excel
            </Button>
          </div>
        </Card>

      </div>
    </div>
  )
}