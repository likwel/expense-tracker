import { useState, useMemo } from 'react'
import {
  Plus, Trash2, TrendingDown, Search, SlidersHorizontal, X,
  Pencil, RefreshCw, ToggleLeft, ToggleRight, Calendar,
  AlertTriangle, CheckCircle, Clock, ChevronDown,
} from 'lucide-react'
import Header      from '../components/layout/Header'
import Modal       from '../components/ui/Modal'
import Input       from '../components/ui/Input'
import MonthPicker from '../components/ui/MonthPicker'
import { MONTHS }  from '../utils/format'
import { useApi }  from '../hooks/useApi'
import { expensesApi } from '../services/api'
import api         from '../services/api'
import { LucideIcon }  from '../utils/iconResolver'
import { useFmt }  from '../hooks/useFmt'
import { useAuth } from '../contexts/AuthContext'

/* ─── Constantes ────────────────────────────────────────────────── */
const now  = new Date()
const FREQ_LABEL  = { daily:'Quotidien', weekly:'Hebdomadaire', monthly:'Mensuel' }
const DTYPE_LABEL = { all:'Tous les jours', working:'Jours ouvrés', holiday:'Jours fériés' }
const DTYPE_COLOR = { all:'#6C5CE7', working:'#00b894', holiday:'#E24B4A' }
const DOW_LABEL   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
const FREQ_OPTIONS  = ['daily','weekly','monthly']
const DTYPE_OPTIONS = ['all','working','holiday']

const EMPTY_PUNCTUAL = {
  categoryId:'', amount:'', description:'',
  date: now.toISOString().split('T')[0],
}
const EMPTY_RECURRING = {
  categoryId:'', amount:'', description:'', frequency:'monthly',
  dayOfMonth:'', dayOfWeek:'', dayType:'all',
  startDate: now.toISOString().split('T')[0], endDate:'',
}

const S = {
  card:  { background:'#fff', borderRadius:16, border:'0.5px solid #eee', marginBottom:12, overflow:'hidden' },
  muted: { fontSize:11, color:'#aaa' },
  label: { fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:8 },
}

