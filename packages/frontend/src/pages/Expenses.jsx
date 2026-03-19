import { useState } from 'react'
import { Plus, Trash2, TrendingDown } from 'lucide-react'
import Header       from '../components/layout/Header'
import Card         from '../components/ui/Card'
import Button       from '../components/ui/Button'
import Modal        from '../components/ui/Modal'
import Input        from '../components/ui/Input'
import { fmt, MONTHS } from '../utils/format'
import { useApi }   from '../hooks/useApi'
import { expensesApi, categoriesApi } from '../services/api'

const now = new Date()

export default function Expenses() {
  const [month, setMonth] = useState(now.getMonth()+1)
  const [year]            = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const { data: expData, refetch } = useApi('/expenses',   { month, year, take:100 })
  const { data: cats }             = useApi('/categories')

  const expenses   = expData?.data || []
  const totalExp   = expenses.reduce((s,e) => s + Number(e.amount), 0)
  const expCats    = (cats||[]).filter(c => c.type === 'expense')

  const save = async () => {
    if (!form.amount || !form.date) return
    setSaving(true)
    try {
      await expensesApi.create({ ...form, amount: parseFloat(form.amount), categoryId: Number(form.categoryId)||null })
      setModal(false)
      setForm({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
      refetch()
    } catch(e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await expensesApi.remove(id)
    refetch()
  }

  return (
    <div>
      <Header title="Dépenses"/>
      <div style={{ padding:'12px 16px' }}>
        {/* Filtre mois */}
        <div style={{ display:'flex', gap:8, marginBottom:12, overflowX:'auto', paddingBottom:4 }}>
          {MONTHS.map((m,i) => (
            <button key={i} onClick={()=>setMonth(i+1)} style={{
              flexShrink:0, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer',
              fontWeight:600, fontSize:13, transition:'all 0.15s',
              background: month===i+1 ? '#6C5CE7' : '#fff',
              color:      month===i+1 ? '#fff'     : '#555',
              boxShadow:  month===i+1 ? '0 2px 8px rgba(108,92,231,0.35)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>{m}</button>
          ))}
        </div>

        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <TrendingDown size={18} color="#e74c3c" strokeWidth={1.8}/>
              <span style={{ fontWeight:700, fontSize:15, color:'#222' }}>Total</span>
            </div>
            <span style={{ fontWeight:800, fontSize:17, color:'#e74c3c' }}>{fmt(totalExp)}</span>
          </div>
          {expenses.length === 0
            ? <div style={{ textAlign:'center', color:'#ccc', padding:'24px 0', fontSize:13 }}>Aucune dépense ce mois</div>
            : expenses.map(e => (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:(e.category?.color||'#ccc')+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:18 }}>•</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'#222', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.description || e.category?.name}</div>
                  <div style={{ fontSize:11, color:'#aaa' }}>{e.category?.name} · {new Date(e.date).toLocaleDateString('fr-FR')}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#e74c3c' }}>{fmt(e.amount)}</div>
                  <button onClick={()=>remove(e.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ddd', padding:0, marginTop:2 }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* FAB */}
      <button onClick={()=>setModal(true)} style={{ position:'fixed', bottom:76, right:'calc(50% - 224px)', width:52, height:52, borderRadius:26, background:'#6C5CE7', border:'none', color:'#fff', cursor:'pointer', boxShadow:'0 4px 14px rgba(108,92,231,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:15 }}>
        <Plus size={24} strokeWidth={2.5}/>
      </button>

      {modal && (
        <Modal title="Nouvelle dépense" onClose={()=>setModal(false)}>
          <select value={form.categoryId} onChange={e=>setForm(p=>({...p,categoryId:e.target.value}))}
            style={{ display:'block', width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid #eee', fontSize:14, marginBottom:10, background:'#fafafa', outline:'none' }}>
            <option value="">Catégorie</option>
            {expCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input type="number" placeholder="Montant (Ar)" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/>
          <Input type="text"   placeholder="Description"  value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
          <Input type="date"   value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Button variant="ghost" onClick={()=>setModal(false)} style={{ flex:1 }}>Annuler</Button>
            <Button onClick={save} disabled={saving} style={{ flex:2, background:'#e74c3c' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
