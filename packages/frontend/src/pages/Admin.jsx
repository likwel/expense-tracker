import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Users, Building2, CreditCard, BarChart2,
  Check, X, Eye, Trash2, Ban, RefreshCw, Search,
  ChevronDown, AlertTriangle, CheckCircle, LogOut,
  TrendingUp, DollarSign, UserCheck, Clock,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

/* ─── Helpers ───────────────────────────────────────────────────── */
const fmtAr  = n => `${Math.round(Number(n||0)).toLocaleString('fr-FR')} Ar`
const fmtD   = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) : '—'
const fmtDT  = d => d ? new Date(d).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

const Badge = ({ label, color }) => {
  const colors = {
    green:  { bg:'#E1F5EE', text:'#0F6E56' },
    red:    { bg:'#FCEBEB', text:'#A32D2D' },
    orange: { bg:'#FFF3E0', text:'#E65100' },
    purple: { bg:'#EEEDFE', text:'#534AB7' },
    gray:   { bg:'#f5f5f5', text:'#666'    },
  }
  const c = colors[color] || colors.gray
  return (
    <span style={{
      fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
      background:c.bg, color:c.text,
    }}>{label}</span>
  )
}

const STATUS_COLOR = { pending:'orange', approved:'green', rejected:'red' }
const PLAN_COLOR   = { pro:'purple', free:'gray' }

/* ─── Stat card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = '#6C5CE7' }) {
  return (
    <div style={{
      background:'#fff', borderRadius:12, padding:'14px 16px',
      border:'1px solid #f0f0f0', display:'flex', alignItems:'center', gap:12,
    }}>
      <div style={{
        width:40, height:40, borderRadius:10, flexShrink:0,
        background: color + '18',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <Icon size={18} color={color} strokeWidth={2}/>
      </div>
      <div>
        <div style={{ fontSize:11, color:'#aaa', marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:20, fontWeight:800, color:'#222', lineHeight:1 }}>{value}</div>
        {sub && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Confirm dialog ────────────────────────────────────────────── */
function Confirm({ msg, onOk, onCancel, danger }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.4)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:340, width:'100%' }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#222', marginBottom:16, lineHeight:1.5 }}>{msg}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCancel} style={{
            flex:1, padding:10, borderRadius:8, border:'1px solid #eee',
            background:'#fafafa', cursor:'pointer', fontWeight:600, fontSize:13, color:'#888',
          }}>Annuler</button>
          <button onClick={onOk} style={{
            flex:2, padding:10, borderRadius:8, border:'none', cursor:'pointer',
            background: danger ? '#E24B4A' : '#6C5CE7',
            fontWeight:700, fontSize:13, color:'#fff',
          }}>Confirmer</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, ok }) {
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      zIndex:300, display:'flex', alignItems:'center', gap:8,
      background: ok ? '#0F6E56' : '#A32D2D',
      color:'#fff', borderRadius:10, padding:'10px 18px',
      fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
      whiteSpace:'nowrap',
    }}>
      {ok ? <CheckCircle size={15}/> : <AlertTriangle size={15}/>}
      {msg}
    </div>
  )
}

