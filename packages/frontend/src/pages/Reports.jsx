import { useState } from 'react'
import { Download, RefreshCw, Lock, TrendingUp, Calendar, BarChart2, ArrowRight, X, Zap } from 'lucide-react'
import Header      from '../components/layout/Header'
import Card        from '../components/ui/Card'
import Button      from '../components/ui/Button'
import { pct, MONTHS } from '../utils/format'
import { useApi }      from '../hooks/useApi'
import { reportsApi }  from '../services/api'
import MonthPicker     from '../components/ui/MonthPicker'
import { useFmt }      from '../hooks/useFmt'
import { usePlan }     from '../hooks/usePlan'
import { useNavigate } from 'react-router-dom'
import { useOrg } from '../contexts/OrgContext'

const now = new Date()

/* ─── Camembert SVG ────────────────────────────────────────────── */
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

/* ─── Graphique barres simple ──────────────────────────────────── */
const BarChart = ({ data, color = '#6C5CE7' }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <div style={{
            width:'100%', borderRadius:'4px 4px 0 0',
            height: `${Math.max(4, (d.value / max) * 64)}px`,
            background: i === data.length - 1 ? color : color + '55',
            transition:'height 0.4s',
          }}/>
          <span style={{ fontSize:9, color:'#aaa', whiteSpace:'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Modal upgrade Pro ────────────────────────────────────────── */
function ProModal({ feature, onClose }) {
  const navigate = useNavigate()
  const FEATURE_LABELS = {
    evolution:   'Graphique évolution',
    comparison:  'Comparaison mois précédent',
    forecast:    'Prévisions mois suivant',
    annual:      'Rapport annuel complet',
  }
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:100,
      background:'rgba(0,0,0,0.4)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:480,
        background:'#fff', borderRadius:'20px 20px 0 0',
        padding:'0 0 32px',
      }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'#e0e0e0' }}/>
        </div>
        <div style={{ padding:'12px 20px 20px' }}>
          <div style={{
            width:52, height:52, borderRadius:16, background:'#EEEDFE',
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14,
          }}>
            <Lock size={22} color="#6C5CE7" strokeWidth={2}/>
          </div>
          <div style={{ fontSize:18, fontWeight:800, color:'#222', marginBottom:6 }}>
            Fonctionnalité Pro
          </div>
          <div style={{ fontSize:13, color:'#888', lineHeight:1.6, marginBottom:20 }}>
            <strong style={{ color:'#222' }}>{FEATURE_LABELS[feature]}</strong> est disponible
            avec le plan Pro. Passez au Pro pour débloquer toutes les fonctionnalités avancées.
          </div>
          {[
            { icon: BarChart2,   label: 'Graphique évolution 6/12 mois' },
            { icon: ArrowRight,  label: 'Comparaison mois précédent'    },
            { icon: TrendingUp,  label: 'Prévisions mois suivant'       },
            { icon: Calendar,    label: 'Rapport annuel complet'        },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 0', borderBottom:'1px solid #f5f5f5',
            }}>
              <div style={{
                width:28, height:28, borderRadius:8, background:'#EEEDFE',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              }}>
                <Icon size={13} color="#6C5CE7" strokeWidth={2}/>
              </div>
              <span style={{ fontSize:13, color:'#444' }}>{label}</span>
            </div>
          ))}
          <button onClick={() => { onClose(); navigate('/plan') }} style={{
            width:'100%', padding:14, borderRadius:12, border:'none',
            background:'#6C5CE7', color:'#fff', fontWeight:700, fontSize:15,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            marginTop:20,
          }}>
            <Zap size={16} strokeWidth={2.5}/>
            Passer au plan Pro
          </button>
          <button onClick={onClose} style={{
            width:'100%', padding:11, borderRadius:12, border:'1px solid #eee',
            background:'transparent', color:'#aaa', fontWeight:600, fontSize:13,
            cursor:'pointer', marginTop:8,
          }}>
            Pas maintenant
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Carte feature Pro verrouillée ────────────────────────────── */
function ProCard({ feature, title, icon: Icon, preview, onUpgrade }) {
  return (
    <Card style={{ position:'relative', overflow:'hidden' }}>
      <div style={{ filter:'blur(3px)', opacity:0.35, pointerEvents:'none', userSelect:'none' }}>
        {preview}
      </div>
      <div onClick={() => onUpgrade(feature)} style={{
        position:'absolute', inset:0, cursor:'pointer',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        background:'rgba(255,255,255,0.7)', gap:8,
      }}>
        <div style={{
          width:40, height:40, borderRadius:12, background:'#EEEDFE',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Icon size={18} color="#6C5CE7" strokeWidth={2}/>
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:'#222' }}>{title}</div>
        <div style={{
          display:'flex', alignItems:'center', gap:5, fontSize:11,
          background:'#6C5CE7', color:'#fff', borderRadius:20, padding:'4px 12px', fontWeight:600,
        }}>
          <Lock size={11} strokeWidth={2.5}/>Pro
        </div>
      </div>
    </Card>
  )
}

