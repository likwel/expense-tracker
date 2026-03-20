import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Zap, Check, X, TrendingDown, RefreshCw,
  Target, BarChart2, Download, Globe, AlertTriangle, CheckCircle
} from 'lucide-react'
import { usePlan } from '../../hooks/usePlan'
import api from '../../utils/api'

const FEATURES = [
  { icon: TrendingDown, label: 'Transactions / mois', free: '30',      pro: 'Illimité' },
  { icon: Target,       label: 'Catégories',           free: '3',       pro: 'Illimité' },
  { icon: Target,       label: 'Budgets',               free: false,     pro: true        },
  { icon: RefreshCw,    label: 'Récurrents',             free: false,     pro: true        },
  { icon: BarChart2,    label: 'Rapports avancés',       free: 'Basique', pro: 'Complet'  },
  { icon: Download,     label: 'Export CSV',             free: false,     pro: true        },
  { icon: Globe,        label: 'Multi-devises',          free: false,     pro: true        },
]

const PLANS_OFFER = [
  { months: 1,  label: 'Mensuel',  price: 15000, priceUsd: 4.99,  badge: null              },
  { months: 12, label: 'Annuel',   price: 150000, priceUsd: 49.99, badge: '2 mois offerts'  },
]

function FeatureVal({ val }) {
  if (val === true)  return <Check size={16} color="#0F6E56" strokeWidth={2.5}/>
  if (val === false) return <X     size={16} color="#A32D2D" strokeWidth={2.5}/>
  return <span style={{ fontSize:13, color:'#555', fontWeight:500 }}>{val}</span>
}

