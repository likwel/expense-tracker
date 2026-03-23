import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Users, Building2, CreditCard, BarChart2,
  Check, X, Eye, Trash2, RefreshCw, Search,
  AlertTriangle, CheckCircle, LogOut, ArrowLeft,
  UserCheck, Clock, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import { useFmt } from '../hooks/useFmt'

/* ─── Helpers ───────────────────────────────────────────────────── */
const fmtAr = n => `${Math.round(Number(n||0)).toLocaleString('fr-FR')} Ar`
const fmtD  = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) : '—'
const fmtDT = d => d ? new Date(d).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'

const Badge = ({ label, color }) => {
  const C = { green:{bg:'#E1F5EE',text:'#0F6E56'}, red:{bg:'#FCEBEB',text:'#A32D2D'}, orange:{bg:'#FFF3E0',text:'#E65100'}, purple:{bg:'#EEEDFE',text:'#534AB7'}, gray:{bg:'#f5f5f5',text:'#666'} }
  const c = C[color] || C.gray
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:c.bg, color:c.text }}>{label}</span>
}

const STATUS_COLOR = { pending:'orange', approved:'green', rejected:'red' }
const PLAN_COLOR   = { pro:'purple', free:'gray' }

/* ─── Stat card ─────────────────────────────────────────────────── */
function StatCard({ icon:Icon, label, value, sub, color='#6C5CE7' }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:'14px', border:'1px solid #f0f0f0', display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={17} color={color} strokeWidth={2}/>
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:11, color:'#aaa', marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#222', lineHeight:1 }}>{value}</div>
        {sub && <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Confirm ───────────────────────────────────────────────────── */
function Confirm({ msg, onOk, onCancel, danger }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:320, width:'100%' }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#222', marginBottom:16, lineHeight:1.5 }}>{msg}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCancel} style={{ flex:1, padding:10, borderRadius:8, border:'1px solid #eee', background:'#fafafa', cursor:'pointer', fontWeight:600, fontSize:13, color:'#888' }}>Annuler</button>
          <button onClick={onOk} style={{ flex:2, padding:10, borderRadius:8, border:'none', cursor:'pointer', background:danger?'#E24B4A':'#6C5CE7', fontWeight:700, fontSize:13, color:'#fff' }}>Confirmer</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, ok }) {
  return (
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:300, display:'flex', alignItems:'center', gap:8, background:ok?'#0F6E56':'#A32D2D', color:'#fff', borderRadius:10, padding:'10px 18px', fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', whiteSpace:'nowrap' }}>
      {ok ? <CheckCircle size={15}/> : <AlertTriangle size={15}/>}
      {msg}
    </div>
  )
}

