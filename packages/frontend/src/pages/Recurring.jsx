import { useState } from 'react'
import {
  Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight,
  Calendar, AlertTriangle, CheckCircle, Clock, Play
} from 'lucide-react'
import Header       from '../components/layout/Header'
import Card         from '../components/ui/Card'
import Button       from '../components/ui/Button'
import Modal        from '../components/ui/Modal'
import Input        from '../components/ui/Input'
import { fmt }      from '../utils/format'
import { useApi }   from '../hooks/useApi'
import api          from '../services/api'

// ── Helpers ──────────────────────────────────────────────────────
const FREQ_LABEL  = { daily:'Quotidien', weekly:'Hebdomadaire', monthly:'Mensuel' }
const DTYPE_LABEL = { all:'Tous les jours', working:'Jours ouvrés', holiday:'Jours fériés' }
const DTYPE_COLOR = { all:'#6C5CE7', working:'#00b894', holiday:'#e74c3c' }
const DOW_LABEL   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']

const FREQ_OPTIONS  = ['daily','weekly','monthly']
const DTYPE_OPTIONS = ['all','working','holiday']

// ── Formulaire initial ────────────────────────────────────────────
const EMPTY_FORM = {
  categoryId:  '',
  amount:      '',
  description: '',
  frequency:   'monthly',
  dayOfMonth:  '',
  dayOfWeek:   '',
  dayType:     'all',
  startDate:   new Date().toISOString().split('T')[0],
  endDate:     '',
}

// ── Composant badge ───────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{
    display:'inline-block', padding:'2px 10px', borderRadius:99,
    fontSize:11, fontWeight:600,
    background: color + '18', color,
  }}>{label}</span>
)

