import { useState, useMemo } from 'react'
import {
  Plus, Trash2, TrendingUp, RefreshCw, ToggleLeft, ToggleRight,
  Calendar, Clock, ChevronDown, ChevronUp, Pencil, X, CheckCircle,
  Search, SlidersHorizontal,
} from 'lucide-react'
import Header      from '../components/layout/Header'
import Modal       from '../components/ui/Modal'
import Input       from '../components/ui/Input'
import MonthPicker from '../components/ui/MonthPicker'
import { MONTHS }  from '../utils/format'
import { useApi }  from '../hooks/useApi'
import { incomesApi } from '../services/api'
import api         from '../services/api'
import { LucideIcon }  from '../utils/iconResolver'
import { useFmt }  from '../hooks/useFmt'
import { useAuth } from '../contexts/AuthContext'

/* ─── Constantes ────────────────────────────────────────────────── */
const now = new Date()
const FREQ_LABEL    = { daily:'Quotidien', weekly:'Hebdomadaire', monthly:'Mensuel' }
const DTYPE_LABEL   = { all:'Tous les jours', working:'Jours ouvrés', holiday:'Jours fériés' }
const DTYPE_COLOR   = { all:'#6C5CE7', working:'#00b894', holiday:'#E24B4A' }
const DOW_LABEL     = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
const FREQ_OPTIONS  = ['daily','weekly','monthly']
const DTYPE_OPTIONS = ['all','working','holiday']

const EMPTY_REC = {
  categoryId:'', amount:'', description:'', frequency:'monthly',
  dayOfMonth:'', dayOfWeek:'', dayType:'all',
  startDate: now.toISOString().split('T')[0], endDate:'',
}

const S = {
  card: { background:'#fff', borderRadius:16, border:'0.5px solid #eee', overflow:'hidden', marginBottom:12 },
}

