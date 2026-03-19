import { useState } from 'react'
import { Plus, Trash2, TrendingUp, RefreshCw, ToggleLeft, ToggleRight,
         Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import Header  from '../components/layout/Header'
import Card    from '../components/ui/Card'
import Button  from '../components/ui/Button'
import Modal   from '../components/ui/Modal'
import Input   from '../components/ui/Input'
import { fmt, MONTHS } from '../utils/format'
import { useApi }      from '../hooks/useApi'
import { incomesApi }  from '../services/api'
import api             from '../services/api'

const now = new Date()

const FREQ_LABEL  = { daily:'Quotidien', weekly:'Hebdomadaire', monthly:'Mensuel' }
const DTYPE_LABEL = { all:'Tous les jours', working:'Jours ouvrés', holiday:'Jours fériés' }
const DTYPE_COLOR = { all:'#6C5CE7', working:'#00b894', holiday:'#e74c3c' }
const DOW_LABEL   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
const FREQ_OPTIONS  = ['daily','weekly','monthly']
const DTYPE_OPTIONS = ['all','working','holiday']

const EMPTY_REC = {
  categoryId:'', amount:'', description:'', frequency:'monthly',
  dayOfMonth:'', dayOfWeek:'', dayType:'all',
  startDate: now.toISOString().split('T')[0], endDate:'',
}

export default function Incomes() {
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [year]                = useState(now.getFullYear())
  const [modal,   setModal]   = useState(null) // 'ponctuel' | 'recurring' | null
  const [recModal,setRecModal]= useState(null) // null | 'create' | item (edit)
  const [form,    setForm]    = useState({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
  const [recForm, setRecForm] = useState(EMPTY_REC)
  const [saving,  setSaving]  = useState(false)
  const [showRec, setShowRec] = useState(true)
  const [genMsg,  setGenMsg]  = useState(null)

  const { data: incData,  refetch: refetchInc } = useApi('/incomes',          { month, year, take:100 })
  const { data: recList,  refetch: refetchRec } = useApi('/recurring-income')
  const { data: cats }                          = useApi('/categories')

  const incomes   = incData?.data || []
  const recurring = recList       || []
  const incCats   = (cats || []).filter(c => c.type === 'income')
  const totalInc  = incomes.reduce((s, i) => s + Number(i.amount), 0)
  const punctual  = incomes.filter(i => !i.isRecurring).reduce((s,i) => s + Number(i.amount), 0)
  const generated = incomes.filter(i =>  i.isRecurring).reduce((s,i) => s + Number(i.amount), 0)

  const activeRec = recurring.filter(r => {
    if (!r.isActive) return false
    const start  = new Date(r.startDate)
    const end    = r.endDate ? new Date(r.endDate) : null
    const mStart = new Date(year, month - 1, 1)
    const mEnd   = new Date(year, month, 0)
    return start <= mEnd && (!end || end >= mStart)
  })

  const set    = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setRec = k => e => setRecForm(p => ({ ...p, [k]: e.target.value }))

  // ── Ajouter revenu ponctuel ───────────────────────────────────
  const savePonctuel = async () => {
    if (!form.amount || !form.date) return
    setSaving(true)
    try {
      await incomesApi.create({ ...form, amount: parseFloat(form.amount), categoryId: Number(form.categoryId) || null })
      setModal(null)
      setForm({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
      refetchInc()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  // ── Ajouter/modifier revenu récurrent ─────────────────────────
  const saveRecurring = async () => {
    if (!recForm.amount || !recForm.startDate) return
    setSaving(true)
    try {
      const payload = {
        ...recForm,
        amount:     parseFloat(recForm.amount),
        categoryId: Number(recForm.categoryId) || null,
        dayOfMonth: recForm.dayOfMonth !== '' ? Number(recForm.dayOfMonth) : null,
        dayOfWeek:  recForm.dayOfWeek  !== '' ? Number(recForm.dayOfWeek)  : null,
        endDate:    recForm.endDate || null,
      }
      if (recModal?.id) {
        await api.put(`/recurring-income/${recModal.id}`, payload)
      } else {
        await api.post('/recurring-income', payload)
      }
      setRecModal(null)
      setRecForm(EMPTY_REC)
      refetchRec()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const toggleRec = async (id) => {
    await api.patch(`/recurring-income/${id}/toggle`)
    refetchRec()
  }

  const removeRec = async (id) => {
    if (!confirm('Supprimer cette récurrence ?')) return
    await api.delete(`/recurring-income/${id}`)
    refetchRec()
  }

  const generate = async () => {
    try {
      const { data } = await api.post('/recurring-income/generate')
      setGenMsg(data)
      refetchInc()
      refetchRec()
      setTimeout(() => setGenMsg(null), 5000)
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
  }

  const removeIncome = async (id) => {
    if (!confirm('Supprimer ce revenu ?')) return
    await incomesApi.remove(id)
    refetchInc()
  }

  // ── Sélecteur jour fréquence ──────────────────────────────────
  const DaySelector = () => {
    if (recForm.frequency === 'monthly') return (
      <Input label="Jour du mois (1-31)" type="number" min={1} max={31}
        placeholder="ex: 25 → le 25 de chaque mois"
        value={recForm.dayOfMonth} onChange={setRec('dayOfMonth')}/>
    )
    if (recForm.frequency === 'weekly') return (
      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12, color:'#555', fontWeight:600, marginBottom:6, display:'block' }}>Jour de la semaine</label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {DOW_LABEL.map((d,i) => (
            <button key={i} type="button"
              onClick={() => setRecForm(p => ({ ...p, dayOfWeek: String(i) }))}
              style={{ padding:'6px 12px', borderRadius:10, border:'none', cursor:'pointer',
                fontWeight:600, fontSize:12,
                background: String(recForm.dayOfWeek) === String(i) ? '#00b894' : '#f0f0f0',
                color:      String(recForm.dayOfWeek) === String(i) ? '#fff'     : '#555' }}>
              {d}
            </button>
          ))}
        </div>
      </div>
    )
    return null
  }

  return (
    <div>
      <Header title="Revenus"/>
      <div style={{ padding:'12px 16px' }}>

        {/* Filtre mois */}
        <div style={{ display:'flex', gap:8, marginBottom:12, overflowX:'auto', paddingBottom:4 }}>
          {MONTHS.map((m,i) => (
            <button key={i} onClick={() => setMonth(i+1)} style={{
              flexShrink:0, padding:'6px 14px', borderRadius:20, border:'none',
              cursor:'pointer', fontWeight:600, fontSize:13,
              background: month===i+1 ? '#00b894' : '#fff',
              color:      month===i+1 ? '#fff'     : '#555',
              boxShadow:  month===i+1 ? '0 2px 8px rgba(0,184,148,0.35)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>{m}</button>
          ))}
        </div>

        {/* Boutons action */}
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <Button onClick={() => setModal('ponctuel')}
            style={{ flex:2, background:'#00b894' }}>
            <Plus size={15}/> Revenu ponctuel
          </Button>
          <Button onClick={() => { setRecModal('create'); setRecForm(EMPTY_REC) }}
            variant="ghost" style={{ flex:2 }}>
            <RefreshCw size={15}/> Récurrent
          </Button>
          <Button onClick={generate} variant="ghost" style={{ flex:1 }}>
            <RefreshCw size={13}/>
          </Button>
        </div>

        {/* Message génération */}
        {genMsg && (
          <div style={{ background: genMsg.generated > 0 ? '#e8f8f2' : '#f5f5f5',
            border:`1px solid ${genMsg.generated > 0 ? '#00b894' : '#ddd'}`,
            borderRadius:12, padding:'10px 14px', marginBottom:12,
            fontSize:12, color: genMsg.generated > 0 ? '#00b894' : '#888' }}>
            {genMsg.generated > 0
              ? `✓ ${genMsg.generated} revenu(s) généré(s) — ${genMsg.date}`
              : `Aucun revenu à générer (${genMsg.isHoliday ? `férié : ${genMsg.holidayName}` : genMsg.isWorkingDay ? 'déjà générés' : 'week-end'})`
            }
          </div>
        )}

        {/* Résumé */}
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <div style={{ flex:1, background:'#fff', borderRadius:16, padding:'14px 12px',
            boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize:10, color:'#999', fontWeight:600, marginBottom:6 }}>TOTAL</div>
            <div style={{ fontWeight:700, fontSize:16, color:'#00b894' }}>{fmt(totalInc)}</div>
            {punctual > 0 && generated > 0 && (
              <div style={{ marginTop:6, fontSize:11 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ color:'#aaa' }}>Ponctuel</span>
                  <span style={{ color:'#00b894', fontWeight:600 }}>{fmt(punctual)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'#aaa' }}>Récurrent</span>
                  <span style={{ color:'#6C5CE7', fontWeight:600 }}>{fmt(generated)}</span>
                </div>
              </div>
            )}
          </div>
          {activeRec.length > 0 && (
            <div style={{ flex:1, background:'#fff', borderRadius:16, padding:'14px 12px',
              boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize:10, color:'#999', fontWeight:600, marginBottom:6 }}>RÉCURRENTS</div>
              <div style={{ fontWeight:700, fontSize:16, color:'#6C5CE7' }}>
                {activeRec.length} actif{activeRec.length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>
                {fmt(activeRec.reduce((s,r) => s + Number(r.amount), 0))} / occurrence
              </div>
            </div>
          )}
        </div>

        {/* Revenus récurrents actifs */}
        {activeRec.length > 0 && (
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom: showRec ? 10 : 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <RefreshCw size={15} color="#6C5CE7" strokeWidth={1.8}/>
                <span style={{ fontWeight:700, fontSize:14, color:'#222' }}>Récurrents actifs</span>
                <span style={{ fontSize:11, background:'#6C5CE722', color:'#6C5CE7',
                  borderRadius:99, padding:'2px 8px', fontWeight:600 }}>
                  {activeRec.length}
                </span>
              </div>
              <button onClick={() => setShowRec(v => !v)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb' }}>
                {showRec ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
            </div>
            {showRec && activeRec.map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'8px 0', borderBottom:'1px solid #f5f5f5',
                opacity: r.isActive ? 1 : 0.5 }}>
                <div style={{ width:34, height:34, borderRadius:10, flexShrink:0,
                  background:(r.category?.color||'#00b894')+'22',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <RefreshCw size={15} color={r.category?.color||'#00b894'} strokeWidth={1.8}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'#222' }}>
                    {r.description || r.category?.name}
                  </div>
                  <div style={{ fontSize:11, color:'#aaa' }}>
                    {FREQ_LABEL[r.frequency]}
                    {r.frequency === 'monthly' && r.dayOfMonth && ` le ${r.dayOfMonth}`}
                    {r.frequency === 'weekly'  && r.dayOfWeek != null && ` · ${DOW_LABEL[r.dayOfWeek]}`}
                    {r.dayType === 'working' && ' · jours ouvrés'}
                    {r.lastRunAt && ` · dernier : ${new Date(r.lastRunAt).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>
                <div style={{ fontWeight:700, fontSize:13, color:'#00b894', flexShrink:0 }}>
                  +{fmt(r.amount)}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                  <button onClick={() => toggleRec(r.id)}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      color: r.isActive ? '#00b894' : '#ddd' }}>
                    {r.isActive ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                  </button>
                  <button onClick={() => { setRecModal(r); setRecForm({ categoryId:r.categoryId||'', amount:r.amount, description:r.description||'', frequency:r.frequency, dayOfMonth:r.dayOfMonth||'', dayOfWeek:r.dayOfWeek??'', dayType:r.dayType, startDate:r.startDate?.split('T')[0]||'', endDate:r.endDate?.split('T')[0]||'' }) }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb', fontSize:16 }}>
                    ✎
                  </button>
                  <button onClick={() => removeRec(r.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#ddd' }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Liste revenus du mois */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={16} color="#00b894" strokeWidth={1.8}/>
              <span style={{ fontWeight:700, fontSize:15, color:'#222' }}>
                Revenus {MONTHS[month-1]}
              </span>
            </div>
            <span style={{ fontWeight:800, fontSize:16, color:'#00b894' }}>{fmt(totalInc)}</span>
          </div>
          {incomes.length === 0
            ? <div style={{ textAlign:'center', color:'#ccc', padding:'24px 0', fontSize:13 }}>
                Aucun revenu ce mois
              </div>
            : incomes.map(i => (
              <div key={i.id} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                  background:(i.category?.color||'#00b894')+'22',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {i.isRecurring
                    ? <RefreshCw size={15} color={i.category?.color||'#00b894'} strokeWidth={1.8}/>
                    : <span style={{ width:8, height:8, borderRadius:99,
                        background:i.category?.color||'#00b894', display:'block' }}/>
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontWeight:600, fontSize:13, color:'#222',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {i.description || i.category?.name || '-'}
                    </span>
                    {i.isRecurring && (
                      <span style={{ fontSize:10, background:'#6C5CE722', color:'#6C5CE7',
                        borderRadius:99, padding:'1px 7px', fontWeight:600, flexShrink:0 }}>
                        auto
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:'#aaa' }}>
                    {i.category?.name} · {new Date(i.date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#00b894' }}>
                    +{fmt(i.amount)}
                  </div>
                  <button onClick={() => removeIncome(i.id)}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      color:'#ddd', padding:0, marginTop:2 }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))
          }
        </Card>

      </div>

      {/* ── FAB */}
      <button onClick={() => setModal('ponctuel')}
        style={{ position:'fixed', bottom:76, right:'calc(50% - 224px)',
          width:52, height:52, borderRadius:26, background:'#00b894',
          border:'none', color:'#fff', cursor:'pointer',
          boxShadow:'0 4px 14px rgba(0,184,148,0.45)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:15 }}>
        <Plus size={24} strokeWidth={2.5}/>
      </button>

      {/* ── Modal revenu ponctuel */}
      {modal === 'ponctuel' && (
        <Modal title="Nouveau revenu ponctuel" onClose={() => setModal(null)}>
          <select value={form.categoryId} onChange={set('categoryId')}
            style={{ display:'block', width:'100%', padding:'12px 14px', borderRadius:12,
              border:'1px solid #eee', fontSize:14, marginBottom:10, background:'#fafafa', outline:'none' }}>
            <option value="">Catégorie</option>
            {incCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input type="number" placeholder="Montant (Ar)" value={form.amount} onChange={set('amount')}/>
          <Input type="text"   placeholder="Description"  value={form.description} onChange={set('description')}/>
          <Input type="date"   value={form.date} onChange={set('date')}/>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Button variant="ghost" onClick={() => setModal(null)} style={{ flex:1 }}>Annuler</Button>
            <Button onClick={savePonctuel} disabled={saving}
              style={{ flex:2, background:'#00b894' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Modal revenu récurrent */}
      {recModal && (
        <Modal title={recModal?.id ? 'Modifier la récurrence' : 'Nouveau revenu récurrent'}
          onClose={() => setRecModal(null)}>
          <select value={recForm.categoryId} onChange={setRec('categoryId')}
            style={{ display:'block', width:'100%', padding:'12px 14px', borderRadius:12,
              border:'1px solid #eee', fontSize:14, marginBottom:10, background:'#fafafa', outline:'none' }}>
            <option value="">Catégorie</option>
            {incCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input label="Montant (Ar)" type="number" placeholder="500000"
            value={recForm.amount} onChange={setRec('amount')}/>
          <Input label="Description" type="text" placeholder="Salaire, loyer perçu..."
            value={recForm.description} onChange={setRec('description')}/>

          {/* Fréquence */}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#555', fontWeight:600, marginBottom:6, display:'block' }}>Fréquence</label>
            <div style={{ display:'flex', gap:8 }}>
              {FREQ_OPTIONS.map(f => (
                <button key={f} type="button"
                  onClick={() => setRecForm(p => ({ ...p, frequency:f, dayOfMonth:'', dayOfWeek:'' }))}
                  style={{ flex:1, padding:'8px 0', borderRadius:10, border:'none', cursor:'pointer',
                    fontWeight:600, fontSize:12,
                    background: recForm.frequency===f ? '#00b894' : '#f0f0f0',
                    color:      recForm.frequency===f ? '#fff'     : '#555' }}>
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <DaySelector/>

          {/* Type de jour */}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#555', fontWeight:600, marginBottom:6, display:'block' }}>Type de jour</label>
            <div style={{ display:'flex', gap:8 }}>
              {DTYPE_OPTIONS.map(d => (
                <button key={d} type="button"
                  onClick={() => setRecForm(p => ({ ...p, dayType:d }))}
                  style={{ flex:1, padding:'8px 4px', borderRadius:10, border:'none', cursor:'pointer',
                    fontWeight:600, fontSize:11,
                    background: recForm.dayType===d ? DTYPE_COLOR[d] : '#f0f0f0',
                    color:      recForm.dayType===d ? '#fff'          : '#555' }}>
                  {DTYPE_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          <Input label="Date de début" type="date"
            value={recForm.startDate} onChange={setRec('startDate')}/>
          <Input label="Date de fin (optionnel)" type="date"
            value={recForm.endDate} onChange={setRec('endDate')}/>

          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Button variant="ghost" onClick={() => setRecModal(null)} style={{ flex:1 }}>Annuler</Button>
            <Button onClick={saveRecurring} disabled={saving}
              style={{ flex:2, background:'#00b894' }}>
              {saving ? 'Enregistrement...' : recModal?.id ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}