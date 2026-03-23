import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Target, Plus, AlertTriangle, Bell, BellOff, RefreshCw,
  CheckCircle, TrendingDown, Trash2, Pencil, ChevronDown,
  ChevronUp, Lightbulb, TrendingUp, SlidersHorizontal, X,
} from 'lucide-react'
import Header      from '../components/layout/Header'
import Modal       from '../components/ui/Modal'
import Input       from '../components/ui/Input'
import { pct, MONTHS } from '../utils/format'
import { useApi }  from '../hooks/useApi'
import { budgetsApi } from '../services/api'
import api         from '../services/api'
import MonthPicker from '../components/ui/MonthPicker'
import { LucideIcon } from '../utils/iconResolver'
import { useFmt }  from '../hooks/useFmt'
import { useAuth } from '../contexts/AuthContext'

const now = new Date()

/* ─── Seuils ────────────────────────────────────────────────────── */
const THRESHOLDS = [
  { pct:100, level:'danger',  label:'Budget épuisé',         color:'#E24B4A', bg:'#FCEBEB' },
  { pct:90,  level:'warning', label:'Budget presque épuisé', color:'#BA7517', bg:'#FAEEDA' },
  { pct:75,  level:'alert',   label:'75% atteint',           color:'#534AB7', bg:'#EEEDFE' },
]
const getThreshold = (spent, amount) => {
  const p = pct(spent, Number(amount))
  return THRESHOLDS.find(t => p >= t.pct) || null
}

