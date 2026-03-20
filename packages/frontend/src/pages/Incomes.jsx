import { useState } from 'react'
import {
  Plus, Trash2, TrendingUp, RefreshCw, ToggleLeft, ToggleRight,
  Calendar, Clock, ChevronDown, ChevronUp, Pencil, X, CheckCircle
} from 'lucide-react'
import Header      from '../components/layout/Header'
import Modal       from '../components/ui/Modal'
import Input       from '../components/ui/Input'
import { fmt, MONTHS } from '../utils/format'
import { useApi }  from '../hooks/useApi'
import { incomesApi } from '../services/api'
import api         from '../services/api'
import MonthPicker from '../components/ui/MonthPicker'
import { LucideIcon } from '../utils/iconResolver'

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

// ── Carte revenu récurrent ────────────────────────────────────────
function RecurringIncomeCard({ r, onToggle, onEdit, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const color = r.category?.color || '#00b894'
  return (
    <div style={{
      background:'#fff', borderRadius:14, marginBottom:10,
      border:'0.5px solid #eee', opacity: r.isActive ? 1 : 0.55,
    }}>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{
            width:40, height:40, borderRadius:12, flexShrink:0,
            background: color + '18',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
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
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                background:'#E1F5EE', color:'#0F6E56' }}>
                {FREQ_LABEL[r.frequency]}
              </span>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                background: DTYPE_COLOR[r.dayType] + '18', color: DTYPE_COLOR[r.dayType] }}>
                {DTYPE_LABEL[r.dayType]}
              </span>
              {r.frequency === 'monthly' && r.dayOfMonth && (
                <span style={{ fontSize:10, color:'#aaa', padding:'2px 6px' }}>le {r.dayOfMonth}</span>
              )}
              {r.frequency === 'weekly' && r.dayOfWeek != null && (
                <span style={{ fontSize:10, color:'#aaa', padding:'2px 6px' }}>chaque {DOW_LABEL[r.dayOfWeek]}</span>
              )}
            </div>
          </div>
        </div>

        {/* Détails expandables */}
        {expanded && (
          <div style={{ marginTop:12, paddingTop:10,
            borderTop:'0.5px solid #f5f5f5',
            display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'#aaa', display:'flex', alignItems:'center', gap:4 }}>
                <Calendar size={11}/>
                Début : {new Date(r.startDate).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}
              </span>
              {r.endDate && (
                <span style={{ fontSize:11, color:'#aaa', display:'flex', alignItems:'center', gap:4 }}>
                  <Calendar size={11}/>
                  Fin : {new Date(r.endDate).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}
                </span>
              )}
              {r.lastRunAt && (
                <span style={{ fontSize:11, color:'#aaa', display:'flex', alignItems:'center', gap:4 }}>
                  <Clock size={11}/>
                  Dernier : {new Date(r.lastRunAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                </span>
              )}
            </div>
            {r.category?.name && (
              <span style={{ fontSize:11, color:'#aaa' }}>
                Catégorie : {r.category.name}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginTop:10, paddingTop:10, borderTop:'0.5px solid #f5f5f5' }}>
          <button onClick={() => setExpanded(v => !v)} style={{
            display:'flex', alignItems:'center', gap:4,
            background:'none', border:'none', cursor:'pointer',
            fontSize:11, color:'#aaa', padding:0,
          }}>
            {expanded ? <><ChevronUp size={13}/> Moins</> : <><ChevronDown size={13}/> Détails</>}
          </button>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => onToggle(r.id)} style={{
              display:'flex', alignItems:'center', gap:4,
              padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer',
              background: r.isActive ? '#E1F5EE' : '#f5f5f5',
              fontSize:11, fontWeight:600,
              color: r.isActive ? '#0F6E56' : '#aaa',
            }}>
              {r.isActive ? <><ToggleRight size={14}/> Actif</> : <><ToggleLeft size={14}/> Inactif</>}
            </button>
            <button onClick={() => onEdit(r)} style={{
              display:'flex', alignItems:'center', gap:4,
              padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer',
              background:'#f5f5f5', fontSize:11, fontWeight:600, color:'#555',
            }}>
              <Pencil size={13}/> Modifier
            </button>
            <button onClick={() => onRemove(r.id)} style={{
              display:'flex', alignItems:'center', gap:4,
              padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer',
              background:'#FCEBEB', fontSize:11, fontWeight:600, color:'#E24B4A',
            }}>
              <Trash2 size={13}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Incomes() {
  const [month,    setMonth]   = useState(now.getMonth() + 1)
  const [year]                 = useState(now.getFullYear())
  const [modal,    setModal]   = useState(null)   // 'ponctuel' | 'recurring' | null
  const [recModal, setRecModal]= useState(null)
  const [form,     setForm]    = useState({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
  const [recForm,  setRecForm] = useState(EMPTY_REC)
  const [saving,   setSaving]  = useState(false)
  const [showRec,  setShowRec] = useState(true)
  const [genMsg,   setGenMsg]  = useState(null)
  const [fabOpen,  setFabOpen] = useState(false)

  const { data: incData,  refetch: refetchInc } = useApi('/incomes', { month, year, take:100 })
  const { data: recList,  refetch: refetchRec } = useApi('/recurring-income')
  const { data: cats }                          = useApi('/categories')

  const incomes   = incData?.data || []
  const recurring = recList       || []
  const incCats   = (cats || []).filter(c => c.type === 'income')

  const punctual  = incomes.filter(i => !i.isRecurring).reduce((s,i) => s + Number(i.amount), 0)
  const generated = incomes.filter(i =>  i.isRecurring).reduce((s,i) => s + Number(i.amount), 0)
  const totalReal = incData?.summary?.totalIncomes || 0

  const mStart = new Date(year, month - 1, 1)
  const mEnd   = new Date(year, month, 0)

  const activeRec = recurring.filter(r => {
    if (!r.isActive) return false
    const start = new Date(r.startDate)
    const end   = r.endDate ? new Date(r.endDate) : null
    return start <= mEnd && (!end || end >= mStart)
  })

  const daysInMonth = new Date(year, month, 0).getDate()
  const workingDays = Math.round(daysInMonth * 5 / 7)

  const estimatedInc = activeRec.reduce((s, r) => {
    const amt = Number(r.amount)
    if (r.frequency === 'monthly') return s + amt
    if (r.frequency === 'weekly')  return s + amt * 4
    if (r.frequency === 'daily')   return s + amt * (r.dayType === 'working' ? workingDays : daysInMonth)
    return s
  }, 0)

  const totalRecurInc = generated > 0 ? generated : estimatedInc
  const totalInc = totalReal > 0
    ? totalReal + (generated === 0 ? estimatedInc : 0)
    : punctual + totalRecurInc
  const isEstimated = generated === 0 && estimatedInc > 0

  const set    = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setRec = k => e => setRecForm(p => ({ ...p, [k]: e.target.value }))

  const savePonctuel = async () => {
    if (!form.amount || !form.date) return
    setSaving(true)
    try {
      await incomesApi.create({ ...form, amount: parseFloat(form.amount), categoryId: Number(form.categoryId)||null })
      setModal(null)
      setForm({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
      refetchInc()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const saveRecurring = async () => {
    if (!recForm.amount || !recForm.startDate) return
    setSaving(true)
    try {
      const payload = {
        ...recForm,
        amount:     parseFloat(recForm.amount),
        categoryId: Number(recForm.categoryId)||null,
        dayOfMonth: recForm.dayOfMonth !== '' ? Number(recForm.dayOfMonth) : null,
        dayOfWeek:  recForm.dayOfWeek  !== '' ? Number(recForm.dayOfWeek)  : null,
        endDate:    recForm.endDate || null,
      }
      recModal?.id
        ? await api.put(`/recurring-income/${recModal.id}`, payload)
        : await api.post('/recurring-income', payload)
      setRecModal(null)
      setRecForm(EMPTY_REC)
      refetchRec()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const openEditRec = (r) => {
    setRecModal(r)
    setRecForm({
      categoryId:  r.categoryId  || '',
      amount:      r.amount      || '',
      description: r.description || '',
      frequency:   r.frequency,
      dayOfMonth:  r.dayOfMonth  || '',
      dayOfWeek:   r.dayOfWeek   ?? '',
      dayType:     r.dayType,
      startDate:   r.startDate?.split('T')[0] || '',
      endDate:     r.endDate?.split('T')[0]   || '',
    })
  }

  const toggleRec = async (id) => { await api.patch(`/recurring-income/${id}/toggle`); refetchRec() }
  const removeRec = async (id) => {
    if (!confirm('Supprimer cette récurrence ?')) return
    await api.delete(`/recurring-income/${id}`); refetchRec()
  }
  const removeIncome = async (id) => {
    if (!confirm('Supprimer ce revenu ?')) return
    await incomesApi.remove(id); refetchInc()
  }

  const generate = async () => {
    try {
      const { data } = await api.post('/recurring-income/generate')
      setGenMsg(data); refetchInc(); refetchRec()
      setTimeout(() => setGenMsg(null), 5000)
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
  }

  const DaySelector = () => {
    if (recForm.frequency === 'monthly') return (
      <Input label="Jour du mois (1-31)" type="number" min={1} max={31}
        placeholder="ex: 25 → le 25 de chaque mois"
        value={recForm.dayOfMonth} onChange={setRec('dayOfMonth')}/>
    )
    if (recForm.frequency === 'weekly') return (
      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12, color:'#555', fontWeight:600, marginBottom:6, display:'block' }}>
          Jour de la semaine
        </label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {DOW_LABEL.map((d,i) => (
            <button key={i} type="button"
              onClick={() => setRecForm(p => ({ ...p, dayOfWeek: String(i) }))}
              style={{ padding:'6px 12px', borderRadius:10, border:'none', cursor:'pointer',
                fontWeight:600, fontSize:12,
                background: String(recForm.dayOfWeek)===String(i) ? '#00b894' : '#f0f0f0',
                color:      String(recForm.dayOfWeek)===String(i) ? '#fff'    : '#555' }}>
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

        {/* Filtre mois */}
        <MonthPicker month={month} setMonth={setMonth} months={MONTHS}/>

        {/* Carte résumé total */}
        <div style={{ background:'#00b894', borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:11, color:'#9FE1CB', fontWeight:600,
                textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>
                Total {MONTHS[month-1]}
                {isEstimated && (
                  <span style={{ marginLeft:8, background:'rgba(255,255,255,0.2)',
                    color:'#fff', fontSize:9, padding:'2px 7px', borderRadius:20, fontWeight:700 }}>
                    estimation
                  </span>
                )}
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:'#fff' }}>
                {isEstimated ? '~' : ''}{fmt(totalInc)}
              </div>
            </div>
            <div style={{ width:44, height:44, borderRadius:12,
              background:'rgba(255,255,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <TrendingUp size={22} color="#fff" strokeWidth={1.8}/>
            </div>
          </div>

          {/* Barre composition */}
          {totalInc > 0 && (punctual > 0 || totalRecurInc > 0) && (
            <div style={{ marginTop:4 }}>
              <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.2)',
                overflow:'hidden', display:'flex', marginBottom:8 }}>
                <div style={{ width:`${Math.round((punctual/totalInc)*100)}%`,
                  background:'#fff', transition:'width 0.4s' }}/>
                <div style={{ width:`${Math.round((totalRecurInc/totalInc)*100)}%`,
                  background:'rgba(255,255,255,0.5)', transition:'width 0.4s' }}/>
              </div>
              <div style={{ display:'flex', gap:14 }}>
                {punctual > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'#fff' }}/>
                    <span style={{ fontSize:11, color:'#9FE1CB' }}>Ponctuel</span>
                    <span style={{ fontSize:11, fontWeight:700, color:'#fff' }}>{fmt(punctual)}</span>
                  </div>
                )}
                {totalRecurInc > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'rgba(255,255,255,0.5)' }}/>
                    <span style={{ fontSize:11, color:'#9FE1CB' }}>
                      {isEstimated ? 'Estimation' : 'Récurrents'}
                    </span>
                    <span style={{ fontSize:11, fontWeight:700, color:'#fff' }}>
                      {isEstimated ? '~' : ''}{fmt(totalRecurInc)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bouton générer */}
        <button onClick={generate} style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          padding:12, borderRadius:14, marginBottom:14,
          background:'#f0fdf9', border:'1.5px solid #9FE1CB',
          color:'#0F6E56', fontWeight:700, fontSize:13, cursor:'pointer',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#E1F5EE'}
          onMouseLeave={e => e.currentTarget.style.background = '#f0fdf9'}
        >
          <RefreshCw size={15} strokeWidth={2}/> Générer les revenus du jour
        </button>

        {/* Message génération */}
        {genMsg && (
          <div style={{
            background: genMsg.generated > 0 ? '#E1F5EE' : '#f5f5f5',
            border:`1px solid ${genMsg.generated > 0 ? '#9FE1CB' : '#ddd'}`,
            borderRadius:12, padding:'12px 14px', marginBottom:12,
            display:'flex', alignItems:'center', gap:10,
          }}>
            <CheckCircle size={16} color={genMsg.generated > 0 ? '#0F6E56' : '#aaa'}/>
            <div>
              <div style={{ fontWeight:600, fontSize:13, color: genMsg.generated > 0 ? '#0F6E56' : '#888' }}>
                {genMsg.generated > 0 ? `${genMsg.generated} revenu(s) généré(s)` : 'Aucun revenu à générer'}
              </div>
              <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                {genMsg.isHoliday ? `Jour férié : ${genMsg.holidayName}` : genMsg.isWorkingDay ? 'Jour ouvré' : 'Week-end'}
                {' · '}{genMsg.date}
              </div>
            </div>
          </div>
        )}

        {/* Section récurrents */}
        {activeRec.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <RefreshCw size={14} color="#6C5CE7" strokeWidth={1.8}/>
                <span style={{ fontSize:11, fontWeight:700, color:'#aaa',
                  textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  Récurrents actifs ({activeRec.length})
                </span>
              </div>
              <button onClick={() => setShowRec(v => !v)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb' }}>
                {showRec ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
            </div>
            {showRec && activeRec.map(r => (
              <RecurringIncomeCard key={r.id} r={r}
                onToggle={toggleRec} onEdit={openEditRec} onRemove={removeRec}/>
            ))}
          </div>
        )}

        {/* Liste revenus du mois */}
        <div style={{ background:'#fff', borderRadius:16, border:'0.5px solid #eee', overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'12px 14px', borderBottom:'0.5px solid #f5f5f5' }}>
            <span style={{ fontWeight:700, fontSize:14, color:'#222' }}>
              Transactions · {MONTHS[month-1]}
            </span>
            <span style={{ fontWeight:800, fontSize:14, color:'#00b894' }}>{fmt(totalInc)}</span>
          </div>

          {incomes.length === 0 ? (
            <div style={{ textAlign:'center', color:'#ccc', padding:'32px 0', fontSize:13 }}>
              <TrendingUp size={32} color="#e0e0e0" style={{ margin:'0 auto 8px', display:'block' }}/>
              Aucun revenu ce mois
            </div>
          ) : incomes.map((i, idx) => {
            const color = i.category?.color || '#00b894'
            return (
              <div key={i.id} style={{ display:'flex', alignItems:'center', gap:12,
                padding:'11px 14px',
                borderBottom: idx < incomes.length-1 ? '0.5px solid #f9f9f9' : 'none' }}>
                <div style={{ width:38, height:38, borderRadius:12, flexShrink:0,
                  background: color + '18',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <LucideIcon name={i.category?.icon} size={18} color={color} strokeWidth={1.8}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontWeight:600, fontSize:13, color:'#222',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {i.description || i.category?.name || '—'}
                    </span>
                    {i.isRecurring && (
                      <span style={{ fontSize:10, background:'#EEEDFE', color:'#6C5CE7',
                        borderRadius:20, padding:'1px 7px', fontWeight:600, flexShrink:0 }}>
                        auto
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                    {i.category?.name && (
                      <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px',
                        borderRadius:20, background: color + '18', color }}>
                        {i.category.name}
                      </span>
                    )}
                    <span style={{ fontSize:11, color:'#aaa' }}>
                      {new Date(i.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#00b894' }}>+{fmt(i.amount)}</div>
                  <button onClick={() => removeIncome(i.id)}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      color:'#e0e0e0', padding:0, marginTop:3 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                    onMouseLeave={e => e.currentTarget.style.color = '#e0e0e0'}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── FAB avec choix ── */}
      {fabOpen && (
        <div onClick={() => setFabOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', zIndex:18 }}/>
      )}
      {fabOpen && (
        <div style={{
          position:'fixed', bottom:148, right:20, zIndex:19,
          display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end',
        }}>
          <button onClick={() => { setFabOpen(false); setRecModal('create'); setRecForm(EMPTY_REC) }}
            style={{
              display:'flex', alignItems:'center', gap:10,
              background:'#fff', borderRadius:14, padding:'10px 16px',
              border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
              fontWeight:700, fontSize:13, color:'#6C5CE7',
            }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'#EEEDFE',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <RefreshCw size={16} color="#6C5CE7" strokeWidth={2}/>
            </div>
            Revenu récurrent
          </button>
          <button onClick={() => { setFabOpen(false); setModal('ponctuel') }}
            style={{
              display:'flex', alignItems:'center', gap:10,
              background:'#fff', borderRadius:14, padding:'10px 16px',
              border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
              fontWeight:700, fontSize:13, color:'#00b894',
            }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'#E1F5EE',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <TrendingUp size={16} color="#00b894" strokeWidth={2}/>
            </div>
            Revenu ponctuel
          </button>
        </div>
      )}

      <button onClick={() => setFabOpen(v => !v)} style={{
        position:'fixed', bottom:84, right:20,
        width:52, height:52, borderRadius:26,
        background: fabOpen ? '#555' : '#00b894',
        border:'none', color:'#fff', cursor:'pointer',
        boxShadow:'0 4px 14px rgba(0,184,148,0.45)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:20,
        transition:'background 0.2s, transform 0.2s',
        transform: fabOpen ? 'rotate(45deg)' : 'rotate(0)',
      }}>
        <Plus size={24} strokeWidth={2.5}/>
      </button>

      {/* ── Modal revenu ponctuel ── */}
      {modal === 'ponctuel' && (
        <Modal title="Nouveau revenu ponctuel" onClose={() => setModal(null)}>
          <div style={{ overflowY:'auto', maxHeight:'60vh', paddingRight:4 }}>
            {/* Grille catégories */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#888',
                textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:8 }}>
                Catégorie
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {incCats.map(c => {
                  const active = String(form.categoryId) === String(c.id)
                  const color  = c.color || '#00b894'
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setForm(p => ({ ...p, categoryId: String(c.id) }))}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                        padding:'10px 4px', borderRadius:12, cursor:'pointer',
                        border:`1.5px solid ${active ? color : '#eee'}`,
                        background: active ? color + '15' : '#fafafa' }}>
                      <LucideIcon name={c.icon} size={18} color={active ? color : '#bbb'} strokeWidth={1.8}/>
                      <span style={{ fontSize:11, fontWeight:600, color: active ? color : '#888' }}>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <Input type="number" placeholder="Montant (Ar)" value={form.amount} onChange={set('amount')}/>
            <Input type="text"   placeholder="Description"  value={form.description} onChange={set('description')}/>
            <Input type="date"   value={form.date} onChange={set('date')}/>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:12,
            paddingTop:12, borderTop:'0.5px solid #f0f0f0' }}>
            <button onClick={() => setModal(null)} style={{
              flex:1, padding:12, borderRadius:12, cursor:'pointer',
              background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888',
            }}>Annuler</button>
            <button onClick={savePonctuel} disabled={saving} style={{
              flex:2, padding:12, borderRadius:12,
              background: saving ? '#5DCAA5' : '#00b894',
              border:'none', fontWeight:700, fontSize:14, color:'#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal revenu récurrent ── */}
      {recModal && (
        <Modal title={recModal?.id ? 'Modifier la récurrence' : 'Nouveau revenu récurrent'}
          onClose={() => setRecModal(null)}>
          <div style={{ overflowY:'auto', maxHeight:'60vh', paddingRight:4 }}>
            {/* Grille catégories */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#888',
                textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:8 }}>
                Catégorie
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {incCats.map(c => {
                  const active = String(recForm.categoryId) === String(c.id)
                  const color  = c.color || '#00b894'
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setRecForm(p => ({ ...p, categoryId: String(c.id) }))}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                        padding:'10px 4px', borderRadius:12, cursor:'pointer',
                        border:`1.5px solid ${active ? color : '#eee'}`,
                        background: active ? color + '15' : '#fafafa' }}>
                      <LucideIcon name={c.icon} size={18} color={active ? color : '#bbb'} strokeWidth={1.8}/>
                      <span style={{ fontSize:11, fontWeight:600, color: active ? color : '#888' }}>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <Input label="Montant (Ar)" type="number" placeholder="500 000"
              value={recForm.amount} onChange={setRec('amount')}/>
            <Input label="Description" type="text" placeholder="Salaire, loyer perçu..."
              value={recForm.description} onChange={setRec('description')}/>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:'#555', fontWeight:700, marginBottom:6, display:'block' }}>Fréquence</label>
              <div style={{ display:'flex', gap:8 }}>
                {FREQ_OPTIONS.map(f => (
                  <button key={f} type="button"
                    onClick={() => setRecForm(p => ({ ...p, frequency:f, dayOfMonth:'', dayOfWeek:'' }))}
                    style={{ flex:1, padding:'9px 0', borderRadius:10, border:'none', cursor:'pointer',
                      fontWeight:700, fontSize:12,
                      background: recForm.frequency===f ? '#00b894' : '#f0f0f0',
                      color:      recForm.frequency===f ? '#fff'    : '#555' }}>
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
                  <button key={d} type="button"
                    onClick={() => setRecForm(p => ({ ...p, dayType:d }))}
                    style={{ flex:1, padding:'9px 4px', borderRadius:10, border:'none', cursor:'pointer',
                      fontWeight:700, fontSize:11,
                      background: recForm.dayType===d ? DTYPE_COLOR[d] : '#f0f0f0',
                      color:      recForm.dayType===d ? '#fff'          : '#555' }}>
                    {DTYPE_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Date de début" type="date" value={recForm.startDate} onChange={setRec('startDate')}/>
            <Input label="Date de fin (optionnel)" type="date" value={recForm.endDate} onChange={setRec('endDate')}/>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:12,
            paddingTop:12, borderTop:'0.5px solid #f0f0f0' }}>
            <button onClick={() => setRecModal(null)} style={{
              flex:1, padding:12, borderRadius:12, cursor:'pointer',
              background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888',
            }}>Annuler</button>
            <button onClick={saveRecurring} disabled={saving} style={{
              flex:2, padding:12, borderRadius:12,
              background: saving ? '#5DCAA5' : '#00b894',
              border:'none', fontWeight:700, fontSize:14, color:'#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Enregistrement...' : recModal?.id ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}