/* ─── Carte revenu ponctuel ─────────────────────────────────────── */
function PunctualCard({ i, onRemove, onEdit, fmt }) {
  const color = i.category?.color || '#00b894'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderBottom:'0.5px solid #f9f9f9' }}>
      <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <LucideIcon name={i.category?.icon} size={18} color={color} strokeWidth={1.8}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontWeight:600, fontSize:13, color:'#222', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {i.description || i.category?.name || '—'}
          </span>
          {i.isRecurring && (
            <span style={{ fontSize:10, background:'#EEEDFE', color:'#6C5CE7', borderRadius:20, padding:'1px 7px', fontWeight:600, flexShrink:0 }}>auto</span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
          {i.category?.name && (
            <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:20, background:color+'18', color }}>
              {i.category.name}
            </span>
          )}
          <span style={{ fontSize:11, color:'#aaa' }}>
            {new Date(i.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
          </span>
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontWeight:700, fontSize:13, color:'#00b894', marginBottom:4 }}>+{fmt(i.amount)}</div>
        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
          <button onClick={() => onEdit(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb', padding:0 }}>
            <Pencil size={13}/>
          </button>
          <button onClick={() => onRemove(i.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#e0e0e0', padding:0 }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Carte revenu récurrent ────────────────────────────────────── */
function RecurringCard({ r, onToggle, onEdit, onRemove, fmt }) {
  const [expanded, setExpanded] = useState(false)
  const color = r.category?.color || '#00b894'
  return (
    <div style={{ background:'#fff', borderRadius:14, marginBottom:10, border:'0.5px solid #eee', opacity:r.isActive?1:0.55 }}>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <LucideIcon name={r.category?.icon} size={18} color={color} strokeWidth={1.8}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <span style={{ fontWeight:700, fontSize:14, color:'#222' }}>
                {r.description || r.category?.name || 'Sans nom'}
              </span>
              <span style={{ fontWeight:800, fontSize:15, color:'#00b894', flexShrink:0, marginLeft:8 }}>
                +{fmt(r.amount)}
              </span>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:5 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56' }}>
                {FREQ_LABEL[r.frequency]}
              </span>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:DTYPE_COLOR[r.dayType]+'18', color:DTYPE_COLOR[r.dayType] }}>
                {DTYPE_LABEL[r.dayType]}
              </span>
              {r.frequency==='monthly' && r.dayOfMonth && (
                <span style={{ fontSize:10, color:'#aaa', padding:'2px 6px' }}>le {r.dayOfMonth}</span>
              )}
              {r.frequency==='weekly' && r.dayOfWeek!=null && (
                <span style={{ fontSize:10, color:'#aaa', padding:'2px 6px' }}>chaque {DOW_LABEL[r.dayOfWeek]}</span>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop:12, paddingTop:10, borderTop:'0.5px solid #f5f5f5', display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'#aaa', display:'flex', alignItems:'center', gap:4 }}>
                <Calendar size={11}/>
                Début : {new Date(r.startDate).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
              </span>
              {r.endDate && (
                <span style={{ fontSize:11, color:'#aaa', display:'flex', alignItems:'center', gap:4 }}>
                  <Calendar size={11}/>
                  Fin : {new Date(r.endDate).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                </span>
              )}
              {r.lastRunAt && (
                <span style={{ fontSize:11, color:'#aaa', display:'flex', alignItems:'center', gap:4 }}>
                  <Clock size={11}/>
                  Dernier : {new Date(r.lastRunAt).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, paddingTop:10, borderTop:'0.5px solid #f5f5f5' }}>
          <button onClick={() => setExpanded(v => !v)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#aaa', padding:0 }}>
            {expanded ? <><ChevronUp size={13}/> Moins</> : <><ChevronDown size={13}/> Détails</>}
          </button>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => onToggle(r.id)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', background:r.isActive?'#E1F5EE':'#f5f5f5', fontSize:11, fontWeight:600, color:r.isActive?'#0F6E56':'#aaa' }}>
              {r.isActive ? <><ToggleRight size={14}/> Actif</> : <><ToggleLeft size={14}/> Inactif</>}
            </button>
            <button onClick={() => onEdit(r)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', background:'#f5f5f5', fontSize:11, fontWeight:600, color:'#555' }}>
              <Pencil size={13}/> Modifier
            </button>
            <button onClick={() => onRemove(r.id)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', background:'#FCEBEB', fontSize:11, fontWeight:600, color:'#E24B4A' }}>
              <Trash2 size={13}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page principale ───────────────────────────────────────────── */
export default function Incomes() {
  const { fmt }  = useFmt()
  const { user } = useAuth()
  const currency = user?.currency || 'MGA'

  const [tab,      setTab]      = useState('punctual')
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [year]                  = useState(now.getFullYear())
  const [modal,    setModal]    = useState(null)   // 'punctual' | 'recurring' | null
  const [editItem, setEditItem] = useState(null)
  const [recModal, setRecModal] = useState(null)
  const [form,     setForm]     = useState({ categoryId:'', amount:'', description:'', date:now.toISOString().split('T')[0] })
  const [recForm,  setRecForm]  = useState(EMPTY_REC)
  const [saving,   setSaving]   = useState(false)
  const [genMsg,   setGenMsg]   = useState(null)
  const [fabOpen,  setFabOpen]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const { data: incData,  refetch: refetchInc } = useApi('/incomes', { month, year, take:100 })
  const { data: recList,  refetch: refetchRec } = useApi('/recurring-income')
  const { data: cats }                          = useApi('/categories')

  const incomes   = incData?.data || []
  const recurItems = recList || []
  const incCats   = (cats || []).filter(c => c.type === 'income')

  // Stats
  const punctualAmt  = incomes.filter(i => !i.isRecurring).reduce((s,i) => s + Number(i.amount), 0)
  const generatedAmt = incomes.filter(i =>  i.isRecurring).reduce((s,i) => s + Number(i.amount), 0)

  const mStart = new Date(year, month-1, 1)
  const mEnd   = new Date(year, month, 0)
  const activeRec   = recurItems.filter(r => {
    if (!r.isActive) return false
    const start = new Date(r.startDate)
    const end   = r.endDate ? new Date(r.endDate) : null
    return start <= mEnd && (!end || end >= mStart)
  })
  const inactiveRec = recurItems.filter(r => !r.isActive)

  const daysInMonth = new Date(year, month, 0).getDate()
  const workingDays = Math.round(daysInMonth * 5 / 7)
  const estimatedAmt = activeRec.reduce((s, r) => {
    const amt     = Number(r.amount)
    const rEnd    = r.endDate ? new Date(r.endDate) : null
    // Date effective de fin dans ce mois = min(fin du mois, endDate)
    const effEnd  = rEnd && rEnd < mEnd ? rEnd : mEnd
    const effDays = Math.max(0, Math.round((effEnd - mStart) / 86400000) + 1)
    // Jours ouvrés effectifs (approx)
    const effWorking = Math.round(effDays * 5 / 7)

    if (r.frequency === 'monthly') {
      // Si endDate avant le jour de prélèvement → pas de génération ce mois
      const dueDay = r.dayOfMonth || 1
      if (rEnd && rEnd < new Date(year, month - 1, dueDay)) return s
      return s + amt
    }
    if (r.frequency === 'weekly') {
      const weeks = effDays / 7
      return s + amt * weeks
    }
    if (r.frequency === 'daily') {
      return s + amt * (r.dayType === 'working' ? effWorking : effDays)
    }
    return s
  }, 0)

  const recurringAmt = generatedAmt > 0 ? generatedAmt : estimatedAmt
  const totalInc     = punctualAmt + recurringAmt
  const isEstimated  = generatedAmt === 0 && estimatedAmt > 0

  // Filtre ponctuel
  const filteredPunctual = useMemo(() => incomes.filter(i => {
    const matchSearch = !search || (i.description||i.category?.name||'').toLowerCase().includes(search.toLowerCase())
    const matchCat    = !filterCat || String(i.categoryId) === filterCat
    return matchSearch && matchCat
  }), [incomes, search, filterCat])

  const set    = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setRec = k => e => setRecForm(p => ({ ...p, [k]: e.target.value }))

  /* ── Handlers ponctuel ── */
  const openCreatePunctual = () => {
    setEditItem(null)
    setForm({ categoryId:'', amount:'', description:'', date:now.toISOString().split('T')[0] })
    setModal('punctual'); setFabOpen(false)
  }
  const openEditPunctual = (i) => {
    setEditItem(i)
    setForm({ categoryId:String(i.categoryId||''), amount:String(i.amount), description:i.description||'', date:i.date?.split('T')[0]||now.toISOString().split('T')[0] })
    setModal('punctual')
  }
  const savePunctual = async () => {
    if (!form.amount || !form.date) return
    setSaving(true)
    try {
      if (editItem) {
        await api.put(`/incomes/${editItem.id}`, { ...form, amount:parseFloat(form.amount), categoryId:Number(form.categoryId)||null })
      } else {
        await incomesApi.create({ ...form, amount:parseFloat(form.amount), categoryId:Number(form.categoryId)||null })
      }
      setModal(null); refetchInc()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }
  const removeIncome = async (id) => {
    if (!confirm('Supprimer ce revenu ?')) return
    await incomesApi.remove(id); refetchInc()
  }

  /* ── Handlers récurrent ── */
  const openCreateRecurring = () => {
    setRecModal('create'); setRecForm(EMPTY_REC); setFabOpen(false)
  }
  const openEditRecurring = (r) => {
    setRecModal(r)
    setRecForm({ categoryId:r.categoryId||'', amount:r.amount||'', description:r.description||'', frequency:r.frequency, dayOfMonth:r.dayOfMonth||'', dayOfWeek:r.dayOfWeek??'', dayType:r.dayType, startDate:r.startDate?.split('T')[0]||'', endDate:r.endDate?.split('T')[0]||'' })
  }
  const saveRecurring = async () => {
    if (!recForm.amount || !recForm.startDate) return
    setSaving(true)
    try {
      const payload = { ...recForm, amount:parseFloat(recForm.amount), categoryId:Number(recForm.categoryId)||null, dayOfMonth:recForm.dayOfMonth!==''?Number(recForm.dayOfMonth):null, dayOfWeek:recForm.dayOfWeek!==''?Number(recForm.dayOfWeek):null, endDate:recForm.endDate||null }
      recModal?.id
        ? await api.put(`/recurring-income/${recModal.id}`, payload)
        : await api.post('/recurring-income', payload)
      setRecModal(null); refetchRec()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }
  const toggleRec = async (id) => { await api.patch(`/recurring-income/${id}/toggle`); refetchRec() }
  const removeRec = async (id) => { if (!confirm('Supprimer cette récurrence ?')) return; await api.delete(`/recurring-income/${id}`); refetchRec() }

  const generate = async () => {
    try {
      const { data } = await api.post('/recurring-income/generate')
      setGenMsg(data); refetchInc(); refetchRec()
      setTimeout(() => setGenMsg(null), 5000)
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
  }

  const DaySelector = () => {
    if (recForm.frequency==='monthly') return (
      <Input label="Jour du mois (1-31)" type="number" min={1} max={31} placeholder="ex: 25 → le 25 de chaque mois" value={recForm.dayOfMonth} onChange={setRec('dayOfMonth')}/>
    )
    if (recForm.frequency==='weekly') return (
      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12, color:'#555', fontWeight:700, marginBottom:6, display:'block' }}>Jour de la semaine</label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {DOW_LABEL.map((d,i) => (
            <button key={i} type="button" onClick={() => setRecForm(p => ({ ...p, dayOfWeek:String(i) }))}
              style={{ padding:'6px 12px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:12, background:String(recForm.dayOfWeek)===String(i)?'#00b894':'#f0f0f0', color:String(recForm.dayOfWeek)===String(i)?'#fff':'#555' }}>
              {d}
            </button>
          ))}
        </div>
      </div>
    )
    return null
  }

  return (
    <div style={{ paddingBottom:90 }}>
      <Header title="Revenus"/>
      <div style={{ padding:'12px 16px' }}>

        <MonthPicker month={month} setMonth={setMonth} months={MONTHS}/>

        {/* ── Carte résumé ── */}
        <div style={{ background:'#00b894', borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:11, color:'#9FE1CB', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>
                Total {MONTHS[month-1]}
                {isEstimated && (
                  <span style={{ marginLeft:8, background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:9, padding:'2px 7px', borderRadius:20, fontWeight:700 }}>estimation</span>
                )}
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:'#fff' }}>
                {isEstimated ? '~' : ''}{fmt(totalInc)}
              </div>
            </div>
            <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <TrendingUp size={22} color="#fff" strokeWidth={1.8}/>
            </div>
          </div>

          {/* Barre + détail */}
          {totalInc > 0 && (
            <>
              <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', overflow:'hidden', display:'flex', marginBottom:8 }}>
                <div style={{ width:`${Math.round((punctualAmt/totalInc)*100)}%`, background:'#fff', transition:'width 0.4s' }}/>
                <div style={{ width:`${Math.round((recurringAmt/totalInc)*100)}%`, background:'rgba(255,255,255,0.5)', transition:'width 0.4s' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'#fff' }}/>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.75)', fontWeight:600 }}>Ponctuel</span>
                  </div>
                  <div style={{ fontWeight:800, fontSize:15, color:'#fff' }}>{fmt(punctualAmt)}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', marginTop:2 }}>
                    {incomes.filter(i => !i.isRecurring).length} transaction{incomes.filter(i=>!i.isRecurring).length>1?'s':''}
                  </div>
                </div>
                <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'rgba(255,255,255,0.5)' }}/>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.75)', fontWeight:600 }}>
                      {isEstimated ? 'Estimé' : 'Récurrent'}
                    </span>
                  </div>
                  <div style={{ fontWeight:800, fontSize:15, color:'#fff' }}>
                    {isEstimated ? '~' : ''}{fmt(recurringAmt)}
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', marginTop:2 }}>
                    {generatedAmt > 0
                      ? `${incomes.filter(i=>i.isRecurring).length} générés · ${activeRec.length} actifs`
                      : `~estimé · ${activeRec.length} actif${activeRec.length>1?'s':''}`
                    }
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', background:'#f5f5f5', borderRadius:12, padding:3, marginBottom:14 }}>
          {[
            { id:'punctual',  label:'Ponctuel',  icon: TrendingUp  },
            { id:'recurring', label:'Récurrent', icon: RefreshCw   },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              padding:'9px 0', borderRadius:10, border:'none', cursor:'pointer', fontSize:13,
              fontWeight: tab===id ? 700 : 500,
              background: tab===id ? '#fff' : 'transparent',
              color: tab===id ? '#00b894' : '#999',
              boxShadow: tab===id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition:'all 0.15s',
            }}>
              <Icon size={13} strokeWidth={2}/>{label}
            </button>
          ))}
        </div>

        {/* ══ TAB PONCTUEL ══ */}
        {tab === 'punctual' && (
          <>
            {/* Recherche + filtre */}
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'#fff', borderRadius:12, padding:'0 12px', border:'0.5px solid #eee' }}>
                <Search size={14} color="#bbb"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                  style={{ border:'none', outline:'none', fontSize:13, color:'#222', flex:1, padding:'10px 0', background:'none' }}/>
                {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', padding:0 }}><X size={13}/></button>}
              </div>
              <button onClick={() => setShowFilter(v => !v)} style={{ width:40, height:40, borderRadius:12, cursor:'pointer', background:showFilter?'#00b894':'#fff', display:'flex', alignItems:'center', justifyContent:'center', border:'0.5px solid #eee' }}>
                <SlidersHorizontal size={15} color={showFilter?'#fff':'#aaa'}/>
              </button>
            </div>

            {showFilter && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                <button onClick={() => setFilterCat('')} style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:!filterCat?'#00b894':'#f5f5f5', color:!filterCat?'#fff':'#888' }}>Tous</button>
                {incCats.map(c => (
                  <button key={c.id} onClick={() => setFilterCat(String(c.id))} style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:filterCat===String(c.id)?'#00b894':'#f5f5f5', color:filterCat===String(c.id)?'#fff':'#888' }}>{c.name}</button>
                ))}
              </div>
            )}

            <div style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:'0.5px solid #f5f5f5' }}>
                <span style={{ fontWeight:700, fontSize:14, color:'#222' }}>
                  Transactions
                  {filteredPunctual.length !== incomes.length && <span style={{ fontSize:11, color:'#aaa', fontWeight:400, marginLeft:6 }}>({filteredPunctual.length}/{incomes.length})</span>}
                </span>
                <span style={{ fontWeight:700, fontSize:14, color:'#00b894' }}>
                  {fmt(filteredPunctual.reduce((s,i) => s+Number(i.amount), 0))}
                </span>
              </div>
              {filteredPunctual.length === 0
                ? <div style={{ textAlign:'center', color:'#ccc', padding:'32px 0', fontSize:13 }}>
                    <TrendingUp size={32} color="#e0e0e0" style={{ margin:'0 auto 8px', display:'block' }}/>
                    {search||filterCat ? 'Aucun résultat' : 'Aucun revenu ce mois'}
                  </div>
                : filteredPunctual.map(i => (
                  <PunctualCard key={i.id} i={i} onEdit={openEditPunctual} onRemove={removeIncome} fmt={fmt}/>
                ))
              }
            </div>
          </>
        )}

        {/* ══ TAB RÉCURRENT ══ */}
        {tab === 'recurring' && (
          <>
            {/* Bouton générer */}
            <button onClick={generate} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:12, borderRadius:14, marginBottom:14, background:'#f0fdf9', border:'1.5px solid #9FE1CB', color:'#0F6E56', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <RefreshCw size={15} strokeWidth={2}/> Générer les revenus du jour
            </button>

            {genMsg && (
              <div style={{ background:genMsg.generated>0?'#E1F5EE':'#f5f5f5', border:`1px solid ${genMsg.generated>0?'#9FE1CB':'#ddd'}`, borderRadius:12, padding:'12px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
                <CheckCircle size={16} color={genMsg.generated>0?'#0F6E56':'#aaa'}/>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:genMsg.generated>0?'#0F6E56':'#888' }}>
                    {genMsg.generated>0 ? `${genMsg.generated} revenu(s) généré(s)` : 'Aucun revenu à générer'}
                  </div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                    {genMsg.isHoliday?`Jour férié : ${genMsg.holidayName}`:genMsg.isWorkingDay?'Jour ouvré':'Week-end'}{' · '}{genMsg.date}
                  </div>
                </div>
              </div>
            )}

            {recurItems.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 0', color:'#ccc' }}>
                  <RefreshCw size={36} color="#e0e0e0" style={{ margin:'0 auto 10px', display:'block' }}/>
                  <div style={{ fontSize:14, marginBottom:6 }}>Aucun revenu récurrent</div>
                  <div style={{ fontSize:12 }}>Appuyez sur + pour en créer un</div>
                </div>
              : <>
                  {activeRec.length > 0 && (
                    <>
                      <div style={{ fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Actifs ({activeRec.length})</div>
                      {activeRec.map(r => <RecurringCard key={r.id} r={r} onToggle={toggleRec} onEdit={openEditRecurring} onRemove={removeRec} fmt={fmt}/>)}
                    </>
                  )}
                  {inactiveRec.length > 0 && (
                    <>
                      <div style={{ fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', margin:'14px 0 8px' }}>Inactifs ({inactiveRec.length})</div>
                      {inactiveRec.map(r => <RecurringCard key={r.id} r={r} onToggle={toggleRec} onEdit={openEditRecurring} onRemove={removeRec} fmt={fmt}/>)}
                    </>
                  )}
                </>
            }
          </>
        )}
      </div>

      {/* ── FAB avec menu ── */}
      {fabOpen && <div onClick={() => setFabOpen(false)} style={{ position:'fixed', inset:0, zIndex:14 }}/>}
      <div style={{ position:'fixed', bottom:84, right:20, zIndex:15, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 }}>
        {fabOpen && (
          <>
            <button onClick={openCreateRecurring} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:24, border:'none', cursor:'pointer', background:'#6C5CE7', color:'#fff', fontWeight:700, fontSize:13, boxShadow:'0 3px 10px rgba(108,92,231,0.35)', whiteSpace:'nowrap' }}>
              <RefreshCw size={14} strokeWidth={2.5}/> Revenu récurrent
            </button>
            <button onClick={openCreatePunctual} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:24, border:'none', cursor:'pointer', background:'#00b894', color:'#fff', fontWeight:700, fontSize:13, boxShadow:'0 3px 10px rgba(0,184,148,0.35)', whiteSpace:'nowrap' }}>
              <TrendingUp size={14} strokeWidth={2.5}/> Revenu ponctuel
            </button>
          </>
        )}
        <button onClick={() => setFabOpen(v => !v)} style={{ width:52, height:52, borderRadius:26, background:fabOpen?'#555':'#00b894', border:'none', color:'#fff', cursor:'pointer', boxShadow:'0 4px 14px rgba(0,184,148,0.45)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
          {fabOpen ? <X size={22} strokeWidth={2.5}/> : <Plus size={24} strokeWidth={2.5}/>}
        </button>
      </div>

      {/* ── Modal ponctuel ── */}
      {modal === 'punctual' && (
        <Modal title={editItem ? 'Modifier le revenu' : 'Nouveau revenu ponctuel'} onClose={() => setModal(null)}>
          <div style={{ overflowY:'auto', maxHeight:'60vh', paddingRight:4 }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:8 }}>Catégorie</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {incCats.map(c => {
                  const active = String(form.categoryId)===String(c.id)
                  const color  = c.color || '#00b894'
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
            <Input type="number" label={`Montant (${currency})`} placeholder={fmt(100000)} value={form.amount} onChange={set('amount')}/>
            <Input type="text"   label="Description" placeholder="Versement, Prestation" value={form.description} onChange={set('description')}/>
            <Input type="date"   label="Date" value={form.date} onChange={set('date')}/>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:12, paddingTop:12, borderTop:'0.5px solid #f0f0f0' }}>
            <button onClick={() => setModal(null)} style={{ flex:1, padding:12, borderRadius:12, cursor:'pointer', background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888' }}>Annuler</button>
            <button onClick={savePunctual} disabled={saving} style={{ flex:2, padding:12, borderRadius:12, background:saving?'#5DCAA5':'#00b894', border:'none', fontWeight:700, fontSize:14, color:'#fff', cursor:saving?'not-allowed':'pointer' }}>
              {saving ? 'Enregistrement...' : editItem ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal récurrent ── */}
      {recModal && (
        <Modal title={recModal?.id ? 'Modifier la récurrence' : 'Nouveau revenu récurrent'} onClose={() => setRecModal(null)}>
          <div style={{ overflowY:'auto', maxHeight:'60vh', paddingRight:4 }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:8 }}>Catégorie</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {incCats.map(c => {
                  const active = String(recForm.categoryId)===String(c.id)
                  const color  = c.color || '#00b894'
                  return (
                    <button key={c.id} type="button" onClick={() => setRecForm(p => ({ ...p, categoryId:String(c.id) }))}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 4px', borderRadius:12, cursor:'pointer', border:`1.5px solid ${active?color:'#eee'}`, background:active?color+'15':'#fafafa' }}>
                      <LucideIcon name={c.icon} size={18} color={active?color:'#bbb'} strokeWidth={1.8}/>
                      <span style={{ fontSize:11, fontWeight:600, color:active?color:'#888' }}>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <Input label={`Montant (${currency})`} type="number" placeholder={fmt(500000)} value={recForm.amount} onChange={setRec('amount')}/>
            <Input label="Description" type="text" placeholder="Salaire, loyer perçu..." value={recForm.description} onChange={setRec('description')}/>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:'#555', fontWeight:700, marginBottom:6, display:'block' }}>Fréquence</label>
              <div style={{ display:'flex', gap:8 }}>
                {FREQ_OPTIONS.map(f => (
                  <button key={f} type="button" onClick={() => setRecForm(p => ({ ...p, frequency:f, dayOfMonth:'', dayOfWeek:'' }))}
                    style={{ flex:1, padding:'9px 0', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:12, background:recForm.frequency===f?'#00b894':'#f0f0f0', color:recForm.frequency===f?'#fff':'#555' }}>
                    {FREQ_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>
            <DaySelector/>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:'#555', fontWeight:700, marginBottom:6, display:'block' }}>Type de jour</label>
              <div style={{ display:'flex', gap:8 }}>
                {DTYPE_OPTIONS.map(d => (
                  <button key={d} type="button" onClick={() => setRecForm(p => ({ ...p, dayType:d }))}
                    style={{ flex:1, padding:'9px 4px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, background:recForm.dayType===d?DTYPE_COLOR[d]:'#f0f0f0', color:recForm.dayType===d?'#fff':'#555' }}>
                    {DTYPE_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Date de début" type="date" value={recForm.startDate} onChange={setRec('startDate')}/>
            <Input label="Date de fin (optionnel)" type="date" value={recForm.endDate} onChange={setRec('endDate')}/>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:12, paddingTop:12, borderTop:'0.5px solid #f0f0f0' }}>
            <button onClick={() => setRecModal(null)} style={{ flex:1, padding:12, borderRadius:12, cursor:'pointer', background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888' }}>Annuler</button>
            <button onClick={saveRecurring} disabled={saving} style={{ flex:2, padding:12, borderRadius:12, background:saving?'#5DCAA5':'#00b894', border:'none', fontWeight:700, fontSize:14, color:'#fff', cursor:saving?'not-allowed':'pointer' }}>
              {saving ? 'Enregistrement...' : recModal?.id ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}