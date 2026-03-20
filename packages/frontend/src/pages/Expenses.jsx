import { useState, useMemo } from 'react'
import { Plus, Trash2, TrendingDown, Search, SlidersHorizontal, X, Pencil } from 'lucide-react'
import Header      from '../components/layout/Header'
import Modal       from '../components/ui/Modal'
import Input       from '../components/ui/Input'
import { fmt, MONTHS } from '../utils/format'
import { useApi }  from '../hooks/useApi'
import { expensesApi } from '../services/api'
import api         from '../services/api'
import MonthPicker from '../components/ui/MonthPicker'
import { LucideIcon } from '../utils/iconResolver'

const now = new Date()

const S = {
  card:  { background: '#fff', borderRadius: 16, border: '0.5px solid #eee', marginBottom: 12, overflow: 'hidden' },
  muted: { fontSize: 11, color: '#aaa' },
}

export default function Expenses() {
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [year]                      = useState(now.getFullYear())
  const [modal,      setModal]      = useState(false)
  const [editItem,   setEditItem]   = useState(null)   // null = création, objet = modification
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [form,       setForm]       = useState({
    categoryId: '', amount: '', description: '',
    date: now.toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)

  const { data: expData, refetch } = useApi('/expenses', { month, year, take: 100 })
  const { data: cats }             = useApi('/categories')

  const expenses = expData?.data || []
  const expCats  = (cats || []).filter(c => c.type === 'expense')

  const totalExp  = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const punctual  = expenses.filter(e => !e.isRecurring).reduce((s, e) => s + Number(e.amount), 0)
  const recurring = expenses.filter(e =>  e.isRecurring).reduce((s, e) => s + Number(e.amount), 0)

  const filtered = useMemo(() => expenses.filter(e => {
    const matchSearch = !search ||
      (e.description || e.category?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || String(e.categoryId) === filterCat
    return matchSearch && matchCat
  }), [expenses, search, filterCat])

  const topCats = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      const key = e.category?.name || 'Autre'
      map[key] = (map[key] || 0) + Number(e.amount)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [expenses])

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const openCreate = () => {
    setEditItem(null)
    setForm({ categoryId: '', amount: '', description: '', date: now.toISOString().split('T')[0] })
    setModal(true)
  }

  const openEdit = (e) => {
    setEditItem(e)
    setForm({
      categoryId:  String(e.categoryId || ''),
      amount:      String(e.amount),
      description: e.description || '',
      date:        e.date?.split('T')[0] || now.toISOString().split('T')[0],
    })
    setModal(true)
  }

  const save = async () => {
    if (!form.amount || !form.date) return
    setSaving(true)
    try {
      if (editItem) {
        await api.put(`/expenses/${editItem.id}`, {
          ...form,
          amount:     parseFloat(form.amount),
          categoryId: Number(form.categoryId) || null,
        })
      } else {
        await expensesApi.create({
          ...form,
          amount:     parseFloat(form.amount),
          categoryId: Number(form.categoryId) || null,
        })
      }
      setModal(false)
      refetch()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await expensesApi.remove(id)
    refetch()
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <Header title="Dépenses"/>
      <div style={{ padding: '12px 16px' }}>

        <MonthPicker month={month} setMonth={setMonth} months={MONTHS}/>

        {/* Carte résumé */}
        <div style={{ ...S.card, padding: '16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:'#aaa', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>
                Total {MONTHS[month - 1]}
              </div>
              <div style={{ fontWeight:800, fontSize:24, color:'#E24B4A' }}>{fmt(totalExp)}</div>
            </div>
            <div style={{ width:40, height:40, borderRadius:12, background:'#FCEBEB', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <TrendingDown size={20} color="#E24B4A" strokeWidth={1.8}/>
            </div>
          </div>

          {punctual > 0 && recurring > 0 && totalExp > 0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ height:5, borderRadius:3, background:'#f0f0f0', overflow:'hidden', display:'flex' }}>
                <div style={{ width:`${Math.round((punctual/totalExp)*100)}%`, background:'#E24B4A', transition:'width 0.4s' }}/>
                <div style={{ width:`${Math.round((recurring/totalExp)*100)}%`, background:'#AFA9EC', transition:'width 0.4s' }}/>
              </div>
              <div style={{ display:'flex', gap:12, marginTop:6 }}>
                {[{ label:'Ponctuel', val:punctual, color:'#E24B4A' }, { label:'Récurrent', val:recurring, color:'#6C5CE7' }]
                  .map(({ label, val, color }) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:color }}/>
                      <span style={{ fontSize:11, color:'#aaa' }}>{label}</span>
                      <span style={{ fontSize:11, fontWeight:700, color }}>{fmt(val)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {topCats.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {topCats.map(([name, amt]) => (
                <div key={name}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                    <span style={{ color:'#555', fontWeight:500 }}>{name}</span>
                    <span style={{ color:'#E24B4A', fontWeight:700 }}>{fmt(amt)}</span>
                  </div>
                  <div style={{ height:4, borderRadius:2, background:'#f5f5f5', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:2, background:'#E24B4A',
                      width:`${Math.round((amt/totalExp)*100)}%`,
                      opacity: 0.6 + (amt/totalExp)*0.4 }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recherche + filtre */}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'#fff', borderRadius:12, padding:'0 12px', border:'0.5px solid #eee' }}>
            <Search size={14} color="#bbb"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              style={{ border:'none', outline:'none', fontSize:13, color:'#222', flex:1, padding:'10px 0', background:'none' }}/>
            {search && (
              <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', padding:0 }}>
                <X size={13}/>
              </button>
            )}
          </div>
          <button onClick={() => setShowFilter(v => !v)} style={{
            width:40, height:40, borderRadius:12, cursor:'pointer',
            background: showFilter ? '#E24B4A' : '#fff',
            display:'flex', alignItems:'center', justifyContent:'center', border:'0.5px solid #eee',
          }}>
            <SlidersHorizontal size={15} color={showFilter ? '#fff' : '#aaa'}/>
          </button>
        </div>

        {showFilter && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
            <button onClick={() => setFilterCat('')} style={{
              padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              background: !filterCat ? '#E24B4A' : '#f5f5f5', color: !filterCat ? '#fff' : '#888',
            }}>Tous</button>
            {expCats.map(c => (
              <button key={c.id} onClick={() => setFilterCat(String(c.id))} style={{
                padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                background: filterCat===String(c.id) ? '#E24B4A' : '#f5f5f5',
                color:      filterCat===String(c.id) ? '#fff'    : '#888',
              }}>{c.name}</button>
            ))}
          </div>
        )}

        {/* Liste */}
        <div style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:'0.5px solid #f5f5f5' }}>
            <span style={{ fontWeight:700, fontSize:14, color:'#222' }}>
              Transactions
              {filtered.length !== expenses.length && (
                <span style={{ fontSize:11, color:'#aaa', fontWeight:400, marginLeft:6 }}>
                  ({filtered.length} / {expenses.length})
                </span>
              )}
            </span>
            <span style={{ fontWeight:700, fontSize:14, color:'#E24B4A' }}>
              {fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', color:'#ccc', padding:'32px 0', fontSize:13 }}>
              {search || filterCat ? 'Aucun résultat' : 'Aucune dépense ce mois'}
            </div>
          ) : filtered.map((e, idx) => {
            const color = e.category?.color || '#E24B4A'
            return (
              <div key={e.id} style={{
                display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                borderBottom: idx < filtered.length-1 ? '0.5px solid #f9f9f9' : 'none',
              }}>
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
                    <span style={{ ...S.muted }}>
                      {new Date(e.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                    </span>
                    {e.isRecurring && (
                      <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:20, background:'#EEEDFE', color:'#6C5CE7' }}>
                        auto
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#E24B4A', marginBottom:4 }}>
                    -{fmt(e.amount)}
                  </div>
                  {/* Actions */}
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button onClick={() => openEdit(e)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb', padding:0, transition:'color 0.15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.color = '#6C5CE7'}
                      onMouseLeave={ev => ev.currentTarget.style.color = '#bbb'}>
                      <Pencil size={13}/>
                    </button>
                    <button onClick={() => remove(e.id)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#e0e0e0', padding:0, transition:'color 0.15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.color = '#E24B4A'}
                      onMouseLeave={ev => ev.currentTarget.style.color = '#e0e0e0'}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* FAB */}
      <button onClick={openCreate} style={{
        position:'fixed', bottom:84, right:20,
        width:52, height:52, borderRadius:26,
        background:'#E24B4A', border:'none', color:'#fff', cursor:'pointer',
        boxShadow:'0 4px 14px rgba(226,75,74,0.40)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:15,
      }}>
        <Plus size={24} strokeWidth={2.5}/>
      </button>

      {/* Modal création / modification */}
      {modal && (
        <Modal title={editItem ? 'Modifier la dépense' : 'Nouvelle dépense'} onClose={() => setModal(false)}>
          <div style={{ overflowY:'auto', maxHeight:'60vh', paddingRight:4 }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:8 }}>
                Catégorie
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {expCats.map(c => {
                  const active = String(form.categoryId) === String(c.id)
                  const color  = c.color || '#E24B4A'
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setForm(p => ({ ...p, categoryId: String(c.id) }))}
                      style={{
                        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                        padding:'10px 4px', borderRadius:12, cursor:'pointer',
                        border:`1.5px solid ${active ? color : '#eee'}`,
                        background: active ? color+'15' : '#fafafa', transition:'all 0.15s',
                      }}>
                      <LucideIcon name={c.icon} size={20} color={active ? color : '#bbb'} strokeWidth={1.8}/>
                      <span style={{ fontSize:11, fontWeight:600, color: active ? color : '#888' }}>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <Input type="number" placeholder="Montant (Ar)" value={form.amount} onChange={set('amount')}/>
            <Input type="text"   placeholder="Description (optionnel)" value={form.description} onChange={set('description')}/>
            <Input type="date"   value={form.date} onChange={set('date')}/>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:12, paddingTop:12, borderTop:'0.5px solid #f0f0f0' }}>
            <button onClick={() => setModal(false)} style={{
              flex:1, padding:12, borderRadius:12, cursor:'pointer',
              background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888',
            }}>Annuler</button>
            <button onClick={save} disabled={saving} style={{
              flex:2, padding:12, borderRadius:12, cursor:saving?'not-allowed':'pointer',
              background: saving ? '#f0a0a0' : '#E24B4A',
              border:'none', fontWeight:700, fontSize:14, color:'#fff',
            }}>
              {saving ? 'Enregistrement...' : editItem ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}