/* ─── Helpers ───────────────────────────────────────────────────── */
const download = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const filterActive = (list, year, month) => (list || []).filter(r => {
  if (!r.isActive) return false
  // ✅ Parser en UTC pour éviter le décalage de fuseau horaire
  const start  = new Date(r.startDate) // ISO UTC depuis le backend
  const end    = r.endDate ? new Date(r.endDate) : null
  const mStart = new Date(Date.UTC(year, month - 1, 1))
  const mEnd   = new Date(Date.UTC(year, month, 0, 23, 59, 59))
  // Exclure si pas encore commencé ce mois
  if (start > mEnd) return false
  // Exclure si terminé avant ce mois
  if (end && end < mStart) return false
  return true
})

/* ─── Page principale ───────────────────────────────────────────── */
export default function Reports() {
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [year]                  = useState(now.getFullYear())
  const [proModal, setProModal] = useState(null)
  const { fmt }  = useFmt()
  const { plan } = usePlan()
  const isPro    = plan?.effectivePlan === 'pro' || plan?.isTrial

  // ✅ UTC pour éviter les décalages de fuseau horaire
  const mStart = new Date(Date.UTC(year, month - 1, 1))
  const mEnd   = new Date(Date.UTC(year, month, 0))

  const { activeOrg } = useOrg()
  // ✅ Paramètres réactifs selon l'org active
  const orgParam = activeOrg ? { orgId: activeOrg.id } : {}

  const { data: summary }      = useApi('/reports/summary',   { month, year, ... orgParam })
  const { data: recurExpList } = useApi('/recurring', orgParam)
  const { data: recurIncList } = useApi('/recurring-income', orgParam)
  const { data: evolution }    = useApi(isPro ? '/reports/evolution' : null, { year, ... orgParam })

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  const { data: prevSummary } = useApi(isPro ? '/reports/summary' : null, { month: prevMonth, year: prevYear })
  const { data: annualData }  = useApi(isPro ? '/reports/annual'  : null, { year })

  /* ── Valeurs backend ─────────────────────────────────────────── */
  const punctualExp  = summary?.punctualExpenses  || 0
  const recurringExp = summary?.recurringExpenses || 0
  const punctualInc  = summary?.punctualIncomes   || 0
  const recurringInc = summary?.recurringIncomes  || 0
  const totalIncReal = summary?.totalIncomes      || 0
  const byCat        = summary?.byCategory        || []

  // ✅ même filtre que Expenses : juste isActive
  // const activeRecurExp = (recurExpList || []).filter(r => r.isActive)
  // const activeRecurInc = (recurIncList || []).filter(r => r.isActive)
  const activeRecurExp = filterActive(recurExpList, year, month)
  const activeRecurInc = filterActive(recurIncList, year, month)

  const daysInMonth    = mEnd.getDate()
  const workingDays    = Math.round(daysInMonth * 5 / 7)

  const estimateAmount = (list, _mStart, _mEnd) => list.reduce((s, r) => {
    const amt  = Number(r.amount)
    const rEnd = r.endDate ? new Date(r.endDate) : null

    if (r.frequency === 'monthly') return s + amt
    if (r.frequency === 'weekly')  return s + amt * 4

    if (r.frequency === 'daily') {
      // ✅ Parser en UTC pour cohérence avec _mStart/_mEnd
      const rStart   = r.startDate ? new Date(r.startDate) : _mStart
      // effStart = toujours le 1er jour du mois sélectionné si startDate est avant
      const effStart = rStart > _mStart ? rStart : _mStart
      const effEnd   = rEnd && rEnd < _mEnd ? rEnd : _mEnd
      const effDays    = Math.max(0, Math.round((effEnd - effStart) / 86400000) + 1)
      const effWorking = Math.round(effDays * 5 / 7)
      return s + amt * (r.dayType === 'working' ? effWorking : effDays)
    }

    return s
  }, 0)

  const estimatedExp = estimateAmount(activeRecurExp, mStart, mEnd)
  const estimatedInc = estimateAmount(activeRecurInc, mStart, mEnd)

  console.log('estimatedExp:', estimatedExp, '| estimatedInc:', estimatedInc)

  const totalRecurExp = estimatedExp
  const totalRecurInc = estimatedInc
  const totalExp      = punctualExp + totalRecurExp
  const totalInc      = punctualInc + totalRecurInc
  const balance       = totalInc - totalExp
  const savings       = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0

  const isExpEstimated = estimatedExp > 0
  const isIncEstimated = estimatedInc > 0

  /* ── Données évolution (Pro) ─────────────────────────────────── */
  const evoData = (evolution?.months || Array.from({ length: 6 }, (_, i) => ({
    label: MONTHS[(month - 6 + i + 12) % 12]?.slice(0, 3),
    value: Math.random() * 500000,
  }))).slice(-6).map(m => ({
    label: m.label || MONTHS[m.month - 1]?.slice(0, 3),
    value: m.totalExpenses || m.value || 0,
  }))

  /* ── Comparaison (Pro) ───────────────────────────────────────── */
  const prevExp = (prevSummary?.punctualExpenses || 0) + (prevSummary?.recurringExpenses || 0)
  const prevInc = prevSummary?.totalIncomes || 0
  const diffExp = totalExp - prevExp
  const diffInc = totalInc - prevInc

  /* ── Export ──────────────────────────────────────────────────── */
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
  const exportAnnual = async () => {
    try {
      const r = await reportsApi.annual({ year })
      download(r.data, `rapport-annuel-${year}.pdf`)
    } catch (e) { console.log(e); alert('Erreur export rapport annuel') }
  }

  return (
    <div>
      {proModal && <ProModal feature={proModal} onClose={() => setProModal(null)}/>}

      <Header title="Rapports"/>
      <div style={{ padding:'12px 16px' }}>

        <MonthPicker month={month} setMonth={setMonth} months={MONTHS}/>

        {/* Hero taux d'épargne */}
        <div style={{ background:'#00b894', borderRadius:20,
          padding:'20px', marginBottom:14, color:'#fff' }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4,
            textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:500 }}>
            Taux d'épargne
          </div>
          <div style={{ fontSize:38, fontWeight:800, lineHeight:1,
            color: savings >= 0 ? '#fff' : '#ffb3b3' }}>
            {savings >= 0 ? savings : 0}%
          </div>
          {(isExpEstimated || isIncEstimated) && (
            <div style={{ fontSize:10, opacity:0.7, marginTop:4 }}>
              * valeurs estimées, non encore générées
            </div>
          )}
          <div style={{ display:'flex', marginTop:14 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, opacity:0.7, marginBottom:2 }}>
                Revenus {isIncEstimated && '~'}
              </div>
              <div style={{ fontWeight:700, fontSize:13 }}>{fmt(totalInc)}</div>
            </div>
            <div style={{ width:1, background:'rgba(255,255,255,0.25)', margin:'0 10px' }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, opacity:0.7, marginBottom:2 }}>
                Dépenses {isExpEstimated && '~'}
              </div>
              <div style={{ fontWeight:700, fontSize:13 }}>{fmt(totalExp)}</div>
            </div>
            <div style={{ width:1, background:'rgba(255,255,255,0.25)', margin:'0 10px' }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, opacity:0.7, marginBottom:2 }}>Solde</div>
              <div style={{ fontWeight:700, fontSize:13,
                color: balance >= 0 ? '#fff' : '#ffb3b3' }}>
                {fmt(balance)}
              </div>
            </div>
          </div>
        </div>

        {/* ── PRO : Graphique évolution ── */}
        {isPro ? (
          <Card>
            <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:4 }}>
              Évolution des dépenses
            </div>
            <div style={{ fontSize:11, color:'#aaa', marginBottom:14 }}>6 derniers mois</div>
            <BarChart data={evoData} color="#6C5CE7"/>
          </Card>
        ) : (
          <ProCard
            feature="evolution" title="Évolution sur 6 mois" icon={BarChart2}
            onUpgrade={setProModal}
            preview={
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:14 }}>Évolution des dépenses</div>
                <BarChart data={evoData} color="#6C5CE7"/>
              </div>
            }
          />
        )}

        {/* ── PRO : Comparaison mois précédent ── */}
        {isPro ? (
          <Card>
            <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:12 }}>
              vs {MONTHS[prevMonth - 1]} {prevYear}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Dépenses', curr: totalExp, diff: diffExp, neg: true  },
                { label:'Revenus',  curr: totalInc, diff: diffInc, neg: false },
              ].map(({ label, curr, diff, neg }) => (
                <div key={label} style={{
                  background:'#f9f9f9', borderRadius:10, padding:'12px', border:'1px solid #f0f0f0',
                }}>
                  <div style={{ fontSize:11, color:'#aaa', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:'#222', marginBottom:4 }}>{fmt(curr)}</div>
                  <div style={{
                    fontSize:11, fontWeight:700,
                    color: diff === 0 ? '#aaa' : (neg ? diff > 0 : diff < 0) ? '#e74c3c' : '#00b894',
                  }}>
                    {diff > 0 ? '+' : ''}{fmt(diff)} ({diff > 0 ? '▲' : diff < 0 ? '▼' : '='})
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <ProCard
            feature="comparison" title="Comparaison mois précédent" icon={ArrowRight}
            onUpgrade={setProModal}
            preview={
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:12 }}>vs mois précédent</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {['Dépenses','Revenus'].map(l => (
                    <div key={l} style={{ background:'#f9f9f9', borderRadius:10, padding:12 }}>
                      <div style={{ fontSize:11, color:'#aaa', marginBottom:4 }}>{l}</div>
                      <div style={{ fontSize:15, fontWeight:800, color:'#222' }}>— Ar</div>
                      <div style={{ fontSize:11, color:'#aaa' }}>+0 Ar (=)</div>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        )}

        {/* Revenus */}
        <Card>
          <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:10 }}>Revenus totaux</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:22, fontWeight:800, color:'#00b894' }}>
              {isIncEstimated ? '~' : ''}{fmt(totalInc)}
            </span>
            {isIncEstimated && (
              <span style={{ fontSize:11, color:'#aaa', background:'#f5f5f5', borderRadius:8, padding:'3px 8px' }}>
                estimation incluse
              </span>
            )}
          </div>
          {totalInc > 0 && (
            <>
              <div style={{ display:'flex', height:8, borderRadius:99, overflow:'hidden', marginBottom:8 }}>
                <div style={{ width:`${pct(punctualInc, totalInc)}%`, background:'#00b894', transition:'width 0.4s' }}/>
                <div style={{ flex:1, background:'#6C5CE7' }}/>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {[
                  { label:'Ponctuel', val: punctualInc, color:'#00b894' },
                  { label:`Récurrent${isIncEstimated?' (estimé)':''}`, val: totalRecurInc, color:'#6C5CE7' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:color, display:'block', flexShrink:0 }}/>
                    <span style={{ color:'#555' }}>{label}</span>
                    <span style={{ fontWeight:700, color }}>{fmt(val)}</span>
                    <span style={{ color:'#aaa' }}>({pct(val, totalInc)}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {activeRecurInc.length > 0 && (
            <div style={{ marginTop:12, borderTop:'1px solid #f5f5f5', paddingTop:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <RefreshCw size={13} color="#6C5CE7" strokeWidth={1.8}/>
                <span style={{ fontSize:12, color:'#6C5CE7', fontWeight:600 }}>Revenus récurrents ce mois</span>
              </div>
              {activeRecurInc.map(r => (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid #f9f9f9' }}>
                  <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
                    background:(r.category?.color||'#00b894')+'22',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <RefreshCw size={13} color={r.category?.color||'#00b894'} strokeWidth={1.8}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:12, color:'#222' }}>{r.description||r.category?.name}</div>
                    <div style={{ fontSize:10, color:'#aaa' }}>
                      {r.frequency==='daily'&&'Quotidien'}{r.frequency==='weekly'&&'Hebdomadaire'}
                      {r.frequency==='monthly'&&`Le ${r.dayOfMonth} du mois`}
                      {r.dayType==='working'&&' · jours ouvrés'}
                    </div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:12, color:'#00b894', flexShrink:0 }}>+{fmt(r.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Dépenses */}
        <Card>
          <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:10 }}>Dépenses totales</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:22, fontWeight:800, color:'#e74c3c' }}>
              {isExpEstimated ? '~' : ''}{fmt(totalExp)}
            </span>
            {isExpEstimated && (
              <span style={{ fontSize:11, color:'#aaa', background:'#f5f5f5', borderRadius:8, padding:'3px 8px' }}>
                estimation incluse
              </span>
            )}
          </div>
          {totalExp > 0 && (
            <>
              <div style={{ display:'flex', height:8, borderRadius:99, overflow:'hidden', marginBottom:8 }}>
                <div style={{ width:`${pct(punctualExp, totalExp)}%`, background:'#e74c3c', transition:'width 0.4s' }}/>
                <div style={{ flex:1, background:'#6C5CE7' }}/>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {[
                  { label:'Ponctuel', val: punctualExp, color:'#e74c3c' },
                  { label:`Récurrent${isExpEstimated?' (estimé)':''}`, val: totalRecurExp, color:'#6C5CE7' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:color, display:'block', flexShrink:0 }}/>
                    <span style={{ color:'#555' }}>{label}</span>
                    <span style={{ fontWeight:700, color }}>{fmt(val)}</span>
                    <span style={{ color:'#aaa' }}>({pct(val, totalExp)}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {activeRecurExp.length > 0 && (
            <div style={{ marginTop:12, borderTop:'1px solid #f5f5f5', paddingTop:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <RefreshCw size={13} color="#6C5CE7" strokeWidth={1.8}/>
                <span style={{ fontSize:12, color:'#6C5CE7', fontWeight:600 }}>Dépenses récurrentes ce mois</span>
              </div>
              {activeRecurExp.map(r => (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid #f9f9f9' }}>
                  <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
                    background:(r.category?.color||'#e74c3c')+'22',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <RefreshCw size={13} color={r.category?.color||'#e74c3c'} strokeWidth={1.8}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:12, color:'#222' }}>{r.description||r.category?.name}</div>
                    <div style={{ fontSize:10, color:'#aaa' }}>
                      {r.frequency==='daily'&&'Quotidien'}{r.frequency==='weekly'&&'Hebdomadaire'}
                      {r.frequency==='monthly'&&`Le ${r.dayOfMonth} du mois`}
                      {r.dayType==='working'&&' · jours ouvrés'}
                    </div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:12, color:'#e74c3c', flexShrink:0 }}>-{fmt(r.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── PRO : Prévisions mois suivant ── */}
        {(() => {
          const nextMonth  = month === 12 ? 1 : month + 1
          const nextYear   = month === 12 ? year + 1 : year
          const forecastExp = totalRecurExp + (punctualExp * 0.9)
          const forecastInc = totalRecurInc + (punctualInc * 1.0)
          const forecastBal = forecastInc - forecastExp
          return isPro ? (
            <Card>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <TrendingUp size={15} color="#6C5CE7" strokeWidth={2}/>
                <div style={{ fontWeight:700, fontSize:15, color:'#222' }}>
                  Prévisions — {MONTHS[nextMonth - 1]} {nextYear}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { label:'Revenus est.',  val: forecastInc, color:'#00b894' },
                  { label:'Dépenses est.', val: forecastExp, color:'#e74c3c' },
                  { label:'Solde est.',    val: forecastBal, color: forecastBal >= 0 ? '#6C5CE7' : '#e74c3c' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background:'#f9f9f9', borderRadius:10, padding:'10px 12px', border:'1px solid #f0f0f0' }}>
                    <div style={{ fontSize:10, color:'#aaa', marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:800, color }}>{fmt(val)}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:'#bbb', marginTop:10 }}>
                * Estimé à partir des récurrences actives et de la tendance du mois en cours
              </div>
            </Card>
          ) : (
            <ProCard
              feature="forecast" title="Prévisions mois suivant" icon={TrendingUp}
              onUpgrade={setProModal}
              preview={
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:12 }}>Prévisions — mois suivant</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    {['Revenus','Dépenses','Solde'].map(l => (
                      <div key={l} style={{ background:'#f9f9f9', borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ fontSize:10, color:'#aaa', marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:13, fontWeight:800, color:'#aaa' }}>— Ar</div>
                      </div>
                    ))}
                  </div>
                </div>
              }
            />
          )
        })()}

        {/* Répartition par catégorie */}
        {byCat.length > 0 && (
          <Card>
            <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:12 }}>
              Répartition par catégorie
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <PieChart data={byCat}/>
              <div style={{ flex:1 }}>
                {byCat.map((c, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
                    <div style={{ width:10, height:10, borderRadius:99, background:c.color||'#ccc', flexShrink:0 }}/>
                    <div style={{ flex:1, fontSize:12, color:'#555', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {c.name||'Autre'}
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#222', flexShrink:0 }}>{fmt(c.total)}</div>
                    <div style={{ fontSize:11, color:'#aaa', flexShrink:0 }}>{pct(c.total, totalExp)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── PRO : Rapport annuel ── */}
        {isPro ? (
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Calendar size={15} color="#6C5CE7" strokeWidth={2}/>
                <div style={{ fontWeight:700, fontSize:15, color:'#222' }}>Bilan annuel {year}</div>
              </div>
            </div>
            {annualData?.months ? (
              <>
                <BarChart
                  data={annualData.months.map(m => ({
                    label: MONTHS[m.month - 1]?.slice(0, 3),
                    value: m.totalExpenses || 0,
                  }))}
                  color="#e74c3c"
                />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:12 }}>
                  {[
                    { label:'Total revenus',  val: annualData.totalIncomes,  color:'#00b894' },
                    { label:'Total dépenses', val: annualData.totalExpenses, color:'#e74c3c' },
                    { label:'Épargne nette',  val: (annualData.totalIncomes||0)-(annualData.totalExpenses||0), color:'#6C5CE7' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background:'#f9f9f9', borderRadius:10, padding:'10px 12px', border:'1px solid #f0f0f0' }}>
                      <div style={{ fontSize:10, color:'#aaa', marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:12, fontWeight:800, color }}>{fmt(val||0)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontSize:12, color:'#aaa', textAlign:'center', padding:'16px 0' }}>
                Données annuelles en chargement...
              </div>
            )}
            <Button onClick={exportAnnual}
              style={{ width:'100%', marginTop:12, background:'#6C5CE7', padding:'11px 0', fontSize:13 }}>
              <Download size={14}/> Exporter rapport annuel {year}
            </Button>
          </Card>
        ) : (
          <ProCard
            feature="annual" title="Rapport annuel complet" icon={Calendar}
            onUpgrade={setProModal}
            preview={
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:12 }}>Bilan annuel {year}</div>
                <BarChart
                  data={Array.from({ length:12 }, (_, i) => ({
                    label: MONTHS[i]?.slice(0,3),
                    value: Math.random() * 400000,
                  }))}
                  color="#e74c3c"
                />
              </div>
            }
          />
        )}

        {/* Export mensuel */}
        <Card>
          <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:12 }}>
            Exporter {MONTHS[month - 1]} {year}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Button onClick={exportPDF}
              style={{ flex:1, background:'#e74c3c', padding:'13px 0', fontSize:13 }}>
              <Download size={15}/> PDF
            </Button>
            <Button onClick={exportExcel}
              style={{ flex:1, background:'#00b894', padding:'13px 0', fontSize:13 }}>
              <Download size={15}/> Excel
            </Button>
          </div>
        </Card>

      </div>
    </div>
  )
}