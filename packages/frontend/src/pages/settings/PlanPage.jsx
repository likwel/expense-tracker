import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft, Zap, Check, X, TrendingDown, RefreshCw,
  Target, BarChart2, Download, Globe, AlertTriangle,
  CheckCircle, Copy, Upload, Smartphone, CreditCard
} from 'lucide-react'
import { usePlan } from '../../hooks/usePlan'
import api from '../../utils/api'

/* ─── Config ────────────────────────────────────────────────────── */
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
  { months: 1,  label: 'Mensuel', price: 15000,  priceUsd: 4.99,  badge: null            },
  { months: 12, label: 'Annuel',  price: 150000, priceUsd: 49.99, badge: '2 mois offerts' },
]

const MVOLA_NUMBER  = '034 85 234 79'
const ORANGE_NUMBER = '032 43 236 01'

const OPERATORS = [
  {
    id: 'mvola',  label: 'MVola',        color: '#E24B4A', number: MVOLA_NUMBER,
    ussd: (num, amt) => `*111*1*${num.replace(/\s/g, '')}*${amt}#`,
    note: '034 → 034 · Sans frais',
  },
  {
    id: 'orange', label: 'Orange Money', color: '#E87000', number: ORANGE_NUMBER,
    ussd: (num, amt) => `*144*1*${num.replace(/\s/g, '')}*${amt}#`,
    note: '032 → 032 · Sans frais',
  },
]

/* ─── Helpers ───────────────────────────────────────────────────── */
function FeatureVal({ val }) {
  if (val === true)  return <Check size={14} color="#0F6E56" strokeWidth={2.5}/>
  if (val === false) return <X     size={14} color="#ccc"    strokeWidth={2.5}/>
  return <span style={{ fontSize:12, color:'#666' }}>{val}</span>
}