/* ─── Camembert SVG ─────────────────────────────────────────────── */
function PieChart({ data, total }) {
  if (!total) return null
  let angle = -Math.PI / 2
  const cx=70, cy=70, r=58
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      {data.map((d, i) => {
        const slice = (Number(d.amount) / total) * Math.PI * 2
        if (slice < 0.01) return null
        const x1=cx+r*Math.cos(angle), y1=cy+r*Math.sin(angle)
        angle += slice
        const x2=cx+r*Math.cos(angle), y2=cy+r*Math.sin(angle)
        return (
          <path key={i}
            d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${slice>Math.PI?1:0},1 ${x2},${y2} Z`}
            fill={d.color || '#ccc'} stroke="#fff" strokeWidth={2}/>
        )
      })}
      <circle cx={cx} cy={cy} r={32} fill="#fff"/>
    </svg>
  )
}

/* ─── Barre de progression ──────────────────────────────────────── */
function BudgetBar({ spent, amount, forecast, color }) {
  const p    = Math.min(100, pct(spent, Number(amount)))
  const fp   = forecast ? Math.min(100, pct(forecast, Number(amount))) : null
  const barC = p>=100 ? '#E24B4A' : p>=90 ? '#EF9F27' : color||'#6C5CE7'
  return (
    <div style={{ height:6, background:'#f0f0f0', borderRadius:3, overflow:'hidden', marginTop:6, position:'relative' }}>
      {/* Barre réelle */}
      <div style={{ height:'100%', borderRadius:3, width:`${p}%`, background:barC, transition:'width 0.5s', position:'absolute', top:0, left:0 }}/>
      {/* Barre prévision (transparente) */}
      {fp && fp > p && (
        <div style={{ height:'100%', borderRadius:3, width:`${fp}%`, background:barC+'44', position:'absolute', top:0, left:0 }}/>
      )}
    </div>
  )
}

/* ─── Carte budget compacte ─────────────────────────────────────── */
function BudgetCard({ b, onEdit, onRemove, onToggleNotif, fmt, dayOfMonth, daysInMonth }) {
  const [expanded, setExpanded] = useState(false)
  const p         = pct(b.spent, Number(b.amount))
  const threshold = getThreshold(b.spent, b.amount)
  const color     = b.category?.color || '#6C5CE7'
  const remaining = Math.max(0, Number(b.amount) - Number(b.spent))
  const over      = Number(b.spent) > Number(b.amount)
  const notifOn   = localStorage.getItem(`budget-notif-${b.id}`) !== 'false'

  // Prévision fin de mois
  const dailyRate = dayOfMonth > 0 ? Number(b.spent) / dayOfMonth : 0
  const forecast  = Math.round(dailyRate * daysInMonth)
  const forecastPct = pct(forecast, Number(b.amount))
  const willExceed  = forecast > Number(b.amount)

  return (
    <div style={{
      background:'#fff', borderRadius:14, marginBottom:10,
      border: threshold?.level==='danger'  ? '1px solid #F09595' :
              threshold?.level==='warning' ? '1px solid #FAC775' : '0.5px solid #eee',
    }}>
      {/* Ligne principale — toujours visible */}
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <LucideIcon name={b.category?.icon} size={17} color={color} strokeWidth={1.8}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:13, color:'#222' }}>
                {b.category?.name || 'Sans catégorie'}
              </span>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {threshold && (
                  <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20, background:threshold.bg, color:threshold.color }}>
                    {p}%
                  </span>
                )}
                {!threshold && (
                  <span style={{ fontSize:12, fontWeight:800, color:'#222' }}>{p}%</span>
                )}
                <button onClick={() => setExpanded(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', padding:0 }}>
                  {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                </button>
              </div>
            </div>
            <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>
              {fmt(b.spent)} / {fmt(b.amount)}
              {over && <span style={{ color:'#E24B4A', fontWeight:600, marginLeft:6 }}>+{fmt(Number(b.spent)-Number(b.amount))} dépassé</span>}
            </div>
            <BudgetBar spent={b.spent} amount={b.amount} forecast={forecast} color={color}/>
          </div>
        </div>

        {/* Détail expandé */}
        {expanded && (
          <div style={{ marginTop:12, paddingTop:10, borderTop:'0.5px solid #f5f5f5' }}>

            {/* Prévision fin de mois */}
            <div style={{
              background: willExceed ? '#FCEBEB' : '#f7f7f7',
              borderRadius:10, padding:'9px 12px', marginBottom:10,
              display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <TrendingUp size={13} color={willExceed ? '#E24B4A' : '#6C5CE7'}/>
                <span style={{ fontSize:11, fontWeight:600, color:'#555' }}>Prévision fin de mois</span>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:13, fontWeight:800, color: willExceed ? '#E24B4A' : '#222' }}>
                  {fmt(forecast)}
                </div>
                <div style={{ fontSize:10, color:'#aaa' }}>
                  {willExceed ? `+${fmt(forecast-Number(b.amount))} dépassement prévu` : `${fmt(Number(b.amount)-forecast)} de marge`}
                </div>
              </div>
            </div>

            {/* Restant + actions */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color: over?'#E24B4A':'#0F6E56', fontWeight:600 }}>
                {over ? `Dépassé de ${fmt(Number(b.spent)-Number(b.amount))}` : `${fmt(remaining)} restant`}
              </span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => onToggleNotif(b)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', borderRadius:8, border:'none', cursor:'pointer', background:notifOn?'#EEEDFE':'#f5f5f5', fontSize:11, fontWeight:600, color:notifOn?'#534AB7':'#aaa' }}>
                  {notifOn ? <Bell size={12}/> : <BellOff size={12}/>}
                  {notifOn ? 'Alertes' : 'Muet'}
                </button>
                <button onClick={() => onEdit(b)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', borderRadius:8, border:'none', cursor:'pointer', background:'#f5f5f5', fontSize:11, fontWeight:600, color:'#555' }}>
                  <Pencil size={12}/>
                </button>
                <button onClick={() => onRemove(b.id)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', borderRadius:8, border:'none', cursor:'pointer', background:'#FCEBEB', fontSize:11, fontWeight:600, color:'#E24B4A' }}>
                  <Trash2 size={12}/>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bandeau alerte en bas si danger/warning */}
      {threshold && !expanded && (
        <div style={{ padding:'6px 14px', background:threshold.bg, display:'flex', alignItems:'center', gap:5, borderRadius: '0 0 14px 14px', }}>
          <AlertTriangle size={11} color={threshold.color}/>
          <span style={{ fontSize:11, fontWeight:600, color:threshold.color }}>
            {threshold.label}
            {p>=100 && ` — ${fmt(Number(b.spent)-Number(b.amount))} au-dessus`}
          </span>
          {willExceed && p < 100 && (
            <span style={{ fontSize:10, color:threshold.color, marginLeft:4 }}>
              · prévision : {fmt(forecast)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Page principale ───────────────────────────────────────────── */
export default function Budgets() {
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [year]                  = useState(now.getFullYear())
  const [modal,    setModal]    = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form,     setForm]     = useState({ categoryId:'', amount:'' })
  const [saving,   setSaving]   = useState(false)
  const [syncing,  setSyncing]  = useState(false)
  const [syncMsg,  setSyncMsg]  = useState(null)
  const [notifs,   setNotifs]   = useState([])
  const [view,     setView]     = useState('list')    // 'list' | 'summary'
  const [sortBy,   setSortBy]   = useState('pct')     // 'pct' | 'amount' | 'name'
  const [filterAlert, setFilterAlert] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { fmt }  = useFmt()
  const { user } = useAuth()
  const currency = user?.currency || 'MGA'

  const { data: budgets, refetch }     = useApi('/budgets', { month, year })
  const { data: cats }                 = useApi('/categories')
  // Dépenses des 3 derniers mois pour suggestions
  const prevMonth = month===1 ? 12 : month-1
  const prevYear  = month===1 ? year-1 : year
  const { data: prevExp } = useApi('/reports/summary', { month: prevMonth, year: prevYear })

  const list    = budgets || []
  const expCats = (cats || []).filter(c => c.type === 'expense')

  // Calcul jours du mois
  const daysInMonth = new Date(year, month, 0).getDate()
  const dayOfMonth  = month === now.getMonth()+1 && year === now.getFullYear()
    ? now.getDate() : daysInMonth

  // Totaux
  const totalBudget  = list.reduce((s,b) => s + Number(b.amount), 0)
  const totalSpent   = list.reduce((s,b) => s + Number(b.spent),  0)
  const globalPct    = pct(totalSpent, totalBudget)
  const alertCount   = list.filter(b => pct(b.spent,b.amount) >= 75).length

  // Prévision globale
  const globalForecast = list.reduce((s,b) => {
    const rate = dayOfMonth > 0 ? Number(b.spent)/dayOfMonth : 0
    return s + Math.round(rate * daysInMonth)
  }, 0)

  // Tri + filtre
  const sortedList = useMemo(() => {
    let l = [...list]
    if (filterAlert) l = l.filter(b => pct(b.spent,b.amount) >= 75)
    if (sortBy==='pct')    l.sort((a,b) => pct(b.spent,b.amount) - pct(a.spent,a.amount))
    if (sortBy==='amount') l.sort((a,b) => Number(b.amount) - Number(a.amount))
    if (sortBy==='name')   l.sort((a,b) => (a.category?.name||'').localeCompare(b.category?.name||''))
    return l
  }, [list, sortBy, filterAlert])

  // Suggestions basées sur les dépenses du mois précédent
  const suggestions = useMemo(() => {
    if (!prevExp?.byCategory) return []
    return prevExp.byCategory
      .filter(c => !list.find(b => b.categoryId === c.id))
      .map(c => ({ ...c, suggested: Math.round(Number(c.total) * 1.1) }))
      .slice(0, 4)
  }, [prevExp, list])

  // Notifications
  useEffect(() => {
    if (!list.length) return
    const newNotifs = []
    list.forEach(b => {
      if (localStorage.getItem(`budget-notif-${b.id}`) === 'false') return
      const threshold = getThreshold(b.spent, b.amount)
      if (!threshold) return
      const key = `budget-notif-${b.id}-${threshold.level}-${month}-${year}`
      if (sessionStorage.getItem(key)) return
      newNotifs.push({ id:key, budget:b, threshold })
      sessionStorage.setItem(key, '1')
    })
    if (newNotifs.length) setNotifs(prev => [...prev, ...newNotifs])
  }, [budgets])

  useEffect(() => { refetch() }, [month, year])

  const sync = useCallback(async () => {
    setSyncing(true); setSyncMsg(null)
    try {
      await refetch()
      setSyncMsg({ ok:true, text:'Budgets synchronisés' })
    } catch { setSyncMsg({ ok:false, text:'Erreur de synchronisation' }) }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(null), 3000) }
  }, [refetch])

  const openCreate = () => { setEditItem(null); setForm({ categoryId:'', amount:'' }); setModal(true) }
  const openEdit   = (b) => { setEditItem(b); setForm({ categoryId:String(b.categoryId||''), amount:String(b.amount) }); setModal(true) }

  const save = async () => {
    if (!form.categoryId || !form.amount) return
    setSaving(true)
    try {
      editItem
        ? await api.put(`/budgets/${editItem.id}`, { amount:parseFloat(form.amount) })
        : await budgetsApi.create({ categoryId:Number(form.categoryId), amount:parseFloat(form.amount), month, year })
      setModal(false); refetch()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const remove       = async (id) => { if (!confirm('Supprimer ce budget ?')) return; await budgetsApi.remove(id); refetch() }
  const toggleNotif  = (b) => { const key=`budget-notif-${b.id}`; localStorage.setItem(key, localStorage.getItem(key)!=='false' ? 'false' : 'true'); refetch() }
  const applysuggestion = async (c) => {
    await budgetsApi.create({ categoryId:c.id, amount:c.suggested, month, year })
    refetch()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={{ paddingBottom:90 }}>
      <Header title="Budget"/>
      <div style={{ padding:'12px 16px' }}>

        <MonthPicker month={month} setMonth={setMonth} months={MONTHS}/>

        {/* Notifications locales */}
        {notifs.slice(0,3).map(n => (
          <div key={n.id} style={{ display:'flex', alignItems:'flex-start', gap:10, background:n.threshold.bg, borderRadius:12, padding:'10px 14px', marginBottom:8, border:`1px solid ${n.threshold.color}40` }}>
            <AlertTriangle size={15} color={n.threshold.color} style={{ flexShrink:0, marginTop:1 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:n.threshold.color }}>{n.threshold.label}</div>
              <div style={{ fontSize:11, color:'#666', marginTop:1 }}>
                {n.budget.category?.name} — {pct(n.budget.spent,n.budget.amount)}% ({fmt(n.budget.spent)} / {fmt(n.budget.amount)})
              </div>
            </div>
            <button onClick={() => setNotifs(p => p.filter(x => x.id!==n.id))} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa', padding:0 }}>
              <X size={14}/>
            </button>
          </div>
        ))}

        {/* Carte résumé global */}
        {list.length > 0 && (
          <div style={{ background:'#6C5CE7', borderRadius:16, padding:16, marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, color:'#AFA9EC', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>
                  Budget global · {MONTHS[month-1]}
                </div>
                <div style={{ fontSize:26, fontWeight:800, color:'#fff' }}>
                  {fmt(totalSpent)}
                  <span style={{ fontSize:14, fontWeight:400, color:'#AFA9EC', marginLeft:6 }}>/ {fmt(totalBudget)}</span>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:22, fontWeight:800, color: globalPct>=90 ? '#FAC775' : '#fff' }}>{globalPct}%</div>
                <div style={{ fontSize:11, color:'#AFA9EC' }}>{fmt(Math.max(0,totalBudget-totalSpent))} restant</div>
              </div>
            </div>
            <div style={{ height:6, background:'rgba(255,255,255,0.2)', borderRadius:3, overflow:'hidden', position:'relative' }}>
              <div style={{ height:'100%', borderRadius:3, position:'absolute', width:`${Math.min(100,pct(globalForecast,totalBudget))}%`, background:'rgba(255,255,255,0.25)' }}/>
              <div style={{ height:'100%', borderRadius:3, position:'absolute', width:`${Math.min(100,globalPct)}%`, background: globalPct>=90?'#FAC775':'#fff', transition:'width 0.5s' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
              <span style={{ fontSize:11, color:'#AFA9EC' }}>
                {list.length} catégorie{list.length>1?'s':''}
                {alertCount>0 && <span style={{ color:'#FAC775', marginLeft:8 }}>· {alertCount} en alerte</span>}
              </span>
              <span style={{ fontSize:11, color:'#AFA9EC' }}>
                Prévision : <span style={{ color: globalForecast>totalBudget?'#FAC775':'#EEEDFE', fontWeight:700 }}>{fmt(globalForecast)}</span>
              </span>
            </div>
          </div>
        )}

        {/* Tabs vue + outils */}
        <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
          {/* Switcher liste / résumé */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', background:'#f5f5f5', borderRadius:10, padding:3, flex:1 }}>
            {[{id:'list',label:'Liste'},{id:'summary',label:'Résumé'}].map(({id,label}) => (
              <button key={id} onClick={() => setView(id)} style={{ padding:'7px 0', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:view===id?700:500, background:view===id?'#fff':'transparent', color:view===id?'#6C5CE7':'#999', boxShadow:view===id?'0 1px 3px rgba(0,0,0,0.08)':'none', transition:'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Tri */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding:'7px 10px', borderRadius:10, border:'0.5px solid #eee', fontSize:12, color:'#555', background:'#fff', cursor:'pointer', outline:'none' }}>
            <option value="pct">% utilisé</option>
            <option value="amount">Montant</option>
            <option value="name">Nom</option>
          </select>

          {/* Filtre alertes */}
          <button onClick={() => setFilterAlert(v=>!v)} style={{ width:36, height:36, borderRadius:10, border:'0.5px solid #eee', background:filterAlert?'#E24B4A':'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <AlertTriangle size={14} color={filterAlert?'#fff':'#aaa'}/>
          </button>
        </div>

        {/* Sync + message */}
        <button onClick={sync} disabled={syncing} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:10, borderRadius:12, marginBottom:12, background:'#f7f6fd', border:'1.5px solid #EEEDFE', color:'#6C5CE7', fontWeight:700, fontSize:12, cursor:syncing?'not-allowed':'pointer', opacity:syncing?0.7:1 }}>
          <RefreshCw size={13} strokeWidth={2} style={{ animation:syncing?'spin 0.8s linear infinite':'none' }}/>
          {syncing ? 'Synchronisation...' : 'Synchroniser avec les dépenses'}
        </button>

        {syncMsg && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:syncMsg.ok?'#E1F5EE':'#FCEBEB', borderRadius:10, padding:'9px 12px', marginBottom:10 }}>
            <CheckCircle size={13} color={syncMsg.ok?'#0F6E56':'#E24B4A'}/>
            <span style={{ fontSize:12, fontWeight:600, color:syncMsg.ok?'#0F6E56':'#E24B4A' }}>{syncMsg.text}</span>
          </div>
        )}

        {/* ══ VUE LISTE ══ */}
        {view === 'list' && (
          <>
            {sortedList.length === 0 ? (
              <div style={{ textAlign:'center', color:'#ccc', padding:'40px 0' }}>
                <Target size={36} color="#e0e0e0" style={{ margin:'0 auto 10px', display:'block' }}/>
                <div style={{ fontSize:14, marginBottom:6 }}>
                  {filterAlert ? 'Aucun budget en alerte' : 'Aucun budget ce mois'}
                </div>
                <div style={{ fontSize:12 }}>Appuyez sur + pour en créer un</div>
              </div>
            ) : sortedList.map(b => (
              <BudgetCard key={b.id} b={b}
                onEdit={openEdit} onRemove={remove} onToggleNotif={toggleNotif}
                fmt={fmt} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth}/>
            ))}
          </>
        )}

        {/* ══ VUE RÉSUMÉ ══ */}
        {view === 'summary' && list.length > 0 && (
          <>
            {/* Camembert */}
            <div style={{ background:'#fff', borderRadius:14, border:'0.5px solid #eee', padding:'16px 14px', marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>Répartition du budget</div>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <PieChart data={list.map(b => ({ amount:b.amount, color:b.category?.color||'#ccc' }))} total={totalBudget}/>
                <div style={{ flex:1 }}>
                  {list.slice(0,6).map((b,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:b.category?.color||'#ccc', flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:'#555', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.category?.name||'Autre'}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:'#222' }}>{fmt(b.amount)}</span>
                      <span style={{ fontSize:10, color:'#aaa' }}>{pct(b.amount,totalBudget)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tableau récap */}
            <div style={{ background:'#fff', borderRadius:14, border:'0.5px solid #eee', overflow:'hidden', marginBottom:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 60px', padding:'9px 14px', background:'#fafafa', borderBottom:'0.5px solid #f0f0f0' }}>
                {['Catégorie','Dépensé','Prévu','%'].map(h => (
                  <span key={h} style={{ fontSize:10, fontWeight:700, color:'#bbb', textAlign: h==='Catégorie'?'left':'right' }}>{h}</span>
                ))}
              </div>
              {sortedList.map((b,i) => {
                const p2 = pct(b.spent, b.amount)
                const rate = dayOfMonth > 0 ? Number(b.spent)/dayOfMonth : 0
                const fc   = Math.round(rate * daysInMonth)
                return (
                  <div key={b.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 60px', padding:'10px 14px', borderBottom: i<sortedList.length-1 ? '0.5px solid #f9f9f9' : 'none', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:6, height:6, borderRadius:2, background:b.category?.color||'#ccc', flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:'#444', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.category?.name||'Autre'}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color: p2>=100?'#E24B4A':p2>=90?'#BA7517':'#222', textAlign:'right' }}>{fmt(b.spent)}</span>
                    <span style={{ fontSize:12, color: fc>Number(b.amount)?'#E24B4A':'#888', textAlign:'right' }}>{fmt(fc)}</span>
                    <span style={{ fontSize:12, fontWeight:700, color: p2>=100?'#E24B4A':p2>=90?'#BA7517':'#6C5CE7', textAlign:'right' }}>{p2}%</span>
                  </div>
                )
              })}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 60px', padding:'10px 14px', background:'#fafafa', borderTop:'1px solid #f0f0f0' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#222' }}>Total</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#222', textAlign:'right' }}>{fmt(totalSpent)}</span>
                <span style={{ fontSize:12, fontWeight:700, color: globalForecast>totalBudget?'#E24B4A':'#888', textAlign:'right' }}>{fmt(globalForecast)}</span>
                <span style={{ fontSize:12, fontWeight:700, color: globalPct>=100?'#E24B4A':globalPct>=90?'#BA7517':'#6C5CE7', textAlign:'right' }}>{globalPct}%</span>
              </div>
            </div>
          </>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div style={{ background:'#fff', borderRadius:14, border:'0.5px solid #eee', overflow:'hidden', marginTop:4 }}>
            <button onClick={() => setShowSuggestions(v=>!v)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'none', border:'none', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Lightbulb size={14} color="#BA7517"/>
                <span style={{ fontSize:13, fontWeight:700, color:'#222' }}>Suggestions de budget</span>
                <span style={{ fontSize:10, fontWeight:700, background:'#FAEEDA', color:'#BA7517', borderRadius:20, padding:'1px 7px' }}>{suggestions.length}</span>
              </div>
              {showSuggestions ? <ChevronUp size={15} color="#aaa"/> : <ChevronDown size={15} color="#aaa"/>}
            </button>
            {showSuggestions && (
              <div style={{ borderTop:'0.5px solid #f5f5f5' }}>
                <div style={{ fontSize:11, color:'#aaa', padding:'8px 14px 4px' }}>
                  Basé sur vos dépenses de {MONTHS[prevMonth-1]} (+10%)
                </div>
                {suggestions.map((c, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom: i<suggestions.length-1 ? '0.5px solid #f9f9f9' : 'none' }}>
                    <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:(c.color||'#6C5CE7')+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <LucideIcon name={c.icon} size={14} color={c.color||'#6C5CE7'} strokeWidth={1.8}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#222' }}>{c.name||'Catégorie'}</div>
                      <div style={{ fontSize:11, color:'#aaa' }}>Suggéré : {fmt(c.suggested)}</div>
                    </div>
                    <button onClick={() => applysuggestion(c)} style={{ padding:'5px 12px', borderRadius:8, border:'none', cursor:'pointer', background:'#6C5CE7', color:'#fff', fontSize:11, fontWeight:700 }}>
                      Appliquer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={openCreate} style={{ position:'fixed', bottom:84, right:20, width:52, height:52, borderRadius:26, background:'#6C5CE7', border:'none', color:'#fff', cursor:'pointer', boxShadow:'0 4px 14px rgba(108,92,231,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:15 }}>
        <Plus size={24} strokeWidth={2.5}/>
      </button>

      {/* Modal */}
      {modal && (
        <Modal title={editItem ? 'Modifier le budget' : 'Nouveau budget'} onClose={() => setModal(false)}>
          <div style={{ overflowY:'auto', maxHeight:'60vh', paddingRight:4 }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:8 }}>Catégorie de dépense</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {expCats.map(c => {
                  const active = String(form.categoryId)===String(c.id)
                  const color  = c.color || '#6C5CE7'
                  return (
                    <button key={c.id} type="button" onClick={() => setForm(p => ({ ...p, categoryId:String(c.id) }))}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 4px', borderRadius:12, cursor:'pointer', border:`1.5px solid ${active?color:'#eee'}`, background:active?color+'15':'#fafafa' }}>
                      <LucideIcon name={c.icon} size={18} color={active?color:'#bbb'} strokeWidth={1.8}/>
                      <span style={{ fontSize:11, fontWeight:600, color:active?color:'#888' }}>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <Input label={`Montant du budget (${currency})`} type="number" placeholder={fmt(100000)} value={form.amount} onChange={set('amount')}/>
            <div style={{ background:'#f7f6fd', borderRadius:10, padding:'9px 12px', fontSize:12, color:'#534AB7' }}>
              Alertes automatiques à 75%, 90% et 100% du budget.
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:12, paddingTop:12, borderTop:'0.5px solid #f0f0f0' }}>
            <button onClick={() => setModal(false)} style={{ flex:1, padding:12, borderRadius:12, cursor:'pointer', background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888' }}>Annuler</button>
            <button onClick={save} disabled={saving} style={{ flex:2, padding:12, borderRadius:12, background:saving?'#a09bda':'#6C5CE7', border:'none', fontWeight:700, fontSize:14, color:'#fff', cursor:saving?'not-allowed':'pointer' }}>
              {saving ? 'Enregistrement...' : editItem ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}