/* ─── Section : Paiements ───────────────────────────────────────── */
function PaymentsSection({ toast }) {
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('pending')
  const [confirm,  setConfirm]  = useState(null)  // { id, action }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/payments', { params: { status: filter } })
      setRequests(data)
    } catch { toast(false, 'Erreur chargement paiements') }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleAction = async (id, action) => {
    try {
      await api.post(`/admin/payments/${id}/${action}`)
      toast(true, action === 'approve' ? 'Paiement approuvé — plan Pro activé' : 'Paiement rejeté')
      load()
    } catch (e) {
      toast(false, e.response?.data?.error || 'Erreur')
    }
    setConfirm(null)
  }

  const FILTERS = ['pending','approved','rejected','all']

  return (
    <div>
      {confirm && (
        <Confirm
          msg={confirm.action === 'approve'
            ? `Approuver ce paiement et activer le plan Pro pour cet utilisateur ?`
            : `Rejeter ce paiement ?`}
          danger={confirm.action === 'reject'}
          onOk={() => handleAction(confirm.id, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Filtres */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'5px 14px', borderRadius:20, border:'1px solid #eee',
            background: filter===f ? '#6C5CE7' : '#fafafa',
            color: filter===f ? '#fff' : '#888',
            fontSize:12, fontWeight:600, cursor:'pointer',
          }}>
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : 'Rejetés'}
          </button>
        ))}
        <button onClick={load} style={{
          marginLeft:'auto', padding:'5px 12px', borderRadius:20,
          border:'1px solid #eee', background:'#fafafa', cursor:'pointer',
        }}>
          <RefreshCw size={13} color="#aaa"/>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Chargement...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>
          Aucune demande {filter !== 'all' ? `"${filter}"` : ''}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {requests.map(r => (
            <div key={r.id} style={{
              background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'14px 16px',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'#222', marginBottom:2 }}>
                    {r.user?.name || '—'}
                    <span style={{ fontSize:12, color:'#aaa', fontWeight:400, marginLeft:6 }}>
                      {r.user?.email}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                    <Badge label={r.operator?.toUpperCase() || 'Mobile'} color="purple"/>
                    <Badge label={`${r.months} mois`} color="gray"/>
                    <Badge label={fmtAr(r.amount)} color="green"/>
                    <Badge label={r.status} color={STATUS_COLOR[r.status]}/>
                  </div>
                </div>
                <div style={{ fontSize:11, color:'#bbb', flexShrink:0 }}>{fmtDT(r.createdAt)}</div>
              </div>

              {r.senderNumber && (
                <div style={{ fontSize:12, color:'#666', marginBottom:8 }}>
                  Envoyé depuis : <strong>{r.senderNumber}</strong>
                </div>
              )}

              {/* Justificatif */}
              {r.justificatif && (
                <a
                  href={`${import.meta.env.VITE_API_URL}/uploads/justificatifs/${r.justificatif}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    fontSize:12, color:'#6C5CE7', fontWeight:600,
                    textDecoration:'none', marginBottom:10,
                    padding:'4px 10px', borderRadius:6, background:'#EEEDFE',
                  }}
                >
                  <Eye size={12}/> Voir le justificatif
                </a>
              )}

              {/* Actions */}
              {r.status === 'pending' && (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setConfirm({ id:r.id, action:'approve' })} style={{
                    flex:1, padding:'8px 0', borderRadius:8, border:'none', cursor:'pointer',
                    background:'#0F6E56', color:'#fff', fontWeight:700, fontSize:12,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                  }}>
                    <Check size={13}/>Approuver
                  </button>
                  <button onClick={() => setConfirm({ id:r.id, action:'reject' })} style={{
                    flex:1, padding:'8px 0', borderRadius:8, border:'1px solid #F09595', cursor:'pointer',
                    background:'transparent', color:'#E24B4A', fontWeight:700, fontSize:12,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                  }}>
                    <X size={13}/>Rejeter
                  </button>
                </div>
              )}
              {r.status === 'approved' && (
                <div style={{ fontSize:11, color:'#0F6E56', fontWeight:600 }}>
                  ✓ Approuvé le {fmtD(r.approvedAt)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Section : Utilisateurs ────────────────────────────────────── */
function UsersSection({ toast }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [query,   setQuery]   = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/users', { params: { q: query } })
      setUsers(data)
    } catch { toast(false, 'Erreur chargement utilisateurs') }
    finally { setLoading(false) }
  }, [query])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const handleAction = async (id, action, extra) => {
    try {
      await api.post(`/admin/users/${id}/${action}`, extra || {})
      toast(true, {
        ban:     'Utilisateur suspendu',
        unban:   'Utilisateur réactivé',
        delete:  'Utilisateur supprimé',
        promote: 'Promu admin',
        setPro:  'Plan Pro activé',
        setFree: 'Plan Free activé',
      }[action] || 'Action effectuée')
      load()
    } catch (e) { toast(false, e.response?.data?.error || 'Erreur') }
    setConfirm(null)
  }

  return (
    <div>
      {confirm && (
        <Confirm
          msg={confirm.msg}
          danger={confirm.danger}
          onOk={() => handleAction(confirm.id, confirm.action, confirm.extra)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Recherche */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background:'#fff', border:'1px solid #f0f0f0', borderRadius:10,
        padding:'8px 12px', marginBottom:14,
      }}>
        <Search size={14} color="#bbb"/>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          style={{ border:'none', outline:'none', fontSize:13, color:'#222', flex:1, background:'none' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Chargement...</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {users.map(u => (
            <div key={u.id} style={{
              background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'12px 14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                {/* Avatar */}
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0, background:'#EEEDFE',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:13, color:'#6C5CE7',
                }}>
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#222', display:'flex', alignItems:'center', gap:6 }}>
                    {u.name}
                    {u.role === 'admin' && <Badge label="admin" color="purple"/>}
                    {u.isBanned && <Badge label="suspendu" color="red"/>}
                  </div>
                  <div style={{ fontSize:11, color:'#aaa' }}>{u.email}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <Badge label={u.plan || 'free'} color={PLAN_COLOR[u.plan] || 'gray'}/>
                  <div style={{ fontSize:10, color:'#bbb', marginTop:3 }}>{fmtD(u.createdAt)}</div>
                </div>
              </div>

              <div style={{ fontSize:11, color:'#aaa', marginBottom:8 }}>
                Devise : {u.currency} · {u.usageType} · {u.planEndAt ? `Pro jusqu'au ${fmtD(u.planEndAt)}` : 'Pas de plan actif'}
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {u.plan !== 'pro' ? (
                  <button onClick={() => setConfirm({ id:u.id, action:'setPro', extra:{ months:1 }, msg:`Activer le plan Pro (1 mois) pour ${u.name} ?`, danger:false })} style={{
                    padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer',
                    background:'#EEEDFE', color:'#6C5CE7', fontSize:11, fontWeight:700,
                  }}>Pro 1 mois</button>
                ) : (
                  <button onClick={() => setConfirm({ id:u.id, action:'setFree', msg:`Rétrograder ${u.name} au plan Free ?`, danger:true })} style={{
                    padding:'5px 10px', borderRadius:6, border:'1px solid #eee', cursor:'pointer',
                    background:'#fafafa', color:'#888', fontSize:11, fontWeight:600,
                  }}>→ Free</button>
                )}
                {!u.isBanned ? (
                  <button onClick={() => setConfirm({ id:u.id, action:'ban', msg:`Suspendre le compte de ${u.name} ?`, danger:true })} style={{
                    padding:'5px 10px', borderRadius:6, border:'1px solid #F09595', cursor:'pointer',
                    background:'transparent', color:'#E24B4A', fontSize:11, fontWeight:700,
                  }}>Suspendre</button>
                ) : (
                  <button onClick={() => setConfirm({ id:u.id, action:'unban', msg:`Réactiver le compte de ${u.name} ?`, danger:false })} style={{
                    padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer',
                    background:'#E1F5EE', color:'#0F6E56', fontSize:11, fontWeight:700,
                  }}>Réactiver</button>
                )}
                {u.role !== 'admin' && (
                  <button onClick={() => setConfirm({ id:u.id, action:'promote', msg:`Promouvoir ${u.name} en admin ?`, danger:false })} style={{
                    padding:'5px 10px', borderRadius:6, border:'1px solid #eee', cursor:'pointer',
                    background:'#fafafa', color:'#888', fontSize:11, fontWeight:600,
                  }}>→ Admin</button>
                )}
                <button onClick={() => setConfirm({ id:u.id, action:'delete', msg:`Supprimer définitivement ${u.name} ? Cette action est irréversible.`, danger:true })} style={{
                  padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer',
                  background:'#FCEBEB', color:'#E24B4A', fontSize:11, fontWeight:700,
                }}>
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

/* ─── Section : Organisations ───────────────────────────────────── */
function OrgsSection({ toast }) {
  const [orgs,    setOrgs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [query,   setQuery]   = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/organizations', { params: { q: query } })
      setOrgs(data)
    } catch { toast(false, 'Erreur chargement organisations') }
    finally { setLoading(false) }
  }, [query])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const handleAction = async (id, action) => {
    try {
      await api.post(`/admin/organizations/${id}/${action}`)
      toast(true, { suspend:'Organisation suspendue', activate:'Organisation réactivée', delete:'Organisation supprimée' }[action])
      load()
    } catch (e) { toast(false, e.response?.data?.error || 'Erreur') }
    setConfirm(null)
  }

  const STATUS_BADGE = { active:'green', suspended:'orange', closed:'red' }

  return (
    <div>
      {confirm && (
        <Confirm
          msg={confirm.msg} danger={confirm.danger}
          onOk={() => handleAction(confirm.id, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background:'#fff', border:'1px solid #f0f0f0', borderRadius:10,
        padding:'8px 12px', marginBottom:14,
      }}>
        <Search size={14} color="#bbb"/>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher une organisation..."
          style={{ border:'none', outline:'none', fontSize:13, color:'#222', flex:1, background:'none' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Chargement...</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {orgs.map(o => (
            <div key={o.id} style={{
              background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'12px 14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background: o.type === 'business' ? '#FFF3E0' : '#E1F5EE',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Building2 size={16} color={o.type === 'business' ? '#E65100' : '#0F6E56'}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#222', display:'flex', alignItems:'center', gap:6 }}>
                    {o.name}
                    <Badge label={o.type} color={o.type === 'business' ? 'orange' : 'green'}/>
                    <Badge label={o.status} color={STATUS_BADGE[o.status]}/>
                  </div>
                  <div style={{ fontSize:11, color:'#aaa' }}>
                    Fondateur : {o.founder?.name} · {o._count?.members ?? 0} membre(s) · {fmtD(o.createdAt)}
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', gap:6 }}>
                {o.status === 'active' ? (
                  <button onClick={() => setConfirm({ id:o.id, action:'suspend', msg:`Suspendre l'organisation "${o.name}" ?`, danger:true })} style={{
                    padding:'5px 10px', borderRadius:6, border:'1px solid #F09595', cursor:'pointer',
                    background:'transparent', color:'#E24B4A', fontSize:11, fontWeight:700,
                  }}>Suspendre</button>
                ) : (
                  <button onClick={() => setConfirm({ id:o.id, action:'activate', msg:`Réactiver "${o.name}" ?`, danger:false })} style={{
                    padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer',
                    background:'#E1F5EE', color:'#0F6E56', fontSize:11, fontWeight:700,
                  }}>Réactiver</button>
                )}
                <button onClick={() => setConfirm({ id:o.id, action:'delete', msg:`Supprimer définitivement "${o.name}" ?`, danger:true })} style={{
                  padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer',
                  background:'#FCEBEB', color:'#E24B4A', fontSize:11, fontWeight:700,
                }}>
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

/* ─── Section : Statistiques ────────────────────────────────────── */
function StatsSection({ toast }) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(() => toast(false, 'Erreur chargement stats'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign:'center', padding:32, color:'#aaa', fontSize:13 }}>Chargement...</div>
  if (!stats)  return null

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        <StatCard icon={Users}      label="Utilisateurs"     value={stats.totalUsers}     sub={`+${stats.newUsersThisMonth} ce mois`} color="#6C5CE7"/>
        <StatCard icon={UserCheck}  label="Abonnés Pro"      value={stats.proUsers}        sub={`${stats.trialUsers} en essai`}         color="#0F6E56"/>
        <StatCard icon={Building2}  label="Organisations"    value={stats.totalOrgs}       sub={`${stats.activeOrgs} actives`}          color="#E87000"/>
        <StatCard icon={Clock}      label="Paiements en att" value={stats.pendingPayments} sub="à valider"                              color="#E24B4A"/>
      </div>

      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'14px 16px', marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
          Revenus (paiements approuvés)
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            { label:'Ce mois',    value: fmtAr(stats.revenueThisMonth)  },
            { label:'Ce trimestre', value: fmtAr(stats.revenueThisQuarter) },
            { label:'Total',      value: fmtAr(stats.revenueTotal)      },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#aaa', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:14, fontWeight:800, color:'#222' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f0f0f0', padding:'14px 16px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
          Répartition des plans
        </div>
        {[
          { label:'Gratuit',    count: stats.freeUsers,  color:'#aaa',    pct: stats.totalUsers ? Math.round(stats.freeUsers/stats.totalUsers*100) : 0 },
          { label:'Pro actif',  count: stats.proUsers,   color:'#6C5CE7', pct: stats.totalUsers ? Math.round(stats.proUsers/stats.totalUsers*100)  : 0 },
          { label:'Essai',      count: stats.trialUsers, color:'#0F6E56', pct: stats.totalUsers ? Math.round(stats.trialUsers/stats.totalUsers*100) : 0 },
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

/* ─── Page Admin principale ─────────────────────────────────────── */
const SECTIONS = [
  { id:'payments', label:'Paiements',      icon: CreditCard,  badge: 'pending' },
  { id:'users',    label:'Utilisateurs',   icon: Users                          },
  { id:'orgs',     label:'Organisations',  icon: Building2                      },
  { id:'stats',    label:'Statistiques',   icon: BarChart2                      },
]

export default function AdminPage() {
  const navigate       = useNavigate()
  const { user, logout } = useAuth()
  const [section,  setSection]  = useState('payments')
  const [toast,    setToast]    = useState(null)
  const [pending,  setPending]  = useState(0)

  // Vérification accès admin côté front
  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/', { replace: true })
  }, [user, navigate])

  // Compteur paiements en attente
  useEffect(() => {
    api.get('/admin/payments/count')
      .then(({ data }) => setPending(data.pending || 0))
      .catch(() => {})
  }, [])

  const showToast = (ok, msg) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3500)
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div style={{ minHeight:'100vh', background:'#f7f7f9' }}>
      {toast && <Toast ok={toast.ok} msg={toast.msg}/>}

      {/* Header */}
      <div style={{
        background:'#fff', borderBottom:'1px solid #f0f0f0',
        padding:'0 20px', position:'sticky', top:0, zIndex:50,
        display:'flex', alignItems:'center', gap:12, height:54,
      }}>
        <div style={{
          width:32, height:32, borderRadius:8, background:'#6C5CE7',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>
          <ShieldCheck size={17} color="#fff" strokeWidth={2.5}/>
        </div>
        <span style={{ fontWeight:800, fontSize:16, color:'#222', flex:1 }}>Super Admin</span>
        <span style={{ fontSize:12, color:'#aaa' }}>{user.email}</span>
        <button onClick={logout} style={{
          background:'none', border:'none', cursor:'pointer', color:'#aaa', padding:4,
        }}>
          <LogOut size={17}/>
        </button>
      </div>

      {/* Nav tabs */}
      <div style={{
        background:'#fff', borderBottom:'1px solid #f0f0f0',
        padding:'0 16px', display:'flex', gap:0, overflowX:'auto',
      }}>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSection(id)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'12px 16px',
            border:'none', background:'none', cursor:'pointer', fontSize:13,
            fontWeight: section===id ? 700 : 500,
            color: section===id ? '#6C5CE7' : '#888',
            borderBottom: section===id ? '2px solid #6C5CE7' : '2px solid transparent',
            whiteSpace:'nowrap', position:'relative',
          }}>
            <Icon size={14} strokeWidth={2}/>
            {label}
            {id==='payments' && pending > 0 && (
              <span style={{
                minWidth:16, height:16, borderRadius:20, background:'#E24B4A',
                color:'#fff', fontSize:10, fontWeight:700, padding:'0 4px',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>{pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{ padding:'16px', maxWidth:720, margin:'0 auto' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>
          {SECTIONS.find(s => s.id === section)?.label}
        </div>
        {section === 'payments' && <PaymentsSection toast={showToast}/>}
        {section === 'users'    && <UsersSection    toast={showToast}/>}
        {section === 'orgs'     && <OrgsSection     toast={showToast}/>}
        {section === 'stats'    && <StatsSection    toast={showToast}/>}
      </div>
    </div>
  )
}