function UsageBar({ label, used, limit }) {
  const pct    = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const danger = pct >= 80
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:12, color:'#888' }}>{label}</span>
        <span style={{ fontSize:11, color: danger ? '#E24B4A' : '#aaa' }}>
          {limit === null ? `${used} utilisés` : `${used} / ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div style={{ height:4, background:'#f0f0f0', borderRadius:4, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:4, width:`${pct}%`,
            background: danger ? '#E24B4A' : '#6C5CE7', transition:'width 0.4s',
          }}/>
        </div>
      )}
    </div>
  )
}

/* ─── Modal paiement ────────────────────────────────────────────── */
function PaymentModal({ offer, onClose, onSuccess }) {
  const [tab,       setTab]       = useState('mobile')
  const [operator,    setOperator]    = useState('mvola')
  const [senderNum,   setSenderNum]   = useState('')
  const [justif,      setJustif]      = useState(null)
  const [copied,      setCopied]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [ussdClicked, setUssdClicked] = useState(false)

  const op = OPERATORS.find(o => o.id === operator)

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(txt); setTimeout(() => setCopied(null), 2000)
    })
  }

  const handleMobileSubmit = async () => {
    if (!justif) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('method',       'mobile_money')
      form.append('operator',     op.id)
      form.append('senderNumber', senderNum)
      form.append('months',       offer.months)
      form.append('justificatif', justif)
      await api.post('/plan/upgrade/mobile-money', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess('Paiement soumis — accès Pro activé sous 24h après vérification.')
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erreur lors de l\'envoi')
    } finally { setLoading(false) }
  }

  const handleStripeSubmit = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/plan/upgrade/stripe-checkout', { months: offer.months })
      window.location.href = data.checkoutUrl
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erreur Stripe')
      setLoading(false)
    }
  }

  const ussdCode = op.ussd(op.number, offer.price)

  return (
    /* Overlay */
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:100,
      background:'rgba(0,0,0,0.35)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      {/* Sheet */}
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:480,
        background:'#fff', borderRadius:'20px 20px 0 0',
        padding:'0 0 32px',
        maxHeight:'92vh', overflowY:'auto',
      }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'#e0e0e0' }}/>
        </div>

        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'8px 20px 16px', borderBottom:'1px solid #f5f5f5',
        }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#222' }}>Passer au plan Pro</div>
            <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>
              {offer.label} · {offer.price.toLocaleString('fr-MG')} Ar
            </div>
          </div>
          <button onClick={onClose} style={{
            background:'#f5f5f5', border:'none', borderRadius:8,
            width:32, height:32, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <X size={16} color="#888" strokeWidth={2}/>
          </button>
        </div>

        <div style={{ padding:'16px 20px 0' }}>

          {/* Onglets */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr',
            background:'#f5f5f5', borderRadius:10, padding:3, marginBottom:20,
          }}>
            {[
              { id:'mobile', label:'Mobile Money', icon: Smartphone },
              { id:'card',   label:'Carte bancaire', icon: CreditCard },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'8px 0', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
                fontWeight: tab===id ? 700 : 500,
                background: tab===id ? '#fff' : 'transparent',
                color: tab===id ? '#222' : '#999',
                boxShadow: tab===id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition:'all 0.15s',
              }}>
                <Icon size={13} strokeWidth={2}/>{label}
              </button>
            ))}
          </div>

          {/* Erreur */}
          {msg && (
            <div style={{
              display:'flex', gap:8, alignItems:'center', marginBottom:14,
              background:'#FCEBEB', borderRadius:8, padding:'10px 12px',
              border:'1px solid #F09595', fontSize:12, color:'#A32D2D',
            }}>
              <AlertTriangle size={14}/>{msg}
            </div>
          )}

          {/* ── Mobile Money ── */}
          {tab === 'mobile' && (
            <div>
              {/* Opérateur */}
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                {OPERATORS.map(o => (
                  <button key={o.id} onClick={() => setOperator(o.id)} style={{
                    flex:1, padding:'8px 0', borderRadius:8, cursor:'pointer',
                    border:`1.5px solid ${operator===o.id ? o.color : '#eee'}`,
                    background: operator===o.id ? `${o.color}12` : '#fafafa',
                    fontSize:12, fontWeight:700,
                    color: operator===o.id ? o.color : '#aaa',
                  }}>{o.label}</button>
                ))}
              </div>

              {/* QR + infos */}
              <div style={{
                border:'1px solid #f0f0f0', borderRadius:12, padding:14,
                display:'flex', gap:14, alignItems:'flex-start', marginBottom:14,
              }}>
                {/* QR */}
                <div style={{
                  width:110, height:110, flexShrink:0, borderRadius:8,
                  border:'1px solid #f0f0f0', background:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center', padding:6,
                }}>
                  <QRCodeSVG value={ussdCode} size={94} bgColor="#fff" fgColor="#222" level="M"/>
                </div>

                {/* Infos */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, color:'#bbb', marginBottom:4 }}>Numéro destinataire</div>
                  <div style={{ fontSize:17, fontWeight:800, color:'#222', letterSpacing:'0.5px', marginBottom:8 }}>
                    {op.number}
                  </div>

                  {/* Boutons copier + composer */}
                  <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                    <button onClick={() => handleCopy(op.number)} style={{
                      display:'flex', alignItems:'center', gap:4,
                      padding:'5px 10px', borderRadius:6, border:'1px solid #eee',
                      background:'#fafafa', cursor:'pointer', fontSize:11, fontWeight:600, color:'#555',
                    }}>
                      {copied===op.number ? <Check size={11}/> : <Copy size={11}/>}
                      {copied===op.number ? 'Copié' : 'Copier'}
                    </button>
                    <a href={`tel:${ussdCode}`}
                      onClick={() => setTimeout(() => setUssdClicked(true), 1500)}
                      style={{
                        display:'flex', alignItems:'center', gap:4,
                        padding:'5px 10px', borderRadius:6,
                        background:'#6C5CE7', border:'none', cursor:'pointer',
                        fontSize:11, fontWeight:700, color:'#fff', textDecoration:'none',
                    }}>
                      <Smartphone size={11}/>Composer
                    </a>
                  </div>

                  {/* Montant */}
                  <div style={{ fontSize:11, color:'#bbb', marginBottom:2 }}>Montant exact</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#6C5CE7' }}>
                    {offer.price.toLocaleString('fr-MG')} Ar
                  </div>
                  <div style={{ fontSize:10, color:'#0F6E56', marginTop:4, fontWeight:600 }}>
                    ✓ {op.note}
                  </div>
                </div>
              </div>

              {/* Code USSD */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'#f7f7f7', borderRadius:8, padding:'9px 12px', marginBottom:14,
                border:'1px solid #f0f0f0',
              }}>
                <span style={{ fontFamily:'monospace', fontSize:13, color:'#333', letterSpacing:'0.3px' }}>
                  {ussdCode}
                </span>
                <button onClick={() => handleCopy(ussdCode)} style={{
                  background:'none', border:'none', cursor:'pointer', color:'#6C5CE7', flexShrink:0,
                }}>
                  {copied===ussdCode ? <Check size={13} strokeWidth={2.5}/> : <Copy size={13} strokeWidth={2}/>}
                </button>
              </div>

              {/* Bandeau confirmation après retour du composeur */}
              {ussdClicked && (
                <div style={{
                  border:'1px solid #9FE1CB', borderRadius:10, padding:'12px 14px',
                  background:'#E1F5EE', marginBottom:12,
                  display:'flex', gap:10, alignItems:'flex-start',
                }}>
                  <CheckCircle size={15} color="#0F6E56" style={{ flexShrink:0, marginTop:1 }}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#0F6E56', marginBottom:2 }}>
                      Transfert effectué ?
                    </div>
                    <div style={{ fontSize:11, color:'#555', lineHeight:1.5 }}>
                      Entrez votre numéro et uploadez le justificatif (capture SMS de confirmation) pour valider votre accès Pro.
                    </div>
                  </div>
                </div>
              )}

              {/* Numéro expéditeur */}
              <input
                type="tel"
                placeholder={`Votre numéro ${op.label} (ex: ${op.number.slice(0,3)} XX XXX XX)`}
                value={senderNum}
                onChange={e => setSenderNum(e.target.value)}
                style={{
                  width:'100%', padding:'10px 12px', borderRadius:8, boxSizing:'border-box',
                  border:'1px solid #eee', fontSize:13, outline:'none',
                  background:'#fafafa', marginBottom:10, color:'#222',
                }}
              />

              {/* Upload justificatif */}
              <label style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                border:`1.5px dashed ${justif ? '#0F6E56' : '#ddd'}`,
                borderRadius:8, padding:'13px',
                cursor:'pointer', marginBottom:16,
                background: justif ? '#E1F5EE' : '#fafafa',
                color: justif ? '#0F6E56' : '#aaa',
                fontSize:12, fontWeight:600,
              }}>
                <input type="file" accept="image/*,application/pdf"
                  onChange={e => { const f=e.target.files[0]; if(f) setJustif(f) }}
                  style={{ display:'none' }}/>
                {justif
                  ? <><CheckCircle size={14}/>{justif.name}</>
                  : <><Upload size={14}/>Justificatif · capture SMS ou app</>
                }
              </label>

              <button onClick={handleMobileSubmit} disabled={loading || !justif} style={{
                width:'100%', padding:13, borderRadius:10, border:'none',
                background: (!justif || loading) ? '#c4c0e8' : '#6C5CE7',
                color:'#fff', fontWeight:700, fontSize:14, cursor: (!justif||loading) ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                <Zap size={15} strokeWidth={2.5}/>
                {loading ? 'Envoi...' : 'Soumettre le paiement'}
              </button>
              <div style={{ fontSize:11, color:'#ccc', textAlign:'center', marginTop:8 }}>
                Vérification sous 24h · Accès Pro activé dès confirmation
              </div>
            </div>
          )}

          {/* ── Stripe ── */}
          {tab === 'card' && (
            <div>
              <div style={{
                border:'1px solid #f0f0f0', borderRadius:12, padding:14, marginBottom:14,
              }}>
                <div style={{ fontSize:13, color:'#666', lineHeight:1.6, marginBottom:10 }}>
                  Paiement sécurisé via <strong>Stripe</strong>. Vous serez redirigé vers la page de paiement.
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {['Visa', 'Mastercard', 'Amex'].map(b => (
                    <span key={b} style={{
                      fontSize:11, fontWeight:700, color:'#6C5CE7',
                      background:'#EEEDFE', borderRadius:5, padding:'3px 8px',
                    }}>{b}</span>
                  ))}
                </div>
              </div>

              <div style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'11px 14px', background:'#f7f7f7', borderRadius:8,
                border:'1px solid #f0f0f0', marginBottom:16,
              }}>
                <span style={{ fontSize:13, color:'#666' }}>Plan {offer.label}</span>
                <span style={{ fontSize:15, fontWeight:800, color:'#222' }}>${offer.priceUsd} USD</span>
              </div>

              <button onClick={handleStripeSubmit} disabled={loading} style={{
                width:'100%', padding:13, borderRadius:10, border:'none',
                background: loading ? '#c4c0e8' : '#6C5CE7',
                color:'#fff', fontWeight:700, fontSize:14,
                cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                <CreditCard size={15} strokeWidth={2.5}/>
                {loading ? 'Redirection...' : `Payer $${offer.priceUsd} avec Stripe`}
              </button>
              <div style={{ fontSize:11, color:'#ccc', textAlign:'center', marginTop:8 }}>
                Paiement chiffré SSL · Annulation à tout moment
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/* ─── Page principale ───────────────────────────────────────────── */
export default function PlanPage() {
  const navigate = useNavigate()
  const { plan, loading } = usePlan()
  const [selectedOffer, setSelectedOffer] = useState(0)
  const [showModal,     setShowModal]     = useState(false)
  const [cancelling,    setCancelling]    = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [msg,           setMsg]           = useState(null)

  const isPro    = plan?.effectivePlan === 'pro'
  const isTrial  = plan?.isTrial && plan?.trialEndAt && new Date(plan.trialEndAt) > new Date()
  const isFree   = !isPro && !isTrial
  const trialEnd = plan?.trialEndAt ? new Date(plan.trialEndAt) : null
  const planEnd  = plan?.planEndAt  ? new Date(plan.planEndAt)  : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : 0

  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000) }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await api.post('/plan/downgrade')
      setConfirmCancel(false)
      showMsg(true, 'Abonnement annulé — retour au plan Gratuit')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      showMsg(false, e.response?.data?.error || 'Erreur lors de l\'annulation')
    } finally { setCancelling(false) }
  }

  return (
    <div style={{ paddingBottom:40 }}>

      {/* Modal */}
      {showModal && (
        <PaymentModal
          offer={PLANS_OFFER[selectedOffer]}
          onClose={() => setShowModal(false)}
          onSuccess={(txt) => { setShowModal(false); showMsg(true, txt) }}
        />
      )}

      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'14px 16px', borderBottom:'1px solid #f5f5f5',
        position:'sticky', top:0, background:'#fff', zIndex:10,
      }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6C5CE7', padding:0 }}>
          <ArrowLeft size={20}/>
        </button>
        <span style={{ fontWeight:700, fontSize:16, color:'#222' }}>Mon plan</span>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#ccc', fontSize:13 }}>Chargement...</div>
      ) : (
        <div style={{ padding:'16px' }}>

          {/* Feedback */}
          {msg && (
            <div style={{
              display:'flex', alignItems:'center', gap:8, marginBottom:14,
              background: msg.ok ? '#E1F5EE' : '#FCEBEB', borderRadius:8, padding:'10px 12px',
              border:`1px solid ${msg.ok ? '#9FE1CB' : '#F09595'}`,
            }}>
              {msg.ok ? <CheckCircle size={14} color="#0F6E56"/> : <AlertTriangle size={14} color="#E24B4A"/>}
              <span style={{ fontSize:12, fontWeight:600, color: msg.ok ? '#0F6E56' : '#A32D2D' }}>
                {msg.text}
              </span>
            </div>
          )}

          {/* Plan actuel */}
          <div style={{
            border:'1px solid #f0f0f0', borderRadius:12, padding:16, marginBottom:12,
            background: isPro ? '#6C5CE7' : isTrial ? '#0F6E56' : '#fafafa',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <Zap size={13} color={isPro||isTrial ? '#EEEDFE' : '#6C5CE7'} strokeWidth={2.5}/>
              <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px',
                color: isPro||isTrial ? '#AFA9EC' : '#6C5CE7' }}>Plan actif</span>
            </div>
            <div style={{ fontSize:20, fontWeight:800, color: isPro||isTrial ? '#fff' : '#222' }}>
              {isTrial ? 'Pro — Essai gratuit' : isPro ? 'Pro' : 'Gratuit'}
            </div>
            {isTrial && trialEnd && (
              <div style={{ fontSize:12, color:'#EEEDFE', marginTop:3 }}>
                {daysLeft > 0
                  ? `Expire dans ${daysLeft} jour${daysLeft>1?'s':''} — ${trialEnd.toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}`
                  : 'Essai expiré'}
              </div>
            )}
            {isPro && !isTrial && planEnd && (
              <div style={{ fontSize:12, color:'#EEEDFE', opacity:0.75, marginTop:3 }}>
                Renouvellement : {planEnd.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
              </div>
            )}
            {isFree && <div style={{ fontSize:12, color:'#aaa', marginTop:3 }}>Fonctionnalités limitées</div>}
          </div>

          {/* Utilisation */}
          {plan?.usage && (
            <div style={{ border:'1px solid #f0f0f0', borderRadius:12, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>
                Utilisation ce mois
              </div>
              <UsageBar label="Transactions" used={plan.usage.transactions?.used??0} limit={plan.usage.transactions?.limit}/>
              <UsageBar label="Catégories"   used={plan.usage.categories?.used??0}   limit={plan.usage.categories?.limit}/>
            </div>
          )}

          {/* Upgrade */}
          {!isPro && (
            <div style={{ border:'1px solid #f0f0f0', borderRadius:12, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>
                Passer au plan Pro
              </div>

              {/* Sélecteur durée */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {PLANS_OFFER.map((offer, i) => (
                  <button key={i} onClick={() => setSelectedOffer(i)} style={{
                    padding:'12px 10px', borderRadius:10, cursor:'pointer', textAlign:'left',
                    border:`1.5px solid ${selectedOffer===i ? '#6C5CE7' : '#f0f0f0'}`,
                    background: selectedOffer===i ? '#EEEDFE' : '#fafafa',
                  }}>
                    {offer.badge && (
                      <div style={{ fontSize:9, fontWeight:700, color:'#0F6E56', background:'#E1F5EE',
                        borderRadius:20, padding:'2px 6px', display:'inline-block', marginBottom:5 }}>
                        {offer.badge}
                      </div>
                    )}
                    <div style={{ fontSize:12, fontWeight:700, color: selectedOffer===i ? '#3C3489' : '#555' }}>
                      {offer.label}
                    </div>
                    <div style={{ fontSize:15, fontWeight:800, color: selectedOffer===i ? '#6C5CE7' : '#222', marginTop:2 }}>
                      {offer.price.toLocaleString('fr-MG')} Ar
                    </div>
                    <div style={{ fontSize:10, color:'#bbb' }}>${offer.priceUsd}</div>
                  </button>
                ))}
              </div>

              {/* Bouton ouvre modal */}
              <button onClick={() => setShowModal(true)} style={{
                width:'100%', padding:13, borderRadius:10, border:'none',
                background:'#6C5CE7', color:'#fff', fontWeight:700, fontSize:14,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                <Zap size={15} strokeWidth={2.5}/>
                Activer Pro — {PLANS_OFFER[selectedOffer].price.toLocaleString('fr-MG')} Ar
              </button>
            </div>
          )}

          {/* Comparatif */}
          <div style={{ border:'1px solid #f0f0f0', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 60px',
              padding:'10px 14px', borderBottom:'1px solid #f5f5f5', background:'#fafafa' }}>
              <span/>
              <span style={{ fontSize:10, fontWeight:700, color:'#bbb', textAlign:'center' }}>Gratuit</span>
              <span style={{ fontSize:10, fontWeight:700, color:'#6C5CE7', textAlign:'center' }}>Pro</span>
            </div>
            {FEATURES.map(({ icon: Icon, label, free, pro }) => (
              <div key={label} style={{ display:'grid', gridTemplateColumns:'1fr 60px 60px',
                padding:'10px 14px', borderBottom:'0.5px solid #f9f9f9', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <Icon size={12} color="#ccc" strokeWidth={1.8}/>
                  <span style={{ fontSize:12, color:'#555' }}>{label}</span>
                </div>
                <div style={{ textAlign:'center' }}><FeatureVal val={free}/></div>
                <div style={{ textAlign:'center' }}><FeatureVal val={pro}/></div>
              </div>
            ))}
          </div>

          {/* Annuler Pro */}
          {isPro && !isTrial && (
            !confirmCancel ? (
              <button onClick={() => setConfirmCancel(true)} style={{
                width:'100%', padding:11, borderRadius:10, cursor:'pointer',
                background:'transparent', border:'1px solid #F09595',
                color:'#E24B4A', fontWeight:600, fontSize:13,
              }}>
                Annuler mon abonnement Pro
              </button>
            ) : (
              <div style={{ border:'1px solid #F09595', borderRadius:12, padding:16, background:'#FCEBEB' }}>
                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  <AlertTriangle size={15} color="#A32D2D" style={{ flexShrink:0, marginTop:2 }}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#A32D2D', marginBottom:3 }}>
                      Confirmer l'annulation ?
                    </div>
                    <div style={{ fontSize:12, color:'#888', lineHeight:1.5 }}>
                      Vous perdrez l'accès Pro à la fin de la période en cours. Vos données seront conservées.
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setConfirmCancel(false)} style={{
                    flex:1, padding:10, borderRadius:8, border:'1px solid #eee',
                    cursor:'pointer', background:'#fff', fontWeight:600, fontSize:12, color:'#888',
                  }}>Garder Pro</button>
                  <button onClick={handleCancel} disabled={cancelling} style={{
                    flex:2, padding:10, borderRadius:8, border:'none', cursor:'pointer',
                    background: cancelling ? '#f0a0a0' : '#E24B4A',
                    fontWeight:700, fontSize:12, color:'#fff',
                  }}>
                    {cancelling ? 'Annulation...' : 'Confirmer'}
                  </button>
                </div>
              </div>
            )
          )}

        </div>
      )}
    </div>
  )
}