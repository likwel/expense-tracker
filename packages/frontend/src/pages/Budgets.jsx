import { useState, useEffect, useCallback } from 'react'
import {
  Target, Plus, AlertTriangle, Bell, BellOff,
  RefreshCw, CheckCircle, TrendingDown, Trash2, Pencil
} from 'lucide-react'
import Header      from '../components/layout/Header'
import Modal       from '../components/ui/Modal'
import Input       from '../components/ui/Input'
import { fmt, pct, MONTHS } from '../utils/format'
import { useApi }  from '../hooks/useApi'
import { budgetsApi } from '../services/api'
import api         from '../services/api'
import MonthPicker from '../components/ui/MonthPicker'
import { LucideIcon } from '../utils/iconResolver'

const now = new Date()

// ── Seuils de notification ────────────────────────────────────────
const THRESHOLDS = [
  { pct: 100, level: 'danger',  label: 'Budget épuisé',        color: '#E24B4A', bg: '#FCEBEB' },
  { pct: 90,  level: 'warning', label: 'Budget presque épuisé', color: '#BA7517', bg: '#FAEEDA' },
  { pct: 75,  level: 'alert',   label: '75% du budget atteint', color: '#534AB7', bg: '#EEEDFE' },
]

function getThreshold(spent, amount) {
  const p = pct(spent, Number(amount))
  return THRESHOLDS.find(t => p >= t.pct) || null
}

// ── Barre de progression colorée ─────────────────────────────────
function BudgetBar({ spent, amount, color }) {
  const p      = Math.min(100, pct(spent, Number(amount)))
  const barColor = p >= 100 ? '#E24B4A' : p >= 90 ? '#EF9F27' : color || '#6C5CE7'
  return (
    <div style={{ height:6, background:'#f0f0f0', borderRadius:3, overflow:'hidden', marginTop:8 }}>
      <div style={{
        height:'100%', borderRadius:3,
        width:`${p}%`, background: barColor,
        transition:'width 0.5s',
      }}/>
    </div>
  )
}

// ── Carte budget ──────────────────────────────────────────────────
function BudgetCard({ b, onEdit, onRemove, onToggleNotif }) {
  const p         = pct(b.spent, Number(b.amount))
  const threshold = getThreshold(b.spent, b.amount)
  const color     = b.category?.color || '#6C5CE7'
  const remaining = Math.max(0, Number(b.amount) - Number(b.spent))
  const over      = Number(b.spent) > Number(b.amount)

  return (
    <div style={{
      background:'#fff', borderRadius:16, marginBottom:12,
      border: threshold?.level === 'danger'  ? '1px solid #F09595' :
              threshold?.level === 'warning' ? '1px solid #FAC775' : '0.5px solid #eee',
      overflow:'hidden',
    }}>
      <div style={{ padding:'14px 14px 12px' }}>
        {/* En-tête */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
          <div style={{
            width:42, height:42, borderRadius:12, flexShrink:0,
            background: color + '18',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <LucideIcon name={b.category?.icon} size={20} color={color} strokeWidth={1.8}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'#222', marginBottom:2 }}>
              {b.category?.name || 'Sans catégorie'}
            </div>
            <div style={{ fontSize:11, color:'#aaa' }}>
              {fmt(b.spent)} dépensé sur {fmt(b.amount)}
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontWeight:800, fontSize:16,
              color: p >= 100 ? '#E24B4A' : p >= 90 ? '#BA7517' : '#222' }}>
              {p}%
            </div>
            <div style={{ fontSize:11, color: over ? '#E24B4A' : '#aaa', marginTop:1 }}>
              {over ? `+${fmt(Number(b.spent) - Number(b.amount))} dépassé` : `${fmt(remaining)} restant`}
            </div>
          </div>
        </div>

        {/* Barre */}
        <BudgetBar spent={b.spent} amount={b.amount} color={color}/>

        {/* Alerte seuil */}
        {threshold && (
          <div style={{
            marginTop:10, padding:'7px 10px', borderRadius:8,
            background: threshold.bg, fontSize:12, fontWeight:600,
            color: threshold.color, display:'flex', alignItems:'center', gap:6,
          }}>
            <AlertTriangle size={13}/>
            {threshold.label}
            {p >= 100 && ` — ${fmt(Number(b.spent) - Number(b.amount))} au-dessus`}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', justifyContent:'space-between', gap:6,
          marginTop:10, paddingTop:10, borderTop:'0.5px solid #f5f5f5' }}>
          <button onClick={() => onToggleNotif(b)} style={{
            display:'flex', alignItems:'center', gap:4,
            padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer',
            background: localStorage.getItem(`budget-notif-${b.id}`) !== 'false' ? '#EEEDFE' : '#f5f5f5',
            fontSize:11, fontWeight:600,
            color: localStorage.getItem(`budget-notif-${b.id}`) !== 'false' ? '#534AB7' : '#aaa',
          }}>
            {localStorage.getItem(`budget-notif-${b.id}`) !== 'false' ? <Bell size={13}/> : <BellOff size={13}/>}
            {localStorage.getItem(`budget-notif-${b.id}`) !== 'false' ? 'Alertes on' : 'Alertes off'}
          </button>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:6 }}>