/* ─── Carte transaction ponctuelle ──────────────────────────────── */
function PunctualCard({ e, onEdit, onRemove, fmt }) {
  const color = e.category?.color || '#E24B4A'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom:'0.5px solid #f9f9f9' }}>
      <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <LucideIcon name={e.category?.icon} size={18} color={color} strokeWidth={1.8}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'#222', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {e.description || e.category?.name || '—'}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
          {e.category?.name && (
            <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:20, background:color+'18', color }}>
              {e.category.name}
            </span>
          )}
          <span style={S.muted}>{new Date(e.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</span>
          {e.isRecurring && (
            <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:20, background:'#EEEDFE', color:'#6C5CE7' }}>auto</span>
          )}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontWeight:700, fontSize:13, color:'#E24B4A', marginBottom:4 }}>-{fmt(e.amount)}</div>
        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
          <button onClick={() => onEdit(e)} style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb', padding:0 }}>
            <Pencil size={13}/>
          </button>
          <button onClick={() => onRemove(e.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#e0e0e0', padding:0 }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Carte dépense récurrente ──────────────────────────────────── */
function RecurringCard({ item, onEdit, onToggle, onRemove, fmt }) {
  const color = item.category?.color || '#6C5CE7'
  return (
    <div style={{
      background:'#fff', borderRadius:16, marginBottom:10,
      border:`0.5px solid ${item.isActive ? '#eee' : '#f5f5f5'}`,
      opacity: item.isActive ? 1 : 0.55, overflow:'hidden',
    }}>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ width:50, height:50, borderRadius:12, flexShrink:0, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <LucideIcon name={item.category?.icon} size={20} color={color} strokeWidth={1.8}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <span style={{ fontWeight:700, fontSize:14, color:'#222' }}>
                {item.description || item.category?.name || 'Sans nom'}
              </span>
              <span style={{ fontWeight:800, fontSize:15, color:'#E24B4A', flexShrink:0, marginLeft:8 }}>
                -{fmt(item.amount)}
              </span>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:5 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#EEEDFE', color:'#534AB7' }}>
                {FREQ_LABEL[item.frequency]}
              </span>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:DTYPE_COLOR[item.dayType]+'18', color:DTYPE_COLOR[item.dayType] }}>
                {DTYPE_LABEL[item.dayType]}
              </span>
              {item.frequency==='monthly' && item.dayOfMonth && (
                <span style={{ fontSize:10, color:'#aaa', padding:'2px 6px' }}>le {item.dayOfMonth}</span>
              )}
              {item.frequency==='weekly' && item.dayOfWeek!=null && (
                <span style={{ fontSize:10, color:'#aaa', padding:'2px 6px' }}>chaque {DOW_LABEL[item.dayOfWeek]}</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:12, marginTop:6, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#bbb', display:'flex', alignItems:'center', gap:3 }}>
            <Calendar size={10}/>
            Début {new Date(item.startDate).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
          </span>
          {item.lastRunAt && (
            <span style={{ fontSize:11, color:'#bbb', display:'flex', alignItems:'center', gap:3 }}>
              <Clock size={10}/>
              Dernier {new Date(item.lastRunAt).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
            </span>
          )}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', gap:6, marginTop:10, paddingTop:10, borderTop:'0.5px solid #f5f5f5' }}>
          <button onClick={() => onToggle(item.id)} style={{
            display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer',
            background: item.isActive ? '#E1F5EE' : '#f5f5f5', fontSize:11, fontWeight:600,
            color: item.isActive ? '#0F6E56' : '#aaa',
          }}>
            {item.isActive ? <><ToggleRight size={14}/>Actif</> : <><ToggleLeft size={14}/>Inactif</>}
          </button>
          <div style={{ display:'flex', gap:5 }}>
            <button onClick={() => onEdit(item)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', background:'#f5f5f5', fontSize:11, fontWeight:600, color:'#555' }}>
              <Pencil size={13}/>Modifier
            </button>
            <button onClick={() => onRemove(item.id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', background:'#FCEBEB', fontSize:11, fontWeight:600, color:'#E24B4A' }}>
              <Trash2 size={13}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Modal dépense ponctuelle ──────────────────────────────────── */
function PunctualModal({ form, setForm, expCats, saving, onSave, onClose, editItem, fmt, currency }) {
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <Modal title={editItem ? 'Modifier la dépense' : 'Nouvelle dépense'} onClose={onClose}>
      <div style={{ overflowY:'auto', maxHeight:'60vh', paddingRight:4 }}>
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Catégorie</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
            {expCats.map(c => {
              const active = String(form.categoryId) === String(c.id)
              const color  = c.color || '#E24B4A'
              return (
                <button key={c.id} type="button"
                  onClick={() => setForm(p => ({ ...p, categoryId: String(c.id) }))}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'10px 4px', borderRadius:12, cursor:'pointer', border:`1.5px solid ${active ? color : '#eee'}`, background: active ? color+'15' : '#fafafa' }}>
                  <LucideIcon name={c.icon} size={20} color={active ? color : '#bbb'} strokeWidth={1.8}/>
                  <span style={{ fontSize:11, fontWeight:600, color: active ? color : '#888' }}>{c.name}</span>
                </button>
              )
            })}
          </div>
        </div>
        <Input type="number" label={`Montant (${currency})`} placeholder={fmt(100000)} value={form.amount} onChange={set('amount')}/>
        <Input type="text"   label="Description (optionnel)" placeholder="Logement, transport" value={form.description} onChange={set('description')}/>
        <Input type="date"   label="Date" value={form.date} onChange={set('date')}/>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:12, paddingTop:12, borderTop:'0.5px solid #f0f0f0' }}>
        <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:12, cursor:'pointer', background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888' }}>Annuler</button>
        <button onClick={onSave} disabled={saving} style={{ flex:2, padding:12, borderRadius:12, cursor:saving?'not-allowed':'pointer', background:saving?'#f0a0a0':'#E24B4A', border:'none', fontWeight:700, fontSize:14, color:'#fff' }}>
          {saving ? 'Enregistrement...' : editItem ? 'Modifier' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  )
}

/* ─── Modal dépense récurrente ──────────────────────────────────── */
function RecurringModal({ form, setForm, expCats, saving, onSave, onClose, editId, fmt, currency }) {
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const DaySelector = () => {
    if (form.frequency === 'monthly') return (
      <Input label="Jour du mois (1-31)" type="number" placeholder="ex: 5 → le 5 de chaque mois" min={1} max={31} value={form.dayOfMonth} onChange={set('dayOfMonth')}/>
    )
    if (form.frequency === 'weekly') return (
      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12, color:'#555', fontWeight:700, marginBottom:6, display:'block' }}>Jour de la semaine</label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {DOW_LABEL.map((d, i) => (
            <button key={i} type="button"
              onClick={() => setForm(p => ({ ...p, dayOfWeek: String(i) }))}
              style={{ padding:'6px 12px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:12, background: String(form.dayOfWeek)===String(i) ? '#6C5CE7' : '#f0f0f0', color: String(form.dayOfWeek)===String(i) ? '#fff' : '#555' }}>
              {d}
            </button>
          ))}
        </div>
      </div>
    )
    return null
  }

  return (
    <Modal title={editId ? 'Modifier la récurrence' : 'Nouvelle dépense récurrente'} onClose={onClose}>
      <div style={{ overflowY:'auto', maxHeight:'60vh', paddingRight:4 }}>
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Catégorie</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
            {expCats.map(c => {
              const active = String(form.categoryId) === String(c.id)
              const color  = c.color || '#6C5CE7'
              return (
                <button key={c.id} type="button"
                  onClick={() => setForm(p => ({ ...p, categoryId: String(c.id) }))}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 4px', borderRadius:12, cursor:'pointer', border:`1.5px solid ${active ? color : '#eee'}`, background: active ? color+'15' : '#fafafa' }}>
                  <LucideIcon name={c.icon} size={18} color={active ? color : '#bbb'} strokeWidth={1.8}/>
                  <span style={{ fontSize:11, fontWeight:600, color: active ? color : '#888' }}>{c.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <Input label={`Montant (${currency})`} placeholder={fmt(50000)} type="number" value={form.amount} onChange={set('amount')}/>
        <Input label="Description" type="text" placeholder="Transport, loyer..." value={form.description} onChange={set('description')}/>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, color:'#555', fontWeight:700, marginBottom:6, display:'block' }}>Fréquence</label>
          <div style={{ display:'flex', gap:8 }}>
            {FREQ_OPTIONS.map(f => (
              <button key={f} type="button"
                onClick={() => setForm(p => ({ ...p, frequency:f, dayOfMonth:'', dayOfWeek:'' }))}
                style={{ flex:1, padding:'9px 0', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:12, background: form.frequency===f ? '#6C5CE7' : '#f0f0f0', color: form.frequency===f ? '#fff' : '#555' }}>
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
                onClick={() => setForm(p => ({ ...p, dayType:d }))}
                style={{ flex:1, padding:'9px 4px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, background: form.dayType===d ? DTYPE_COLOR[d] : '#f0f0f0', color: form.dayType===d ? '#fff' : '#555' }}>
                {DTYPE_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        <Input label="Date de début" type="date" value={form.startDate} onChange={set('startDate')}/>
        <Input label="Date de fin (optionnel)" type="date" value={form.endDate} onChange={set('endDate')}/>
      </div>

      <div style={{ display:'flex', gap:10, marginTop:12, paddingTop:12, borderTop:'0.5px solid #f0f0f0' }}>
        <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:12, cursor:'pointer', background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888' }}>Annuler</button>
        <button onClick={onSave} disabled={saving} style={{ flex:2, padding:12, borderRadius:12, background: saving ? '#a09bda' : '#6C5CE7', border:'none', fontWeight:700, fontSize:14, color:'#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </Modal>
  )
}

/* ─── Page principale ───────────────────────────────────────────── */
export default function Expenses() {
  const { fmt }  = useFmt()
  const { user } = useAuth()
  const currency = user?.currency || 'MGA'

  // Navigation
  const [tab,    setTab]    = useState('punctual')
  const [month,  setMonth]  = useState(now.getMonth() + 1)
  const [year]              = useState(now.getFullYear())

  // FAB menu
  const [fabOpen, setFabOpen] = useState(false)

  // Modals
  const [modalType, setModalType] = useState(null)

  // Ponctuel
  const [editItem,     setEditItem]     = useState(null)
  const [punctualForm, setPunctualForm] = useState(EMPTY_PUNCTUAL)
  const [search,       setSearch]       = useState('')
  const [filterCat,    setFilterCat]    = useState('')
  const [showFilter,   setShowFilter]   = useState(false)

  // Récurrent
  const [editId,        setEditId]        = useState(null)
  const [recurringForm, setRecurringForm] = useState(EMPTY_RECURRING)
  const [genMsg,        setGenMsg]        = useState(null)

  const [saving, setSaving] = useState(false)

  // Data
  const { data: expData,   refetch: refetchExp } = useApi('/expenses', { month, year, take:100 })
  const { data: recurList, refetch: refetchRec } = useApi('/recurring')
  const { data: cats }                           = useApi('/categories')
  const { data: holidays }                       = useApi('/recurring/holidays', { year })

  const expenses   = expData?.data || []
  const recurItems = recurList || []
  const expCats    = (cats || []).filter(c => c.type === 'expense')

  // Stats ponctuel
  const totalExp           = expenses.reduce((s,e) => s + Number(e.amount), 0)
  const punctual           = expenses.filter(e => !e.isRecurring).reduce((s,e) => s + Number(e.amount), 0)
  const recurringGenerated = expenses.filter(e =>  e.isRecurring).reduce((s,e) => s + Number(e.amount), 0)

  // Stats récurrent
  const activeRec   = recurItems.filter(i =>  i.isActive)
  const inactiveRec = recurItems.filter(i => !i.isActive)

  // ✅ UTC + réactif au mois sélectionné
  const mStart      = new Date(Date.UTC(year, month - 1, 1))
  const mEnd        = new Date(Date.UTC(year, month, 0))
  const daysInMonth = mEnd.getDate()
  const workingDays = Math.round(daysInMonth * 5 / 7)

  const estimateAmount = (list, _mStart, _mEnd) => list.reduce((s, r) => {
    const amt  = Number(r.amount)
    const rEnd = r.endDate ? new Date(r.endDate) : null

    if (r.frequency === 'monthly') return s + amt
    if (r.frequency === 'weekly')  return s + amt * 4

    if (r.frequency === 'daily') {
      const rStart     = r.startDate ? new Date(r.startDate) : _mStart
      const effStart   = rStart > _mStart ? rStart : _mStart
      const effEnd     = rEnd && rEnd < _mEnd ? rEnd : _mEnd
      const effDays    = Math.max(0, Math.round((effEnd - effStart) / 86400000) + 1)
      const effWorking = Math.round(effDays * 5 / 7)
      return s + amt * (r.dayType === 'working' ? effWorking : effDays)
    }

    return s
  }, 0)

  const totalActive = estimateAmount(activeRec, mStart, mEnd)
  const recurring   = totalActive

  const filtered = useMemo(() => expenses.filter(e => {
    const matchSearch = !search || (e.description||e.category?.name||'').toLowerCase().includes(search.toLowerCase())
    const matchCat    = !filterCat || String(e.categoryId) === filterCat
    return matchSearch && matchCat
  }), [expenses, search, filterCat])

  const topCats = useMemo(() => {
    const map = {}
    expenses.forEach(e => { const k = e.category?.name||'Autre'; map[k] = (map[k]||0) + Number(e.amount) })
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,4)
  }, [expenses])

  // ── Handlers ponctuel ─────────────────────────────────────────
  const openCreatePunctual = () => {
    setEditItem(null)
    setPunctualForm(EMPTY_PUNCTUAL)
    setModalType('punctual')
    setFabOpen(false)
  }
  const openEditPunctual = (e) => {
    setEditItem(e)
    setPunctualForm({ categoryId:String(e.categoryId||''), amount:String(e.amount), description:e.description||'', date:e.date?.split('T')[0]||now.toISOString().split('T')[0] })
    setModalType('punctual')
  }
  const savePunctual = async () => {
    if (!punctualForm.amount || !punctualForm.date) return
    setSaving(true)
    try {
      if (editItem) {
        await api.put(`/expenses/${editItem.id}`, { ...punctualForm, amount:parseFloat(punctualForm.amount), categoryId:Number(punctualForm.categoryId)||null })
      } else {
        await expensesApi.create({ ...punctualForm, amount:parseFloat(punctualForm.amount), categoryId:Number(punctualForm.categoryId)||null })
      }
      setModalType(null); refetchExp()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }
  const removePunctual = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await expensesApi.remove(id); refetchExp()
  }

  // ── Handlers récurrent ────────────────────────────────────────
  const openCreateRecurring = () => {
    setEditId(null)
    setRecurringForm(EMPTY_RECURRING)
    setModalType('recurring')
    setFabOpen(false)
  }
  const openEditRecurring = (item) => {
    setEditId(item.id)
    setRecurringForm({ categoryId:item.categoryId||'', amount:item.amount||'', description:item.description||'', frequency:item.frequency, dayOfMonth:item.dayOfMonth||'', dayOfWeek:item.dayOfWeek??'', dayType:item.dayType, startDate:item.startDate?.split('T')[0]||'', endDate:item.endDate?.split('T')[0]||'' })
    setModalType('recurring')
  }
  const saveRecurring = async () => {
    if (!recurringForm.amount || !recurringForm.startDate) return
    setSaving(true)
    try {
      const payload = { ...recurringForm, amount:parseFloat(recurringForm.amount), categoryId:Number(recurringForm.categoryId)||null, dayOfMonth:recurringForm.dayOfMonth!=='' ? Number(recurringForm.dayOfMonth) : null, dayOfWeek:recurringForm.dayOfWeek!=='' ? Number(recurringForm.dayOfWeek) : null, endDate:recurringForm.endDate||null }
      editId ? await api.put(`/recurring/${editId}`, payload) : await api.post('/recurring', payload)
      setModalType(null); refetchRec()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }
  const toggleRecurring = async (id) => { await api.patch(`/recurring/${id}/toggle`); refetchRec() }
  const removeRecurring = async (id) => { if (!confirm('Supprimer cette récurrence ?')) return; await api.delete(`/recurring/${id}`); refetchRec() }
  const generate = async () => {
    try {
      const { data } = await api.post('/recurring/generate')
      setGenMsg(data); refetchRec()
      setTimeout(() => setGenMsg(null), 5000)
    } catch (e) { alert(e.response?.data?.error || 'Erreur génération') }
  }

  return (
    <div style={{ paddingBottom:80 }}>
      <Header title="Dépenses"/>
      <div style={{ padding:'12px 16px' }}>

        <MonthPicker month={month} setMonth={setMonth} months={MONTHS}/>

        {/* ── Résumé global ── */}
        <div style={{ ...S.card, padding:'16px', marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:'#aaa', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>
                Total {MONTHS[month - 1]}
              </div>
              <div style={{ fontWeight:800, fontSize:26, color:'#E24B4A', lineHeight:1 }}>
                {fmt(totalExp + recurring)}
              </div>
            </div>
            <div style={{ width:40, height:40, borderRadius:12, background:'#FCEBEB', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <TrendingDown size={20} color="#E24B4A" strokeWidth={1.8}/>
            </div>
          </div>

          {totalExp > 0 && (
            <div style={{ height:5, borderRadius:3, background:'#f0f0f0', overflow:'hidden', display:'flex', marginBottom:10 }}>
              <div style={{ width:`${Math.round((punctual/totalExp)*100)}%`, background:'#E24B4A', transition:'width 0.4s' }}/>
              <div style={{ width:`${Math.round((recurring/totalExp)*100)}%`, background:'#AFA9EC', transition:'width 0.4s' }}/>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'#fafafa', borderRadius:10, padding:'10px 12px', border:'0.5px solid #f0f0f0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#E24B4A', flexShrink:0 }}/>
                <span style={{ fontSize:11, color:'#aaa', fontWeight:600 }}>Ponctuel</span>
              </div>
              <div style={{ fontWeight:800, fontSize:15, color:'#E24B4A' }}>{fmt(punctual)}</div>
              <div style={{ fontSize:10, color:'#bbb', marginTop:2 }}>
                {expenses.filter(e => !e.isRecurring).length} transaction{expenses.filter(e => !e.isRecurring).length > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ background:'#fafafa', borderRadius:10, padding:'10px 12px', border:'0.5px solid #f0f0f0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#6C5CE7', flexShrink:0 }}/>
                <span style={{ fontSize:11, color:'#aaa', fontWeight:600 }}>Récurrent</span>
              </div>
              <div style={{ fontWeight:800, fontSize:15, color:'#6C5CE7' }}>{fmt(recurring)}</div>
              <div style={{ fontSize:10, color:'#bbb', marginTop:2 }}>
                {recurringGenerated > 0
                  ? `${expenses.filter(e => e.isRecurring).length} généré${expenses.filter(e => e.isRecurring).length > 1 ? 's' : ''} · ${activeRec.length} actif${activeRec.length > 1 ? 's' : ''}`
                  : `~estimé · ${activeRec.length} actif${activeRec.length > 1 ? 's' : ''}`
                }
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', background:'#f5f5f5', borderRadius:12, padding:3, marginBottom:14 }}>
          {[
            { id:'punctual',  label:'Ponctuel',  icon: TrendingDown },
            { id:'recurring', label:'Récurrent', icon: RefreshCw    },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              padding:'9px 0', borderRadius:10, border:'none', cursor:'pointer', fontSize:13,
              fontWeight: tab===id ? 700 : 500,
              background: tab===id ? '#fff' : 'transparent',
              color: tab===id ? (id==='punctual' ? '#E24B4A' : '#6C5CE7') : '#999',
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
            {topCats.length > 0 && totalExp > 0 && (
              <div style={{ ...S.card, padding:'14px' }}>
                {topCats.map(([name, amt]) => (
                  <div key={name} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                      <span style={{ color:'#555', fontWeight:500 }}>{name}</span>
                      <span style={{ color:'#E24B4A', fontWeight:700 }}>{fmt(amt)}</span>
                    </div>
                    <div style={{ height:4, borderRadius:2, background:'#f5f5f5', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:2, background:'#E24B4A', width:`${Math.round((amt/totalExp)*100)}%`, opacity:0.6+(amt/totalExp)*0.4 }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'#fff', borderRadius:12, padding:'0 12px', border:'0.5px solid #eee' }}>
                <Search size={14} color="#bbb"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                  style={{ border:'none', outline:'none', fontSize:13, color:'#222', flex:1, padding:'10px 0', background:'none' }}/>
                {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', padding:0 }}><X size={13}/></button>}
              </div>
              <button onClick={() => setShowFilter(v => !v)} style={{ width:40,height:40,borderRadius:12,cursor:'pointer', background:showFilter?'#E24B4A':'#fff', display:'flex',alignItems:'center',justifyContent:'center',border:'0.5px solid #eee' }}>
                <SlidersHorizontal size={15} color={showFilter?'#fff':'#aaa'}/>
              </button>
            </div>

            {showFilter && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                <button onClick={() => setFilterCat('')} style={{ padding:'5px 12px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:600, background:!filterCat?'#E24B4A':'#f5f5f5', color:!filterCat?'#fff':'#888' }}>Tous</button>
                {expCats.map(c => (
                  <button key={c.id} onClick={() => setFilterCat(String(c.id))} style={{ padding:'5px 12px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:600, background:filterCat===String(c.id)?'#E24B4A':'#f5f5f5', color:filterCat===String(c.id)?'#fff':'#888' }}>{c.name}</button>
                ))}
              </div>
            )}

            <div style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:'0.5px solid #f5f5f5' }}>
                <span style={{ fontWeight:700, fontSize:14, color:'#222' }}>
                  Transactions
                  {filtered.length !== expenses.length && <span style={{ fontSize:11, color:'#aaa', fontWeight:400, marginLeft:6 }}>({filtered.length}/{expenses.length})</span>}
                </span>
                <span style={{ fontWeight:700, fontSize:14, color:'#E24B4A' }}>
                  {fmt(filtered.reduce((s,e) => s+Number(e.amount), 0))}
                </span>
              </div>
              {filtered.length === 0
                ? <div style={{ textAlign:'center', color:'#ccc', padding:'32px 0', fontSize:13 }}>{search||filterCat ? 'Aucun résultat' : 'Aucune dépense ce mois'}</div>
                : filtered.map(e => (
                  <PunctualCard key={e.id} e={e} onEdit={openEditPunctual} onRemove={removePunctual} fmt={fmt}/>
                ))
              }
            </div>
          </>
        )}

        {/* ══ TAB RÉCURRENT ══ */}
        {tab === 'recurring' && (
          <>
            <button onClick={generate} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:12, borderRadius:14, marginBottom:14, background:'#f7f6fd', border:'1.5px solid #EEEDFE', color:'#6C5CE7', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <RefreshCw size={15} strokeWidth={2}/> Générer les dépenses du jour
            </button>

            {genMsg && (
              <div style={{ background:genMsg.generated>0?'#E1F5EE':'#f5f5f5', border:`1px solid ${genMsg.generated>0?'#9FE1CB':'#ddd'}`, borderRadius:12, padding:'12px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
                <CheckCircle size={16} color={genMsg.generated>0?'#0F6E56':'#aaa'}/>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:genMsg.generated>0?'#0F6E56':'#888' }}>
                    {genMsg.generated>0 ? `${genMsg.generated} dépense(s) générée(s)` : 'Aucune dépense à générer'}
                  </div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                    {genMsg.isHoliday ? `Jour férié : ${genMsg.holidayName}` : genMsg.isWorkingDay ? 'Jour ouvré' : 'Week-end'}{' · '}{genMsg.date}
                  </div>
                </div>
              </div>
            )}

            {activeRec.length===0 && inactiveRec.length===0
              ? <div style={{ textAlign:'center', padding:'40px 0', color:'#ccc' }}>
                  <RefreshCw size={36} color="#e0e0e0" style={{ margin:'0 auto 10px', display:'block' }}/>
                  <div style={{ fontSize:14, marginBottom:6 }}>Aucune dépense récurrente</div>
                  <div style={{ fontSize:12 }}>Appuyez sur + pour en créer une</div>
                </div>
              : <>
                  {activeRec.length>0 && (
                    <>
                      <div style={{ fontSize:11,fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8 }}>Actives ({activeRec.length})</div>
                      {activeRec.map(item => <RecurringCard key={item.id} item={item} onEdit={openEditRecurring} onToggle={toggleRecurring} onRemove={removeRecurring} fmt={fmt}/>)}
                    </>
                  )}
                  {inactiveRec.length>0 && (
                    <>
                      <div style={{ fontSize:11,fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.5px',margin:'14px 0 8px' }}>Inactives ({inactiveRec.length})</div>
                      {inactiveRec.map(item => <RecurringCard key={item.id} item={item} onEdit={openEditRecurring} onToggle={toggleRecurring} onRemove={removeRecurring} fmt={fmt}/>)}
                    </>
                  )}
                </>
            }

            {holidays?.length>0 && (
              <div style={{ ...S.card, marginTop:14 }}>
                <div style={{ padding:'12px 14px', borderBottom:'0.5px solid #f5f5f5', display:'flex', alignItems:'center', gap:8 }}>
                  <AlertTriangle size={15} color="#E24B4A"/>
                  <span style={{ fontWeight:700, fontSize:13, color:'#222' }}>Jours fériés {year}</span>
                </div>
                {holidays.map(h => (
                  <div key={h.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 14px', borderBottom:'0.5px solid #fafafa', fontSize:13 }}>
                    <span style={{ color:'#444' }}>{h.name}</span>
                    <span style={{ color:'#aaa', fontSize:11 }}>{new Date(h.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── FAB ── */}
      {fabOpen && (
        <div onClick={() => setFabOpen(false)} style={{ position:'fixed', inset:0, zIndex:14 }}/>
      )}
      <div style={{ position:'fixed', bottom:84, right:20, zIndex:15, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 }}>
        {fabOpen && (
          <>
            <button onClick={openCreateRecurring} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:24, border:'none', cursor:'pointer', background:'#6C5CE7', color:'#fff', fontWeight:700, fontSize:13, boxShadow:'0 3px 10px rgba(108,92,231,0.35)', whiteSpace:'nowrap' }}>
              <RefreshCw size={14} strokeWidth={2.5}/> Dépense récurrente
            </button>
            <button onClick={openCreatePunctual} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:24, border:'none', cursor:'pointer', background:'#E24B4A', color:'#fff', fontWeight:700, fontSize:13, boxShadow:'0 3px 10px rgba(226,75,74,0.35)', whiteSpace:'nowrap' }}>
              <TrendingDown size={14} strokeWidth={2.5}/> Dépense ponctuelle
            </button>
          </>
        )}
        <button onClick={() => setFabOpen(v => !v)} style={{ width:52, height:52, borderRadius:26, background: fabOpen ? '#555' : '#E24B4A', border:'none', color:'#fff', cursor:'pointer', boxShadow:'0 4px 14px rgba(226,75,74,0.40)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
          {fabOpen ? <X size={22} strokeWidth={2.5}/> : <Plus size={24} strokeWidth={2.5}/>}
        </button>
      </div>

      {/* Modals */}
      {modalType === 'punctual' && (
        <PunctualModal
          form={punctualForm} setForm={setPunctualForm}
          expCats={expCats} saving={saving}
          onSave={savePunctual} onClose={() => setModalType(null)}
          editItem={editItem} fmt={fmt} currency={currency}
        />
      )}
      {modalType === 'recurring' && (
        <RecurringModal
          form={recurringForm} setForm={setRecurringForm}
          expCats={expCats} saving={saving}
          onSave={saveRecurring} onClose={() => setModalType(null)}
          editId={editId} fmt={fmt} currency={currency}
        />
      )}
    </div>
  )
}