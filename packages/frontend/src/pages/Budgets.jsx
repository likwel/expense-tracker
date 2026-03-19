import { useState } from 'react'
import { Target, Plus, AlertTriangle } from 'lucide-react'
import Header       from '../components/layout/Header'
import Card         from '../components/ui/Card'
import Button       from '../components/ui/Button'
import Modal        from '../components/ui/Modal'
import Input        from '../components/ui/Input'
import ProgressBar  from '../components/ui/ProgressBar'
import { fmt, pct, MONTHS } from '../utils/format'
import { useApi }   from '../hooks/useApi'
import { budgetsApi } from '../services/api'

const now = new Date()

export default function Budgets() {
  const [month, setMonth] = useState(now.getMonth()+1)
  const [year]            = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ categoryId:'', amount:'', month, year })
  const [saving,setSaving]= useState(false)

  const { data: budgets, refetch } = useApi('/budgets',    { month, year })
  const { data: cats }             = useApi('/categories')

  const list    = budgets || []
  const expCats = (cats||[]).filter(c => c.type === 'expense')

  const save = async () => {
    if (!form.categoryId || !form.amount) return
    setSaving(true)
    try {
      await budgetsApi.create({ ...form, month, year })
      setModal(false)
      setForm({ categoryId:'', amount:'', month, year })
      refetch()
    } catch(e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce budget ?')) return
    await budgetsApi.remove(id)
    refetch()
  }

  return (
    <div>
      <Header title="Budget"/>
      <div style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', gap:8, marginBottom:12, overflowX:'auto', paddingBottom:4 }}>
          {MONTHS.map((m,i) => (
            <button key={i} onClick={()=>setMonth(i+1)} style={{
              flexShrink:0, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
              background: month===i+1 ? '#6C5CE7' : '#fff',
              color:      month===i+1 ? '#fff'     : '#555',
              boxShadow:  month===i+1 ? '0 2px 8px rgba(108,92,231,0.35)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>{m}</button>
          ))}
        </div>

        {list.length === 0
          ? <Card><div style={{ textAlign:'center', color:'#ccc', padding:'24px 0', fontSize:13 }}>
              <Target size={32} color="#e0e0e0" style={{ margin:'0 auto 8px', display:'block' }}/>
              Aucun budget ce mois
            </div></Card>
          : list.map(b => {
            const p = pct(b.spent, Number(b.amount))
            return (
              <Card key={b.id}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, background:(b.category?.color||'#ccc')+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Target size={18} color={b.category?.color||'#888'} strokeWidth={1.8}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#222' }}>{b.category?.name}</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{fmt(b.spent)} / {fmt(b.amount)}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontWeight:700, fontSize:14, color: p>=90?'#e74c3c':'#00b894' }}>{p}%</div>
                    <button onClick={()=>remove(b.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ddd' }}>×</button>
                  </div>
                </div>
                <ProgressBar value={b.spent} max={Number(b.amount)} color={b.category?.color||'#6C5CE7'}/>
                {p>=90 && (
                  <div style={{ marginTop:8, fontSize:11, color:'#e74c3c', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                    <AlertTriangle size={12}/> Budget presque épuisé
                  </div>
                )}
              </Card>
            )
          })
        }

        <Button variant="dashed" fullWidth onClick={()=>setModal(true)}>
          <Plus size={16}/> Ajouter un budget
        </Button>
      </div>

      {modal && (
        <Modal title="Nouveau budget" onClose={()=>setModal(false)}>
          <select value={form.categoryId} onChange={e=>setForm(p=>({...p,categoryId:e.target.value}))}
            style={{ display:'block', width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid #eee', fontSize:14, marginBottom:10, background:'#fafafa', outline:'none' }}>
            <option value="">Catégorie</option>
            {expCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input type="number" placeholder="Montant budget (Ar)" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Button variant="ghost" onClick={()=>setModal(false)} style={{ flex:1 }}>Annuler</Button>
            <Button onClick={save} disabled={saving} style={{ flex:2 }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