<button onClick={() => onEdit(b)} style={{
            display:'flex', alignItems:'center', gap:4,
            padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer',
            background:'#f5f5f5', fontSize:11, fontWeight:600, color:'#555',
          }}>
            <Pencil size={13}/> Modifier
          </button>
          <button onClick={() => onRemove(b.id)} style={{
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

export default function Budgets() {
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [year]                = useState(now.getFullYear())
  const [modal,   setModal]   = useState(false)
  const [editItem,setEditItem]= useState(null)
  const [form,    setForm]    = useState({ categoryId:'', amount:'' })
  const [saving,  setSaving]  = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [notifs,  setNotifs]  = useState([]) // notifications locales

  const { data: budgets, refetch } = useApi('/budgets',    { month, year })
  const { data: cats }             = useApi('/categories')

  const list    = budgets || []
  const expCats = (cats || []).filter(c => c.type === 'expense')

  // ── Totaux ────────────────────────────────────────────────────
  const totalBudget = list.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent  = list.reduce((s, b) => s + Number(b.spent),  0)
  const globalPct   = pct(totalSpent, totalBudget)

  // ── Vérification notifications au chargement ──────────────────
  useEffect(() => {
    if (!list.length) return
    const newNotifs = []
    list.forEach(b => {
      if (b.notifEnabled === false) return
      const threshold = getThreshold(b.spent, b.amount)
      if (!threshold) return
      const key = `budget-notif-${b.id}-${threshold.level}-${month}-${year}`
      if (sessionStorage.getItem(key)) return // déjà notifié cette session
      newNotifs.push({ id: key, budget: b, threshold })
      sessionStorage.setItem(key, '1')
    })
    if (newNotifs.length) setNotifs(prev => [...prev, ...newNotifs])
  }, [budgets])

  // ── Synchronisation = simple refetch (spent calculé par le GET) ─
  const sync = useCallback(async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      await refetch()
      setSyncMsg({ ok: true, text: 'Budgets synchronisés avec les dépenses réelles' })
    } catch {
      setSyncMsg({ ok: false, text: 'Erreur lors de la synchronisation' })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 4000)
    }
  }, [refetch])

  // ── Sync automatique au changement de mois ────────────────────
  useEffect(() => { refetch() }, [month, year])

  const openCreate = () => {
    setEditItem(null)
    setForm({ categoryId:'', amount:'' })
    setModal(true)
  }

  const openEdit = (b) => {
    setEditItem(b)
    setForm({ categoryId: String(b.categoryId || ''), amount: String(b.amount) })
    setModal(true)
  }

  const save = async () => {
    if (!form.categoryId || !form.amount) return
    setSaving(true)
    try {
      if (editItem) {
        // PUT /:id — modifie uniquement le montant
        await api.put(`/budgets/${editItem.id}`, { amount: parseFloat(form.amount) })
      } else {
        // POST / — upsert (créer ou mettre à jour par categoryId+month+year)
        await budgetsApi.create({
          categoryId: Number(form.categoryId),
          amount: parseFloat(form.amount),
          month, year,
        })
      }
      setModal(false)
      refetch()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce budget ?')) return
    await budgetsApi.remove(id); refetch()
  }

  const toggleNotif = (b) => {
    // Géré localement (pas de route backend pour notifEnabled)
    // Stocké dans localStorage par id
    const key = `budget-notif-${b.id}`
    const current = localStorage.getItem(key) !== 'false'
    localStorage.setItem(key, current ? 'false' : 'true')
    refetch() // force re-render
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={{ paddingBottom:90 }}>
      <Header title="Budget"/>
      <div style={{ padding:'12px 16px' }}>

        <MonthPicker month={month} setMonth={setMonth} months={MONTHS}/>

        {/* Notifications locales */}
        {notifs.map(n => (
          <div key={n.id} style={{
            display:'flex', alignItems:'flex-start', gap:10,
            background: n.threshold.bg, borderRadius:12,
            padding:'10px 14px', marginBottom:10,
            border:`1px solid ${n.threshold.color}40`,
          }}>
            <AlertTriangle size={16} color={n.threshold.color} style={{ flexShrink:0, marginTop:1 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color: n.threshold.color }}>
                {n.threshold.label}
              </div>
              <div style={{ fontSize:12, color:'#666', marginTop:2 }}>
                {n.budget.category?.name} — {pct(n.budget.spent, n.budget.amount)}% utilisé
                ({fmt(n.budget.spent)} / {fmt(n.budget.amount)})
              </div>
            </div>
            <button onClick={() => setNotifs(prev => prev.filter(x => x.id !== n.id))}
              style={{ background:'none', border:'none', cursor:'pointer',
                color:'#aaa', fontSize:16, lineHeight:1, padding:0 }}>×</button>
          </div>
        ))}

        {/* Carte résumé global */}
        {list.length > 0 && (
          <div style={{ background:'#6C5CE7', borderRadius:16, padding:16, marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, color:'#AFA9EC', fontWeight:600,
                  textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>
                  Budget global · {MONTHS[month-1]}
                </div>
                <div style={{ fontSize:26, fontWeight:800, color:'#fff' }}>
                  {fmt(totalSpent)}
                  <span style={{ fontSize:14, fontWeight:400, color:'#AFA9EC', marginLeft:6 }}>
                    / {fmt(totalBudget)}
                  </span>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:22, fontWeight:800,
                  color: globalPct >= 90 ? '#FAC775' : '#fff' }}>
                  {globalPct}%
                </div>
                <div style={{ fontSize:11, color:'#AFA9EC' }}>
                  {fmt(Math.max(0, totalBudget - totalSpent))} restant
                </div>
              </div>
            </div>
            <div style={{ height:6, background:'rgba(255,255,255,0.2)', borderRadius:3, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:3,
                width:`${Math.min(100, globalPct)}%`,
                background: globalPct >= 90 ? '#FAC775' : '#fff',
                transition:'width 0.5s',
              }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
              <span style={{ fontSize:11, color:'#AFA9EC' }}>
                {list.length} catégorie{list.length > 1 ? 's' : ''}
                {list.filter(b => pct(b.spent, b.amount) >= 90).length > 0 && (
                  <span style={{ color:'#FAC775', marginLeft:8 }}>
                    · {list.filter(b => pct(b.spent, b.amount) >= 90).length} en alerte
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Bouton sync */}
        <button onClick={sync} disabled={syncing} style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          padding:11, borderRadius:14, marginBottom:14,
          background:'#f7f6fd', border:'1.5px solid #EEEDFE',
          color:'#6C5CE7', fontWeight:700, fontSize:13,
          cursor: syncing ? 'not-allowed' : 'pointer',
          opacity: syncing ? 0.7 : 1,
        }}>
          <RefreshCw size={15} strokeWidth={2}
            style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }}/>
          {syncing ? 'Synchronisation...' : 'Synchroniser avec les dépenses'}
        </button>

        {/* Message sync */}
        {syncMsg && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background: syncMsg.ok ? '#E1F5EE' : '#FCEBEB',
            borderRadius:12, padding:'10px 14px', marginBottom:12,
          }}>
            <CheckCircle size={15} color={syncMsg.ok ? '#0F6E56' : '#E24B4A'}/>
            <span style={{ fontSize:13, fontWeight:600,
              color: syncMsg.ok ? '#0F6E56' : '#E24B4A' }}>{syncMsg.text}</span>
          </div>
        )}

        {/* Liste budgets */}
        {list.length === 0 ? (
          <div style={{ textAlign:'center', color:'#ccc', padding:'40px 0' }}>
            <Target size={36} color="#e0e0e0" style={{ margin:'0 auto 10px', display:'block' }}/>
            <div style={{ fontSize:14, marginBottom:6 }}>Aucun budget ce mois</div>
            <div style={{ fontSize:12 }}>Appuyez sur + pour en créer un</div>
          </div>
        ) : (
          list
            .sort((a, b) => pct(b.spent, b.amount) - pct(a.spent, a.amount))
            .map(b => (
              <BudgetCard key={b.id} b={b}
                onEdit={openEdit} onRemove={remove} onToggleNotif={toggleNotif}/>
            ))
        )}
      </div>

      {/* FAB */}
      <button onClick={openCreate} style={{
        position:'fixed', bottom:84, right:20,
        width:52, height:52, borderRadius:26,
        background:'#6C5CE7', border:'none', color:'#fff', cursor:'pointer',
        boxShadow:'0 4px 14px rgba(108,92,231,0.45)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:15,
      }}>
        <Plus size={24} strokeWidth={2.5}/>
      </button>

      {/* Modal */}
      {modal && (
        <Modal title={editItem ? 'Modifier le budget' : 'Nouveau budget'}
          onClose={() => setModal(false)}>
          <div style={{ overflowY:'auto', maxHeight:'60vh', paddingRight:4 }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#888',
                textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:8 }}>
                Catégorie de dépense
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {expCats.map(c => {
                  const active = String(form.categoryId) === String(c.id)
                  const color  = c.color || '#6C5CE7'
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setForm(p => ({ ...p, categoryId: String(c.id) }))}
                      style={{
                        display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                        padding:'10px 4px', borderRadius:12, cursor:'pointer',
                        border:`1.5px solid ${active ? color : '#eee'}`,
                        background: active ? color + '15' : '#fafafa',
                      }}>
                      <LucideIcon name={c.icon} size={18} color={active ? color : '#bbb'} strokeWidth={1.8}/>
                      <span style={{ fontSize:11, fontWeight:600,
                        color: active ? color : '#888' }}>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <Input label="Montant du budget (Ar)" type="number" placeholder="100 000"
              value={form.amount} onChange={set('amount')}/>
            <div style={{ background:'#f7f6fd', borderRadius:10, padding:'10px 12px',
              fontSize:12, color:'#534AB7' }}>
              Vous recevrez une alerte à 75%, 90% et 100% du budget.
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:12,
            paddingTop:12, borderTop:'0.5px solid #f0f0f0' }}>
            <button onClick={() => setModal(false)} style={{
              flex:1, padding:12, borderRadius:12, cursor:'pointer',
              background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888',
            }}>Annuler</button>
            <button onClick={save} disabled={saving} style={{
              flex:2, padding:12, borderRadius:12,
              background: saving ? '#a09bda' : '#6C5CE7',
              border:'none', fontWeight:700, fontSize:14, color:'#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Enregistrement...' : editItem ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}