/* ─── Paiements ─────────────────────────────────────────────────── */
function PaymentsSection({ toast }) {
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('pending')
  const [confirm,  setConfirm]  = useState(null)
  const { fmt } = useFmt()

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/admin/payments', { params:{ status:filter } }); setRequests(data) }
    catch { toast(false, 'Erreur chargement paiements') }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleAction = async (id, action) => {
    try {
      await api.post(`/admin/payments/${id}/${action}`)
      toast(true, action==='approve' ? 'Paiement approuvé — plan Pro activé' : 'Paiement rejeté')
      load()
    } catch (e) { toast(false, e.response?.data?.error || 'Erreur') }
    setConfirm(null)
  }

  return (
    <div>
      {confirm && <Confirm msg={confirm.action==='approve' ? 'Approuver ce paiement et activer le plan Pro ?' : 'Rejeter ce paiement ?'} danger={confirm.action==='reject'} onOk={() => handleAction(confirm.id, confirm.action)} onCancel={() => setConfirm(null)}/>}

      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        {['pending','approved','rejected','all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'5px 12px', borderRadius:20, border:'1px solid #eee', background:filter===f?'#6C5CE7':'#fafafa', color:filter===f?'#fff':'#888', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            {f==='all'?'Tous':f==='pending'?'En attente':f==='approved'?'Approuvés':'Rejetés'}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft:'auto', padding:'5px 10px', borderRadius:20, border:'1px solid #eee', background:'#fafafa', cursor:'pointer' }}>
          <RefreshCw size={12} color="#aaa"/>
        </button>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Chargement...</div>
      : requests.length === 0 ? <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Aucune demande</div>
      : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {requests.map(r => (
            <div key={r.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#222', marginBottom:4 }}>
                    {r.user?.name || '—'}
                  </div>
                  <div style={{ fontSize:11, color:'#aaa', marginBottom:6 }}>{r.user?.email}</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    <Badge label={r.operator?.toUpperCase()||'Mobile'} color="purple"/>
                    <Badge label={`${r.months} mois`} color="gray"/>
                    <Badge label={fmt(r.amount)} color="green"/>
                    <Badge label={r.status} color={STATUS_COLOR[r.status]}/>
                  </div>
                </div>
                <div style={{ fontSize:10, color:'#bbb', flexShrink:0, textAlign:'right' }}>{fmtDT(r.createdAt)}</div>
              </div>

              {r.senderNumber && <div style={{ fontSize:12, color:'#666', marginBottom:8 }}>Envoyé depuis : <strong>{r.senderNumber}</strong></div>}

              {r.justificatif && (
                <a href={`${import.meta.env.VITE_API_URL}/uploads/justificatifs/${r.justificatif}`} target="_blank" rel="noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'#6C5CE7', fontWeight:600, textDecoration:'none', marginBottom:10, padding:'4px 10px', borderRadius:6, background:'#EEEDFE' }}>
                  <Eye size={11}/> Voir le justificatif
                </a>
              )}

              {r.status==='pending' && (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setConfirm({ id:r.id, action:'approve' })} style={{ flex:1, padding:'8px 0', borderRadius:8, border:'none', cursor:'pointer', background:'#0F6E56', color:'#fff', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    <Check size={13}/>Approuver
                  </button>
                  <button onClick={() => setConfirm({ id:r.id, action:'reject' })} style={{ flex:1, padding:'8px 0', borderRadius:8, border:'1px solid #F09595', cursor:'pointer', background:'transparent', color:'#E24B4A', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    <X size={13}/>Rejeter
                  </button>
                </div>
              )}
              {r.status==='approved' && <div style={{ fontSize:11, color:'#0F6E56', fontWeight:600 }}>✓ Approuvé le {fmtD(r.approvedAt)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Utilisateurs ──────────────────────────────────────────────── */
function UsersSection({ toast }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [query,   setQuery]   = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/admin/users', { params:{ q:query } }); setUsers(data) }
    catch { toast(false, 'Erreur chargement utilisateurs') }
    finally { setLoading(false) }
  }, [query])

  useEffect(() => { const t=setTimeout(load,300); return () => clearTimeout(t) }, [load])

  const handleAction = async (id, action, extra) => {
    try {
      await api.post(`/admin/users/${id}/${action}`, extra||{})
      toast(true, { ban:'Suspendu', unban:'Réactivé', delete:'Supprimé', promote:'Promu admin', setPro:'Plan Pro activé', setFree:'Plan Free activé' }[action]||'OK')
      load()
    } catch (e) { toast(false, e.response?.data?.error||'Erreur') }
    setConfirm(null)
  }

  return (
    <div>
      {confirm && <Confirm msg={confirm.msg} danger={confirm.danger} onOk={() => handleAction(confirm.id,confirm.action,confirm.extra)} onCancel={() => setConfirm(null)}/>}

      <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #f0f0f0', borderRadius:10, padding:'8px 12px', marginBottom:14 }}>
        <Search size={13} color="#bbb"/>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom ou email..." style={{ border:'none', outline:'none', fontSize:13, color:'#222', flex:1, background:'none' }}/>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Chargement...</div>
      : users.length === 0 ? <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Aucun utilisateur</div>
      : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {users.map(u => (
            <div key={u.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:'#EEEDFE', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'#6C5CE7' }}>
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#222', display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{u.name}</span>
                    {u.role==='admin' && <Badge label="admin" color="purple"/>}
                    {u.isBanned && <Badge label="suspendu" color="red"/>}
                  </div>
                  <div style={{ fontSize:11, color:'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <Badge label={u.plan||'free'} color={PLAN_COLOR[u.plan]||'gray'}/>
                  <div style={{ fontSize:9, color:'#bbb', marginTop:3 }}>{fmtD(u.createdAt)}</div>
                </div>
              </div>
              <div style={{ fontSize:10, color:'#aaa', marginBottom:8 }}>
                {u.currency} · {u.usageType} · {u.planEndAt ? `Pro jusqu'au ${fmtD(u.planEndAt)}` : 'Plan gratuit'}
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {u.plan!=='pro'
                  ? <button onClick={() => setConfirm({ id:u.id, action:'setPro', extra:{ months:1 }, msg:`Activer Pro 1 mois pour ${u.name} ?`, danger:false })} style={{ padding:'4px 10px', borderRadius:6, border:'none', cursor:'pointer', background:'#EEEDFE', color:'#6C5CE7', fontSize:11, fontWeight:700 }}>Pro 1 mois</button>
                  : <button onClick={() => setConfirm({ id:u.id, action:'setFree', msg:`Rétrograder ${u.name} ?`, danger:true })} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #eee', cursor:'pointer', background:'#fafafa', color:'#888', fontSize:11, fontWeight:600 }}>→ Free</button>
                }
                {!u.isBanned
                  ? <button onClick={() => setConfirm({ id:u.id, action:'ban', msg:`Suspendre ${u.name} ?`, danger:true })} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #F09595', cursor:'pointer', background:'transparent', color:'#E24B4A', fontSize:11, fontWeight:700 }}>Suspendre</button>
                  : <button onClick={() => setConfirm({ id:u.id, action:'unban', msg:`Réactiver ${u.name} ?`, danger:false })} style={{ padding:'4px 10px', borderRadius:6, border:'none', cursor:'pointer', background:'#E1F5EE', color:'#0F6E56', fontSize:11, fontWeight:700 }}>Réactiver</button>
                }
                {u.role!=='admin' && <button onClick={() => setConfirm({ id:u.id, action:'promote', msg:`Promouvoir ${u.name} en admin ?`, danger:false })} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #eee', cursor:'pointer', background:'#fafafa', color:'#888', fontSize:11, fontWeight:600 }}>→ Admin</button>}
                <button onClick={() => setConfirm({ id:u.id, action:'delete', msg:`Supprimer définitivement ${u.name} ?`, danger:true })} style={{ padding:'4px 8px', borderRadius:6, border:'none', cursor:'pointer', background:'#FCEBEB', color:'#E24B4A', fontSize:11, fontWeight:700 }}>
                  <Trash2 size={11}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Organisations ─────────────────────────────────────────────── */
function OrgsSection({ toast }) {
  const [orgs,    setOrgs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [query,   setQuery]   = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/admin/organizations', { params:{ q:query } }); setOrgs(data) }
    catch { toast(false, 'Erreur organisations') }
    finally { setLoading(false) }
  }, [query])

  useEffect(() => { const t=setTimeout(load,300); return () => clearTimeout(t) }, [load])

  const handleAction = async (id, action) => {
    try {
      await api.post(`/admin/organizations/${id}/${action}`)
      toast(true, { suspend:'Suspendue', activate:'Réactivée', delete:'Supprimée' }[action])
      load()
    } catch (e) { toast(false, e.response?.data?.error||'Erreur') }
    setConfirm(null)
  }

  const STATUS_BADGE = { active:'green', suspended:'orange', closed:'red' }

  return (
    <div>
      {confirm && <Confirm msg={confirm.msg} danger={confirm.danger} onOk={() => handleAction(confirm.id,confirm.action)} onCancel={() => setConfirm(null)}/>}

      <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #f0f0f0', borderRadius:10, padding:'8px 12px', marginBottom:14 }}>
        <Search size={13} color="#bbb"/>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom d'organisation..." style={{ border:'none', outline:'none', fontSize:13, color:'#222', flex:1, background:'none' }}/>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Chargement...</div>
      : orgs.length === 0 ? <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Aucune organisation</div>
      : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {orgs.map(o => (
            <div key={o.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:o.type==='business'?'#FFF3E0':'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Building2 size={15} color={o.type==='business'?'#E65100':'#0F6E56'}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#222', display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{o.name}</span>
                    <Badge label={o.type} color={o.type==='business'?'orange':'green'}/>
                    <Badge label={o.status} color={STATUS_BADGE[o.status]}/>
                  </div>
                  <div style={{ fontSize:10, color:'#aaa' }}>{o.founder?.name} · {o._count?.members??0} membre(s) · {fmtD(o.createdAt)}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {o.status==='active'
                  ? <button onClick={() => setConfirm({ id:o.id, action:'suspend', msg:`Suspendre "${o.name}" ?`, danger:true })} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #F09595', cursor:'pointer', background:'transparent', color:'#E24B4A', fontSize:11, fontWeight:700 }}>Suspendre</button>
                  : <button onClick={() => setConfirm({ id:o.id, action:'activate', msg:`Réactiver "${o.name}" ?`, danger:false })} style={{ padding:'4px 10px', borderRadius:6, border:'none', cursor:'pointer', background:'#E1F5EE', color:'#0F6E56', fontSize:11, fontWeight:700 }}>Réactiver</button>
                }
                <button onClick={() => setConfirm({ id:o.id, action:'delete', msg:`Supprimer "${o.name}" définitivement ?`, danger:true })} style={{ padding:'4px 8px', borderRadius:6, border:'none', cursor:'pointer', background:'#FCEBEB', color:'#E24B4A', fontSize:11, fontWeight:700 }}>
                  <Trash2 size={11}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Statistiques ──────────────────────────────────────────────── */
function StatsSection({ toast }) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const { fmt } = useFmt()

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(() => toast(false, 'Erreur stats'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Chargement...</div>
  if (!stats)  return null

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <StatCard icon={Users}     label="Utilisateurs"      value={stats.totalUsers}     sub={`+${stats.newUsersThisMonth} ce mois`} color="#6C5CE7"/>
        <StatCard icon={UserCheck} label="Abonnés Pro"        value={stats.proUsers}       sub={`${stats.trialUsers} en essai`}        color="#0F6E56"/>
        <StatCard icon={Building2} label="Organisations"      value={stats.totalOrgs}      sub={`${stats.activeOrgs} actives`}         color="#E87000"/>
        <StatCard icon={Clock}     label="Paiements en attente" value={stats.pendingPayments} sub="à valider"                          color="#E24B4A"/>
      </div>

      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'14px', marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>Revenus</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[{ label:'Ce mois', value:fmt(stats.revenueThisMonth) }, { label:'Ce trimestre', value:fmt(stats.revenueThisQuarter) }, { label:'Total', value:fmt(stats.revenueTotal) }].map(({ label, value }) => (
            <div key={label} style={{ background:'#f9f9f9', borderRadius:8, padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#aaa', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:13, fontWeight:800, color:'#222' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'14px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>Répartition des plans</div>
        {[
          { label:'Gratuit',   count:stats.freeUsers,  color:'#aaa',    pct:stats.totalUsers?Math.round(stats.freeUsers/stats.totalUsers*100):0 },
          { label:'Pro actif', count:stats.proUsers,   color:'#6C5CE7', pct:stats.totalUsers?Math.round(stats.proUsers/stats.totalUsers*100):0  },
          { label:'Essai',     count:stats.trialUsers, color:'#0F6E56', pct:stats.totalUsers?Math.round(stats.trialUsers/stats.totalUsers*100):0 },
        ].map(({ label, count, color, pct }) => (
          <div key={label} style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:12, color:'#555' }}>{label}</span>
              <span style={{ fontSize:12, fontWeight:700, color }}>{count} ({pct}%)</span>
            </div>
            <div style={{ height:5, background:'#f5f5f5', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4, transition:'width 0.4s' }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Page principale ───────────────────────────────────────────── */
const SECTIONS = [
  { id:'payments', label:'Paiements',     icon: CreditCard },
  { id:'users',    label:'Utilisateurs',  icon: Users      },
  { id:'orgs',     label:'Organisations', icon: Building2  },
  { id:'stats',    label:'Statistiques',  icon: BarChart2  },
]

export default function AdminPage() {
  const navigate         = useNavigate()
  const { user, logout } = useAuth()
  const [section, setSection] = useState('payments')
  const [toast,   setToast]   = useState(null)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/', { replace:true })
  }, [user, navigate])

  useEffect(() => {
    api.get('/admin/payments/count')
      .then(({ data }) => setPending(data.pending||0))
      .catch(() => {})
  }, [])

  const showToast = (ok, msg) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3500) }

  if (!user || user.role !== 'admin') return null

  return (
    <div style={{ minHeight:'100vh', background:'#f7f7f9', paddingBottom:80 }}>
      {toast && <Toast ok={toast.ok} msg={toast.msg}/>}

      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', padding:'0 16px', position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center', gap:10, height:52 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6C5CE7', padding:0, display:'flex', alignItems:'center' }}>
          <ArrowLeft size={20}/>
        </button>
        <div style={{ width:28, height:28, borderRadius:7, background:'#6C5CE7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <ShieldCheck size={15} color="#fff" strokeWidth={2.5}/>
        </div>
        <span style={{ fontWeight:800, fontSize:15, color:'#222', flex:1 }}>Super Admin</span>
        <span style={{ fontSize:11, color:'#aaa', display:'none' }} className="email-label">{user.email}</span>
        <button onClick={logout} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa', padding:4 }}>
          <LogOut size={16}/>
        </button>
      </div>

      {/* Tabs — responsive : icône seule sur mobile, icône + label sur desktop */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', position:'sticky', top:52, zIndex:49 }}>
        <div style={{ display:'flex', overflowX:'auto', scrollbarWidth:'none', msOverflowStyle:'none' }}>
          {SECTIONS.map(({ id, label, icon:Icon }) => (
            <button key={id} onClick={() => setSection(id)} style={{
              flex:1, minWidth:0,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:3, padding:'10px 4px',
              border:'none', background:'none', cursor:'pointer',
              color: section===id ? '#6C5CE7' : '#bbb',
              borderBottom: section===id ? '2px solid #6C5CE7' : '2px solid transparent',
              transition:'all 0.15s', position:'relative',
            }}>
              <div style={{ position:'relative' }}>
                <Icon size={18} strokeWidth={section===id?2.2:1.8}/>
                {id==='payments' && pending>0 && (
                  <span style={{ position:'absolute', top:-4, right:-6, minWidth:14, height:14, borderRadius:10, background:'#E24B4A', color:'#fff', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
                    {pending}
                  </span>
                )}
              </div>
              <span style={{ fontSize:10, fontWeight:section===id?700:400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%', paddingInline:2 }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      <div style={{ padding:'14px 16px', maxWidth:680, margin:'0 auto' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
          {SECTIONS.find(s => s.id===section)?.label}
        </div>
        {section==='payments' && <PaymentsSection toast={showToast}/>}
        {section==='users'    && <UsersSection    toast={showToast}/>}
        {section==='orgs'     && <OrgsSection     toast={showToast}/>}
        {section==='stats'    && <StatsSection    toast={showToast}/>}
      </div>
    </div>
  )
}