export default function Recurring() {
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [genMsg,  setGenMsg]  = useState(null)
  const [editId,  setEditId]  = useState(null)

  const { data: list,    refetch }       = useApi('/recurring')
  const { data: cats }                   = useApi('/categories')
  const { data: holidays }               = useApi('/recurring/holidays', { year: new Date().getFullYear() })

  const expCats = (cats||[]).filter(c => c.type === 'expense')
  const items   = list || []

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit   = (item) => {
    setEditId(item.id)
    setForm({
      categoryId:  item.categoryId  || '',
      amount:      item.amount      || '',
      description: item.description || '',
      frequency:   item.frequency,
      dayOfMonth:  item.dayOfMonth  || '',
      dayOfWeek:   item.dayOfWeek   ?? '',
      dayType:     item.dayType,
      startDate:   item.startDate?.split('T')[0] || '',
      endDate:     item.endDate?.split('T')[0]   || '',
    })
    setModal(true)
  }

  const save = async () => {
    if (!form.amount || !form.startDate) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount:     parseFloat(form.amount),
        categoryId: Number(form.categoryId) || null,
        dayOfMonth: form.dayOfMonth !== '' ? Number(form.dayOfMonth) : null,
        dayOfWeek:  form.dayOfWeek  !== '' ? Number(form.dayOfWeek)  : null,
        endDate:    form.endDate || null,
      }
      if (editId) {
        await api.put(`/recurring/${editId}`, payload)
      } else {
        await api.post('/recurring', payload)
      }
      setModal(false)
      refetch()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const toggle = async (id) => {
    await api.patch(`/recurring/${id}/toggle`)
    refetch()
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette récurrence ?')) return
    await api.delete(`/recurring/${id}`)
    refetch()
  }

  const generate = async () => {
    try {
      const { data } = await api.post('/recurring/generate')
      setGenMsg(data)
      refetch()
      setTimeout(() => setGenMsg(null), 5000)
    } catch (e) { alert(e.response?.data?.error || 'Erreur génération') }
  }

  // ── Sélecteur du jour selon fréquence ──────────────────────────
  const DaySelector = () => {
    if (form.frequency === 'monthly') return (
      <Input label="Jour du mois (1-31)" type="number"
        placeholder="ex: 5 → le 5 de chaque mois"
        min={1} max={31} value={form.dayOfMonth} onChange={set('dayOfMonth')}/>
    )
    if (form.frequency === 'weekly') return (
      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12, color:'#555', fontWeight:600, marginBottom:6, display:'block' }}>Jour de la semaine</label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {DOW_LABEL.map((d,i) => (
            <button key={i} type="button"
              onClick={() => setForm(p => ({ ...p, dayOfWeek: String(i) }))}
              style={{
                padding:'6px 12px', borderRadius:10, border:'none', cursor:'pointer',
                fontWeight:600, fontSize:12,
                background: String(form.dayOfWeek) === String(i) ? '#6C5CE7' : '#f0f0f0',
                color:      String(form.dayOfWeek) === String(i) ? '#fff'     : '#555',
              }}>{d}</button>
          ))}
        </div>
      </div>
    )
    return null // daily → pas de sélecteur de jour
  }

  return (
    <div>
      <Header title="Dépenses récurrentes"/>
      <div style={{ padding:'12px 16px' }}>

        {/* Bouton générer manuellement */}
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <Button onClick={generate} style={{ flex:1, gap:8 }}>
            <RefreshCw size={15}/> Générer
          </Button>
          <Button onClick={openCreate} style={{ flex:2 }}>
            <Plus size={15}/> Nouvelle récurrence
          </Button>
        </div>

        {/* Message retour génération */}
        {genMsg && (
          <div style={{ background: genMsg.generated > 0 ? '#e8f8f2' : '#f5f5f5',
            border:`1px solid ${genMsg.generated > 0 ? '#00b894' : '#ddd'}`,
            borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <CheckCircle size={16} color="#00b894"/>
              <span style={{ fontWeight:600, fontSize:13, color:'#222' }}>
                {genMsg.generated} dépense(s) générée(s) — {genMsg.date}
              </span>
            </div>
            <div style={{ fontSize:12, color:'#888' }}>
              {genMsg.isHoliday ? `Jour férié : ${genMsg.holidayName}` : genMsg.isWorkingDay ? 'Jour ouvré' : 'Week-end'}
            </div>
          </div>
        )}

        {/* Liste des récurrences */}
        {items.length === 0
          ? <Card><div style={{ textAlign:'center', color:'#ccc', padding:'24px 0' }}>
              <RefreshCw size={32} color="#e0e0e0" style={{ margin:'0 auto 8px', display:'block' }}/>
              <div style={{ fontSize:13 }}>Aucune dépense récurrente</div>
            </div></Card>
          : items.map(item => (
            <Card key={item.id} style={{ opacity: item.isActive ? 1 : 0.55 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                {/* Icône */}
                <div style={{ width:40, height:40, borderRadius:12, flexShrink:0,
                  background:(item.category?.color||'#6C5CE7')+'22',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <RefreshCw size={18} color={item.category?.color||'#6C5CE7'} strokeWidth={1.8}/>
                </div>

                {/* Infos */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700, fontSize:14, color:'#222' }}>
                      {item.description || item.category?.name || 'Sans nom'}
                    </span>
                    <Badge label={FREQ_LABEL[item.frequency]} color="#6C5CE7"/>
                    <Badge label={DTYPE_LABEL[item.dayType]}  color={DTYPE_COLOR[item.dayType]}/>
                  </div>

                  <div style={{ fontSize:13, fontWeight:700, color:'#e74c3c', marginBottom:4 }}>
                    {fmt(item.amount)}
                  </div>

                  <div style={{ fontSize:11, color:'#aaa', display:'flex', gap:12, flexWrap:'wrap' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                      <Calendar size={11}/>
                      Début : {new Date(item.startDate).toLocaleDateString('fr-FR')}
                    </span>
                    {item.endDate && (
                      <span>Fin : {new Date(item.endDate).toLocaleDateString('fr-FR')}</span>
                    )}
                    {item.lastRunAt && (
                      <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                        <Clock size={11}/>
                        Dernier : {new Date(item.lastRunAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  {/* Détail fréquence */}
                  <div style={{ fontSize:11, color:'#bbb', marginTop:3 }}>
                    {item.frequency === 'monthly' && item.dayOfMonth && `Le ${item.dayOfMonth} de chaque mois`}
                    {item.frequency === 'weekly'  && item.dayOfWeek != null && `Chaque ${DOW_LABEL[item.dayOfWeek]}`}
                    {item.frequency === 'daily'   && 'Chaque jour'}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                  <button onClick={()=>toggle(item.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color: item.isActive ? '#00b894' : '#ddd' }}>
                    {item.isActive
                      ? <ToggleRight size={24} strokeWidth={1.8}/>
                      : <ToggleLeft  size={24} strokeWidth={1.8}/>}
                  </button>
                  <button onClick={()=>openEdit(item)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:18, lineHeight:1 }}>✎</button>
                  <button onClick={()=>remove(item.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#ddd' }}>
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
            </Card>
          ))
        }

        {/* Jours fériés */}
        {holidays && holidays.length > 0 && (
          <Card>
            <div style={{ fontWeight:700, fontSize:14, color:'#222', marginBottom:10,
              display:'flex', alignItems:'center', gap:8 }}>
              <AlertTriangle size={16} color="#e74c3c"/> Jours fériés {new Date().getFullYear()}
            </div>
            {holidays.map(h => (
              <div key={h.id} style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', padding:'6px 0', borderBottom:'1px solid #f5f5f5',
                fontSize:13 }}>
                <span style={{ color:'#444' }}>{h.name}</span>
                <span style={{ color:'#aaa', fontSize:11 }}>
                  {new Date(h.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Modal création / édition */}
      {modal && (
        <Modal title={editId ? 'Modifier la récurrence' : 'Nouvelle récurrence'} onClose={()=>setModal(false)}>

          {/* Catégorie */}
          <select value={form.categoryId} onChange={set('categoryId')}
            style={{ display:'block', width:'100%', padding:'12px 14px', borderRadius:12,
              border:'1px solid #eee', fontSize:14, marginBottom:10, background:'#fafafa', outline:'none' }}>
            <option value="">Catégorie</option>
            {expCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <Input label="Montant (Ar)" type="number" placeholder="5000"
            value={form.amount} onChange={set('amount')}/>
          <Input label="Description" type="text" placeholder="Transport, loyer..."
            value={form.description} onChange={set('description')}/>

          {/* Fréquence */}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#555', fontWeight:600, marginBottom:6, display:'block' }}>Fréquence</label>
            <div style={{ display:'flex', gap:8 }}>
              {FREQ_OPTIONS.map(f => (
                <button key={f} type="button"
                  onClick={() => setForm(p => ({ ...p, frequency:f, dayOfMonth:'', dayOfWeek:'' }))}
                  style={{ flex:1, padding:'8px 0', borderRadius:10, border:'none', cursor:'pointer',
                    fontWeight:600, fontSize:12,
                    background: form.frequency===f ? '#6C5CE7' : '#f0f0f0',
                    color:      form.frequency===f ? '#fff'     : '#555' }}>
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Sélecteur de jour */}
          <DaySelector/>

          {/* Type de jour */}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#555', fontWeight:600, marginBottom:6, display:'block' }}>Type de jour</label>
            <div style={{ display:'flex', gap:8 }}>
              {DTYPE_OPTIONS.map(d => (
                <button key={d} type="button"
                  onClick={() => setForm(p => ({ ...p, dayType:d }))}
                  style={{ flex:1, padding:'8px 4px', borderRadius:10, border:'none', cursor:'pointer',
                    fontWeight:600, fontSize:11,
                    background: form.dayType===d ? DTYPE_COLOR[d] : '#f0f0f0',
                    color:      form.dayType===d ? '#fff'          : '#555' }}>
                  {DTYPE_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          <Input label="Date de début" type="date"
            value={form.startDate} onChange={set('startDate')}/>
          <Input label="Date de fin (optionnel)" type="date"
            value={form.endDate} onChange={set('endDate')}/>

          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Button variant="ghost" onClick={()=>setModal(false)} style={{ flex:1 }}>Annuler</Button>
            <Button onClick={save} disabled={saving} style={{ flex:2 }}>
              {saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}