function UsageBar({ label, used, limit }) {
  const pct    = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const danger = pct >= 80
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:13, color:'#555' }}>{label}</span>
        <span style={{ fontSize:12, color: danger ? '#A32D2D' : '#888' }}>
          {limit === null ? `${used} utilisés` : `${used} / ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div style={{ height:6, background:'#f0f0f0', borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:4,
            width:`${pct}%`, background: danger ? '#E24B4A' : '#6C5CE7', transition:'width 0.4s' }}/>
        </div>
      )}
    </div>
  )
}

export default function PlanPage() {
  const navigate = useNavigate()
  const { plan, loading } = usePlan()
  const [upgrading,   setUpgrading]   = useState(false)
  const [cancelling,  setCancelling]  = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [msg, setMsg] = useState(null)
  const [selectedOffer, setSelectedOffer] = useState(0)

  const isPro    = plan?.effectivePlan === 'pro'
  const isTrial  = plan?.isTrial
  const isFree   = !isPro && !isTrial
  const trialEnd = plan?.trialEndAt ? new Date(plan.trialEndAt) : null
  const planEnd  = plan?.planEndAt  ? new Date(plan.planEndAt)  : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : 0

  const showMsg = (ok, text) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      await api.post('/plan/upgrade', { months: PLANS_OFFER[selectedOffer].months })
      showMsg(true, 'Plan Pro activé avec succès !')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      showMsg(false, e.response?.data?.error || 'Erreur lors de la mise à niveau')
    } finally { setUpgrading(false) }
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await api.post('/plan/downgrade')
      setConfirmCancel(false)
      showMsg(true, 'Plan annulé — retour au plan Gratuit')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      showMsg(false, e.response?.data?.error || 'Erreur lors de l\'annulation')
    } finally { setCancelling(false) }
  }

  return (
    <div style={{ paddingBottom:40 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12,
        padding:'16px 20px', borderBottom:'1px solid #f0f0f0',
        position:'sticky', top:0, background:'#fff', zIndex:10 }}>
        <button onClick={() => navigate(-1)}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#6C5CE7' }}>
          <ArrowLeft size={22}/>
        </button>
        <span style={{ fontWeight:800, fontSize:17, color:'#222' }}>Mon plan</span>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#aaa' }}>Chargement...</div>
      ) : (
        <div style={{ padding:'20px 16px' }}>

          {/* Message feedback */}
          {msg && (
            <div style={{
              display:'flex', alignItems:'center', gap:10, marginBottom:16,
              background: msg.ok ? '#E1F5EE' : '#FCEBEB', borderRadius:12, padding:'12px 14px',
              border:`1px solid ${msg.ok ? '#9FE1CB' : '#F09595'}`,
            }}>
              {msg.ok
                ? <CheckCircle size={16} color="#0F6E56"/>
                : <AlertTriangle size={16} color="#E24B4A"/>}
              <span style={{ fontSize:13, fontWeight:600, color: msg.ok ? '#0F6E56' : '#A32D2D' }}>
                {msg.text}
              </span>
            </div>
          )}

          {/* Carte plan actuel */}
          <div style={{
            background: isPro ? '#6C5CE7' : isTrial ? '#0F6E56' : '#f7f6fd',
            borderRadius:16, padding:'20px', marginBottom:16,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <Zap size={16} color={isPro || isTrial ? '#EEEDFE' : '#6C5CE7'} strokeWidth={2.5}/>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.5px', color: isPro || isTrial ? '#AFA9EC' : '#6C5CE7' }}>
                Plan actif
              </span>
            </div>
            <div style={{ fontSize:24, fontWeight:800,
              color: isPro || isTrial ? '#fff' : '#222', marginBottom:4 }}>
              {isTrial ? 'Pro — Essai gratuit' : isPro ? 'Pro' : 'Gratuit'}
            </div>
            {isTrial && trialEnd && (
              <div style={{ fontSize:13, color: isPro || isTrial ? '#EEEDFE' : '#888' }}>
                {daysLeft > 0
                  ? `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} — ${trialEnd.toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}`
                  : 'Essai expiré'}
              </div>
            )}
            {isPro && !isTrial && planEnd && (
              <div style={{ fontSize:13, color:'#EEEDFE', opacity:0.8 }}>
                Renouvellement : {planEnd.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
              </div>
            )}
            {isFree && (
              <div style={{ fontSize:13, color:'#888' }}>Fonctionnalités limitées</div>
            )}
          </div>

          {/* Utilisation */}
          {plan?.usage && (
            <div style={{ background:'#f7f7f7', borderRadius:14, padding:16, marginBottom:16, border:'0.5px solid #eee' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#aaa',
                textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>
                Utilisation ce mois
              </div>
              <UsageBar
                label="Transactions"
                used={plan.usage.transactions?.used ?? 0}
                limit={plan.usage.transactions?.limit}
              />
              <UsageBar
                label="Catégories"
                used={plan.usage.categories?.used ?? 0}
                limit={plan.usage.categories?.limit}
              />
            </div>
          )}

          {/* Upgrade — si pas encore pro */}
          {!isPro && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:'#aaa',
                textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
                Passer au plan Pro
              </div>

              {/* Sélecteur offre */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {PLANS_OFFER.map((offer, i) => (
                  <button key={i} onClick={() => setSelectedOffer(i)} style={{
                    padding:'14px 12px', borderRadius:14, cursor:'pointer', textAlign:'left',
                    border:`2px solid ${selectedOffer===i ? '#534AB7' : '#eee'}`,
                    background: selectedOffer===i ? '#EEEDFE' : '#fafafa',
                  }}>
                    {offer.badge && (
                      <div style={{ fontSize:10, fontWeight:700, color:'#0F6E56',
                        background:'#E1F5EE', borderRadius:20, padding:'2px 7px',
                        display:'inline-block', marginBottom:6 }}>
                        {offer.badge}
                      </div>
                    )}
                    <div style={{ fontSize:13, fontWeight:700, color: selectedOffer===i ? '#3C3489' : '#222' }}>
                      {offer.label}
                    </div>
                    <div style={{ fontSize:16, fontWeight:800, color: selectedOffer===i ? '#534AB7' : '#222', marginTop:2 }}>
                      {offer.price.toLocaleString('fr-MG')} Ar
                    </div>
                    <div style={{ fontSize:11, color:'#aaa' }}>${offer.priceUsd}</div>
                  </button>
                ))}
              </div>

              <button onClick={handleUpgrade} disabled={upgrading} style={{
                width:'100%', padding:14, borderRadius:14,
                background: upgrading ? '#a09bda' : '#534AB7',
                border:'none', color:'#EEEDFE', fontWeight:700, fontSize:15,
                cursor: upgrading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                marginBottom:8,
              }}>
                <Zap size={16} strokeWidth={2.5}/>
                {upgrading ? 'Activation...' : `Activer Pro — ${PLANS_OFFER[selectedOffer].price.toLocaleString('fr-MG')} Ar/${PLANS_OFFER[selectedOffer].months===1?'mois':'an'}`}
              </button>
              <div style={{ fontSize:12, color:'#aaa', textAlign:'center', marginBottom:20 }}>
                Paiement sécurisé · Annulation à tout moment
              </div>
            </>
          )}

          {/* Tableau comparatif */}
          <div style={{ fontSize:11, fontWeight:700, color:'#aaa',
            textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
            Comparatif des plans
          </div>
          <div style={{ background:'#fff', borderRadius:14, border:'0.5px solid #eee', overflow:'hidden', marginBottom:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 72px 72px',
              padding:'10px 14px', borderBottom:'1px solid #f0f0f0' }}>
              <span/>
              <span style={{ fontSize:11, fontWeight:700, color:'#888', textAlign:'center' }}>Gratuit</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#6C5CE7', textAlign:'center' }}>Pro</span>
            </div>
            {FEATURES.map(({ icon: Icon, label, free, pro }) => (
              <div key={label} style={{ display:'grid', gridTemplateColumns:'1fr 72px 72px',
                padding:'11px 14px', borderBottom:'0.5px solid #fafafa', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Icon size={14} color="#aaa" strokeWidth={1.8}/>
                  <span style={{ fontSize:13, color:'#444' }}>{label}</span>
                </div>
                <div style={{ textAlign:'center' }}><FeatureVal val={free}/></div>
                <div style={{ textAlign:'center' }}><FeatureVal val={pro}/></div>
              </div>
            ))}
          </div>

          {/* Annuler le plan Pro */}
          {isPro && !isTrial && (
            <>
              {!confirmCancel ? (
                <button onClick={() => setConfirmCancel(true)} style={{
                  width:'100%', padding:13, borderRadius:14, cursor:'pointer',
                  background:'transparent', border:'1.5px solid #F09595',
                  color:'#E24B4A', fontWeight:600, fontSize:14,
                }}>
                  Annuler mon abonnement Pro
                </button>
              ) : (
                <div style={{ background:'#FCEBEB', borderRadius:14, padding:20,
                  border:'1px solid #F09595' }}>
                  <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                    <AlertTriangle size={18} color="#A32D2D" style={{ flexShrink:0, marginTop:2 }}/>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#A32D2D', marginBottom:4 }}>
                        Confirmer l'annulation ?
                      </div>
                      <div style={{ fontSize:13, color:'#666', lineHeight:1.5 }}>
                        Vous perdrez l'accès aux fonctionnalités Pro à la fin de la période en cours.
                        Vos données seront conservées.
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setConfirmCancel(false)} style={{
                      flex:1, padding:11, borderRadius:10, border:'none', cursor:'pointer',
                      background:'#fff', fontWeight:600, fontSize:13, color:'#888',
                    }}>
                      Garder Pro
                    </button>
                    <button onClick={handleCancel} disabled={cancelling} style={{
                      flex:2, padding:11, borderRadius:10, border:'none', cursor:'pointer',
                      background: cancelling ? '#f0a0a0' : '#E24B4A',
                      fontWeight:700, fontSize:13, color:'#fff',
                    }}>
                      {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}