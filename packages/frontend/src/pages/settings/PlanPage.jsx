import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft, Zap, Check, X, RefreshCw, Users, User, Briefcase,
  AlertTriangle, CheckCircle, Copy, Upload, Smartphone, CreditCard,
  Lock, Clock, Building2,
} from 'lucide-react'
import { usePlan } from '../../hooks/usePlan'
import { useFmt }  from '../../hooks/useFmt'
import api         from '../../utils/api'

// ── Config plans ──────────────────────────────────────────────────

const PLANS = [
  {
    id:       'pro',
    label:    'Pro personnel',
    price:    5000,
    priceUsd: 1.49,
    maxUsers: 1,
    badge:    null,
    Icon:     User,
    bg:       '#26215C',
    accent:   '#7F77DD',
    text:     '#AFA9EC',
    pill:     '#EEEDFE',
    pillText: '#3C3489',
    desc:     '1 compte individuel',
    features: [
      'Transactions illimitées',
      'Catégories illimitées',
      'Budgets & récurrents',
      'Rapports complets',
      'Export CSV',
      'Multi-devises',
    ],
  },
  {
    id:       'family',
    label:    'Famille',
    price:    15000,
    priceUsd: 4.99,
    maxUsers: 5,
    badge:    'Jusqu\'à 5 membres',
    Icon:     Users,
    bg:       '#04342C',
    accent:   '#1D9E75',
    text:     '#9FE1CB',
    pill:     '#E1F5EE',
    pillText: '#085041',
    desc:     'Partagé · max 5 utilisateurs',
    features: [
      'Tout le plan Pro',
      'Jusqu\'à 5 membres',
      'Invitations par lien',
      'Finances partagées',
    ],
  },
  {
    id:       'business',
    label:    'Business',
    price:    40000,
    priceUsd: 12.99,
    maxUsers: null,
    badge:    'Membres illimités',
    Icon:     Briefcase,
    bg:       '#4A1B0C',
    accent:   '#D85A30',
    text:     '#F0997B',
    pill:     '#FAECE7',
    pillText: '#712B13',
    desc:     'Équipe sans limite',
    features: [
      'Tout le plan Famille',
      'Membres illimités',
      'Gestion des rôles',
      'Rapports d\'équipe',
    ],
  },
]

const FEATURES_TABLE = [
  { label: 'Transactions / mois', free: '30',      pro: 'Illimité'   },
  { label: 'Catégories',           free: '3',       pro: 'Illimité'   },
  { label: 'Budgets',               free: false,     pro: true         },
  { label: 'Revenus récurrents',    free: false,     pro: true         },
  { label: 'Rapports complets',     free: 'Basique', pro: 'Complet'   },
  { label: 'Export CSV',            free: false,     pro: true         },
  { label: 'Multi-devises',         free: false,     pro: true         },
  { label: 'Membres max',           free: '1',       pro: 'Selon plan' },
]

const DURATIONS = [
  { months: 1,  label: '1 mois',  badge: null   },
  { months: 3,  label: '3 mois',  badge: null   },
  { months: 12, label: '1 an',    badge: '-17%' },
]

const OPERATORS = [
  {
    id: 'mvola',  label: 'MVola',        color: '#E24B4A',
    number: '034 85 234 79',
    ussd: (n, a) => `*111*1*${n.replace(/\s/g, '')}*${a}#`,
    note: '034 → 034 · Sans frais',
  },
  {
    id: 'orange', label: 'Orange Money', color: '#E87000',
    number: '032 43 236 01',
    ussd: (n, a) => `*144*1*${n.replace(/\s/g, '')}*${a}#`,
    note: '032 → 032 · Sans frais',
  },
]

// ── Helpers ───────────────────────────────────────────────────────

const s = (obj) => ({ ...obj })   // style shorthand (no-op, just for clarity)

function FeatureVal({ val }) {
  if (val === true)  return <Check size={13} color="#6C5CE7" strokeWidth={2.5} />
  if (val === false) return <X     size={13} color="#ddd"    strokeWidth={2.5} />
  return <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{val}</span>
}

function UsageBar({ label, used, limit }) {
  const pct   = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const color = pct >= 80 ? '#E24B4A' : pct >= 60 ? '#F59E0B' : '#6C5CE7'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: pct >= 80 ? '#E24B4A' : 'var(--color-text-tertiary)' }}>
          {limit == null ? `${used} utilisés` : `${used} / ${limit}`}
        </span>
      </div>
      {limit != null && (
        <div style={{ height: 5, background: 'var(--color-background-secondary)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .5s' }} />
        </div>
      )}
    </div>
  )
}

// ── Carte plan (sélecteur) ────────────────────────────────────────

function PlanCard({ plan, selected, onSelect }) {
  const { fmt } = useFmt()
  const active  = selected === plan.id
  return (
    <button onClick={() => onSelect(plan.id)} style={{
      flex: 1, minWidth: 0, padding: '12px 10px', borderRadius: 14,
      cursor: 'pointer', textAlign: 'left', position: 'relative',
      border: `1.5px solid ${active ? plan.accent : '#eee'}`,
      background: active ? plan.bg : '#fafafa',
      transition: 'all 0.15s',
    }}>
      {plan.badge && (
        <div style={{
          fontSize: 9, fontWeight: 700, marginBottom: 5, display: 'inline-block',
          background: active ? 'rgba(255,255,255,0.15)' : plan.pill,
          color: active ? plan.text : plan.pillText,
          borderRadius: 20, padding: '2px 7px',
        }}>
          {plan.badge}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <plan.Icon size={12} color={active ? plan.text : '#aaa'} strokeWidth={2} />
        <span style={{ fontSize: 11, fontWeight: 700, color: active ? plan.text : '#888' }}>
          {plan.label}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: active ? '#fff' : '#222' }}>
        {fmt(plan.price)}
        <span style={{ fontSize: 10, fontWeight: 500, color: active ? plan.text : '#aaa' }}> /mois</span>
      </div>
      <div style={{ fontSize: 10, color: active ? plan.text : '#bbb', marginTop: 2 }}>
        {plan.desc}
      </div>
      {active && (
        <div style={{
          position: 'absolute', top: 8, right: 8, width: 16, height: 16,
          borderRadius: 8, background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={9} color="#fff" strokeWidth={3} />
        </div>
      )}
    </button>
  )
}

// ── Modal paiement ────────────────────────────────────────────────

function PaymentModal({ plan, onClose, onSuccess }) {
  const { fmt }   = useFmt()
  const [tab,         setTab]         = useState('mobile')
  const [months,      setMonths]      = useState(1)
  const [operator,    setOperator]    = useState('mvola')
  const [senderNum,   setSenderNum]   = useState('')
  const [justif,      setJustif]      = useState(null)
  const [copied,      setCopied]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [ussdClicked, setUssdClicked] = useState(false)

  const op       = OPERATORS.find(o => o.id === operator)
  const total    = plan.price * months
  const ussdCode = op.ussd(op.number, total)

  const copy = txt =>
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(txt); setTimeout(() => setCopied(null), 2000)
    })

  const submitMobile = async () => {
    if (!justif) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('method',       'mobile_money')
      form.append('operator',     op.id)
      form.append('senderNumber', senderNum)
      form.append('months',       months)
      form.append('planId',       plan.id)
      form.append('justificatif', justif)
      await api.post('/plan/upgrade/mobile-money', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess('Paiement soumis — accès activé sous 24h après vérification.')
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erreur lors de l\'envoi')
    } finally { setLoading(false) }
  }

  const submitStripe = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/plan/upgrade/stripe-checkout', {
        months, planId: plan.id,
      })
      window.location.href = data.checkoutUrl
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erreur Stripe')
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, background: '#fff',
        borderRadius: '24px 24px 0 0', maxHeight: '94vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 14px', borderBottom: '1px solid #f5f5f5',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: plan.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <plan.Icon size={16} color={plan.text} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#222' }}>
                Activer — {plan.label}
              </div>
              <div style={{ fontSize: 11, color: '#aaa' }}>{fmt(plan.price)} / mois</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#f5f5f5', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="#888" />
          </button>
        </div>

        <div style={{ padding: '16px 20px 32px' }}>

          {/* Durée */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Durée
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {DURATIONS.map(d => (
                <button key={d.months} onClick={() => setMonths(d.months)} style={{
                  flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${months === d.months ? plan.accent : '#eee'}`,
                  background: months === d.months ? plan.pill : '#fafafa',
                  position: 'relative',
                }}>
                  {d.badge && (
                    <div style={{
                      position: 'absolute', top: -8, right: 6, fontSize: 9, fontWeight: 700,
                      background: '#E1F5EE', color: '#085041', borderRadius: 20, padding: '2px 6px',
                    }}>{d.badge}</div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 700,
                    color: months === d.months ? plan.pillText : '#666' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800,
                    color: months === d.months ? plan.accent : '#222', marginTop: 2 }}>
                    {fmt(plan.price * d.months)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Onglets méthode */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: '#f5f5f5', borderRadius: 12, padding: 4, marginBottom: 18,
          }}>
            {[
              { id: 'mobile', label: 'Mobile Money', Icon: Smartphone },
              { id: 'card',   label: 'Carte bancaire', Icon: CreditCard },
            ].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === id ? 700 : 500,
                background: tab === id ? '#fff' : 'transparent',
                color: tab === id ? '#222' : '#999',
                boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
                <Icon size={13} strokeWidth={2} />{label}
              </button>
            ))}
          </div>

          {msg && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14,
              background: '#FCEBEB', borderRadius: 10, padding: '10px 12px',
              border: '1px solid #F09595', fontSize: 12, color: '#A32D2D',
            }}>
              <AlertTriangle size={14} />{msg}
            </div>
          )}

          {/* ── Mobile Money ── */}
          {tab === 'mobile' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {OPERATORS.map(o => (
                  <button key={o.id} onClick={() => setOperator(o.id)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${operator === o.id ? o.color : '#eee'}`,
                    background: operator === o.id ? `${o.color}12` : '#fafafa',
                    fontSize: 13, fontWeight: 700,
                    color: operator === o.id ? o.color : '#aaa',
                  }}>{o.label}</button>
                ))}
              </div>

              <div style={{
                border: '1px solid #f0f0f0', borderRadius: 14, padding: 14,
                display: 'flex', gap: 14, alignItems: 'flex-start',
                marginBottom: 14, background: '#fafafa',
              }}>
                <div style={{
                  width: 110, height: 110, flexShrink: 0, borderRadius: 10,
                  border: '1px solid #eee', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6,
                }}>
                  <QRCodeSVG value={ussdCode} size={94} bgColor="#fff" fgColor="#222" level="M" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: '#bbb', marginBottom: 3, fontWeight: 600 }}>
                    NUMÉRO DESTINATAIRE
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#222', marginBottom: 8, letterSpacing: '0.5px' }}>
                    {op.number}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <button onClick={() => copy(op.number)} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 6, border: '1px solid #eee',
                      background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#555',
                    }}>
                      {copied === op.number ? <Check size={11} /> : <Copy size={11} />}
                      {copied === op.number ? 'Copié' : 'Copier'}
                    </button>
                    <a href={`tel:${ussdCode}`}
                      onClick={() => setTimeout(() => setUssdClicked(true), 1500)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 6,
                        background: plan.bg, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700, color: '#fff', textDecoration: 'none',
                      }}>
                      <Smartphone size={11} />Composer
                    </a>
                  </div>
                  <div style={{ fontSize: 10, color: '#bbb', marginBottom: 2, fontWeight: 600 }}>
                    MONTANT EXACT
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: plan.accent }}>
                    {total.toLocaleString('fr-MG')} Ar
                  </div>
                  <div style={{ fontSize: 10, color: '#0F6E56', marginTop: 4, fontWeight: 600 }}>
                    ✓ {op.note}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#f7f7f7', borderRadius: 10, padding: '10px 12px',
                marginBottom: 14, border: '1px solid #f0f0f0',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#333' }}>{ussdCode}</span>
                <button onClick={() => copy(ussdCode)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: plan.accent,
                }}>
                  {copied === ussdCode ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>

              {ussdClicked && (
                <div style={{
                  border: '1px solid #9FE1CB', borderRadius: 12, padding: '12px 14px',
                  background: '#E1F5EE', marginBottom: 12,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <CheckCircle size={15} color="#0F6E56" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56', marginBottom: 2 }}>
                      Transfert effectué ?
                    </div>
                    <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>
                      Entrez votre numéro et uploadez la capture SMS pour valider.
                    </div>
                  </div>
                </div>
              )}

              <input
                type="tel"
                placeholder={`Votre numéro ${op.label}`}
                value={senderNum}
                onChange={e => setSenderNum(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  boxSizing: 'border-box', border: '1.5px solid #eee',
                  fontSize: 13, outline: 'none', background: '#fafafa',
                  marginBottom: 10, color: '#222',
                }}
              />

              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                border: `1.5px dashed ${justif ? '#0F6E56' : '#ddd'}`,
                borderRadius: 10, padding: 13, cursor: 'pointer', marginBottom: 16,
                background: justif ? '#E1F5EE' : '#fafafa',
                color: justif ? '#0F6E56' : '#aaa', fontSize: 12, fontWeight: 600,
              }}>
                <input type="file" accept="image/*,application/pdf"
                  onChange={e => { const f = e.target.files[0]; if (f) setJustif(f) }}
                  style={{ display: 'none' }} />
                {justif
                  ? <><CheckCircle size={14} />{justif.name}</>
                  : <><Upload size={14} />Justificatif · capture SMS ou app</>
                }
              </label>

              <button onClick={submitMobile} disabled={loading || !justif} style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: (!justif || loading) ? '#ccc' : plan.bg,
                color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: (!justif || loading) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Zap size={15} />
                {loading ? 'Envoi en cours...' : 'Soumettre le paiement'}
              </button>
              <div style={{ fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 8 }}>
                Vérification sous 24h · Accès activé dès confirmation
              </div>
            </div>
          )}

          {/* ── Stripe ── */}
          {tab === 'card' && (
            <div>
              <div style={{
                border: '1px solid #f0f0f0', borderRadius: 14, padding: 16,
                marginBottom: 14, background: '#fafafa',
              }}>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 10 }}>
                  Paiement sécurisé via <strong>Stripe</strong>. Vous serez redirigé.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Visa', 'Mastercard', 'Amex'].map(b => (
                    <span key={b} style={{
                      fontSize: 11, fontWeight: 700, color: plan.pillText,
                      background: plan.pill, borderRadius: 6, padding: '3px 8px',
                    }}>{b}</span>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 16px', background: '#f7f7f7', borderRadius: 10,
                border: '1px solid #f0f0f0', marginBottom: 16,
              }}>
                <span style={{ fontSize: 13, color: '#666' }}>
                  {plan.label} · {months} mois
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#222' }}>
                  ${(plan.priceUsd * months).toFixed(2)} USD
                </span>
              </div>

              <button onClick={submitStripe} disabled={loading} style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: loading ? '#ccc' : plan.bg,
                color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <CreditCard size={15} />
                {loading ? 'Redirection...' : `Payer $${(plan.priceUsd * months).toFixed(2)} avec Stripe`}
              </button>
              <div style={{ fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 8 }}>
                Paiement chiffré SSL · Annulation à tout moment
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────


export default function PlanPage() {
  const navigate = useNavigate()
  const { fmt }  = useFmt()

  // ✅ Utiliser les valeurs dérivées du hook directement
  const {
    plan,
    loading,
    refetch,
    effectivePlan,   // 'free' | 'pro' | 'family' | 'business'  ← calculé côté hook
    isTrial,
    isPaid,
    isFree,
    isUrgent,
    daysLeft,
    usage,
    viaOrg,
  } = usePlan()

  const [selectedId,    setSelectedId]    = useState(null)
  const [showModal,     setShowModal]     = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling,    setCancelling]    = useState(false)
  const [msg,           setMsg]           = useState(null)

  // ✅ activePlan résolu depuis effectivePlan du hook (pas plan?.effectivePlan de l'API)
  const activePlan   = PLANS.find(p => p.id === effectivePlan) ?? null

  // Pré-sélectionner le plan actif dans le sélecteur à l'ouverture
  const defaultSelected = activePlan?.id ?? 'pro'
  const resolvedId      = selectedId ?? defaultSelected
  const selectedPlan    = PLANS.find(p => p.id === resolvedId) ?? PLANS[0]

  const planEnd = plan?.planEndAt ? new Date(plan.planEndAt) : null

  const showMsg = (ok, text) => {
    setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000)
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await api.post('/plan/downgrade')
      setConfirmCancel(false)
      showMsg(true, 'Abonnement annulé — retour au plan Gratuit')
      setTimeout(() => { refetch(); }, 1500)   // ✅ refetch au lieu de reload
    } catch (e) {
      showMsg(false, e.response?.data?.error || 'Erreur lors de l\'annulation')
    } finally { setCancelling(false) }
  }

  // Couleurs de la carte selon le plan effectif
  const cardC = (isPaid || isTrial) && activePlan
    ? { bg: activePlan.bg, text: activePlan.text, accent: activePlan.accent }
    : isTrial && !activePlan
      ? isUrgent
        ? { bg: '#501313', text: '#F7C1C1', accent: '#E24B4A' }
        : { bg: '#04342C', text: '#9FE1CB', accent: '#1D9E75' }
      : { bg: '#F1EFE8', text: '#888780',  accent: '#5F5E5A' }

  const cardFg = isFree ? '#2C2C2A' : '#fff'

  // Label plan actif affiché dans la carte
  const planDisplayLabel = (() => {
    if (isFree) return 'Gratuit'
    if (!activePlan) return effectivePlan   // fallback au nom brut
    return isTrial ? `${activePlan.label} — Essai` : activePlan.label
  })()

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6fd', paddingBottom: 40 }}>

      {showModal && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setShowModal(false)}
          onSuccess={txt => {
            setShowModal(false)
            showMsg(true, txt)
            refetch()   // ✅ rafraîchir le statut après soumission
          }}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', borderBottom: '1px solid #f0f0f0',
        position: 'sticky', top: 0, background: '#fff', zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#6C5CE7', padding: 4,
        }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#222' }}>Mon plan</span>

        {/* ✅ Badge header : utilise activePlan résolu */}
        {(isPaid || isTrial) && activePlan && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
            background: activePlan.bg, color: activePlan.text,
            padding: '3px 10px', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <activePlan.Icon size={10} /> {activePlan.label}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#ccc', fontSize: 13 }}>
          <RefreshCw size={20} color="#ddd"
            style={{ animation: 'spin 1s linear infinite', marginBottom: 8,
              display: 'block', margin: '0 auto 8px' }} />
          Chargement...
        </div>
      ) : (
        <div style={{ padding: 16 }}>

          {/* Feedback */}
          {msg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              background: msg.ok ? '#E1F5EE' : '#FCEBEB', borderRadius: 10,
              padding: '11px 14px',
              border: `1px solid ${msg.ok ? '#9FE1CB' : '#F09595'}`,
            }}>
              {msg.ok
                ? <CheckCircle size={14} color="#0F6E56" />
                : <AlertTriangle size={14} color="#E24B4A" />}
              <span style={{ fontSize: 12, fontWeight: 600,
                color: msg.ok ? '#0F6E56' : '#A32D2D' }}>
                {msg.text}
              </span>
            </div>
          )}

          {/* ── Carte plan actuel ── */}
          <div style={{
            borderRadius: 16, padding: '18px 16px', marginBottom: 14,
            background: cardC.bg, position: 'relative', overflow: 'hidden',
            border: isFree ? '1px solid #D3D1C7' : 'none',
          }}>
            {!isFree && (
              <div style={{
                position: 'absolute', right: -24, top: -24,
                width: 120, height: 120, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
              }} />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {(isPaid || isTrial) && activePlan
                ? <activePlan.Icon size={13} color={cardC.text} />
                : isTrial
                  ? <Clock size={13} color={cardC.text} />
                  : <Lock  size={13} color={cardC.accent} />
              }
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.6px', color: cardC.text }}>
                Plan actif
              </span>
            </div>

            {/* ✅ Label correct selon effectivePlan résolu */}
            <div style={{ fontSize: 24, fontWeight: 800, color: cardFg }}>
              {planDisplayLabel}
            </div>

            {isTrial && plan?.trialEndAt && (
              <div style={{ fontSize: 12, color: cardC.text, marginTop: 4, fontWeight: 500 }}>
                {daysLeft > 0
                  ? `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''} · expire le ${new Date(plan.trialEndAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                  : 'Essai expiré'}
              </div>
            )}
            {isPaid && planEnd && (
              <div style={{ fontSize: 12, color: cardC.text, marginTop: 4 }}>
                Renouvellement : {planEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
            {isFree && (
              <div style={{ fontSize: 12, color: cardC.accent, marginTop: 4 }}>
                Fonctionnalités limitées
              </div>
            )}

            {isUrgent && (
              <div style={{
                marginTop: 12, background: 'rgba(240,149,149,0.18)', borderRadius: 10,
                padding: '8px 12px', fontSize: 12, color: '#F7C1C1', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
                border: '1px solid rgba(240,149,149,0.25)',
              }}>
                <AlertTriangle size={13} />
                Votre essai se termine bientôt. Activez un plan pour conserver vos accès.
              </div>
            )}

            {/* Accès via organisation */}
            {viaOrg && (
              <div style={{
                marginTop: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 10,
                padding: '8px 12px', fontSize: 12, color: cardC.text,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Building2 size={13} />
                Accès fourni par <strong style={{ marginLeft: 4 }}>{viaOrg.orgName}</strong>
              </div>
            )}
          </div>

          {/* ── Utilisation ── */}
          {usage && (
            <div style={{
              background: '#fff', border: '1px solid #f0f0f0',
              borderRadius: 16, padding: '14px 16px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb',
                textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                Utilisation ce mois
              </div>
              <UsageBar
                label="Transactions"
                used={usage.transactions?.used ?? 0}
                limit={usage.transactions?.limit ?? null}
              />
              <UsageBar
                label="Catégories"
                used={usage.categories?.used ?? 0}
                limit={usage.categories?.limit ?? null}
              />
            </div>
          )}

          {/* ── Section upgrade (free OU trial) ── */}
          {(isFree || isTrial) && (
            <div style={{
              background: '#fff', border: '1px solid #f0f0f0',
              borderRadius: 16, padding: 16, marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: '#26215C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap size={13} color="#AFA9EC" fill="#AFA9EC" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#222' }}>
                    {isTrial ? 'Conserver votre accès' : 'Choisir un plan'}
                  </div>
                  {isTrial && activePlan && (
                    <div style={{ fontSize: 11, color: '#aaa' }}>
                      Activez le plan {activePlan.label} avant la fin de votre essai
                    </div>
                  )}
                </div>
              </div>

              {/* Sélecteur 3 plans */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {PLANS.map(p => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    selected={resolvedId}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>

              {/* Features du plan sélectionné */}
              <div style={{
                background: '#fafafa', borderRadius: 10, padding: '10px 12px',
                marginBottom: 14, border: '1px solid #f0f0f0',
              }}>
                {selectedPlan.features.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    paddingBottom: i < selectedPlan.features.length - 1 ? 7 : 0,
                    marginBottom:  i < selectedPlan.features.length - 1 ? 7 : 0,
                    borderBottom:  i < selectedPlan.features.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                      background: selectedPlan.pill,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={10} color={selectedPlan.accent} strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 12, color: '#555' }}>{f}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setShowModal(true)} style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: selectedPlan.bg,
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Zap size={15} fill="#fff" color="#fff" />
                {isTrial ? 'Activer maintenant' : 'Activer'} — {fmt(selectedPlan.price)}/mois
              </button>
            </div>
          )}

          {/* ── Comparatif ── */}
          <div style={{
            background: '#fff', border: '1px solid #f0f0f0',
            borderRadius: 16, overflow: 'hidden', marginBottom: 14,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 56px 56px',
              padding: '10px 14px', background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb',
                textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Fonctionnalité
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb',
                textAlign: 'center' }}>Gratuit</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6C5CE7',
                textAlign: 'center' }}>Pro</span>
            </div>
            {FEATURES_TABLE.map(({ label, free, pro }, idx) => (
              <div key={label} style={{
                display: 'grid', gridTemplateColumns: '1fr 56px 56px',
                padding: '11px 14px', alignItems: 'center',
                borderBottom: idx < FEATURES_TABLE.length - 1 ? '1px solid #f9f9f9' : 'none',
                background: idx % 2 === 0 ? '#fff' : '#fdfdfd',
              }}>
                <span style={{ fontSize: 12, color: '#555' }}>{label}</span>
                <div style={{ textAlign: 'center' }}><FeatureVal val={free} /></div>
                <div style={{ textAlign: 'center' }}><FeatureVal val={pro} /></div>
              </div>
            ))}
          </div>

          {/* ── Annuler abonnement ── */}
          {isPaid && !isTrial && (
            !confirmCancel ? (
              <button onClick={() => setConfirmCancel(true)} style={{
                width: '100%', padding: 11, borderRadius: 12, cursor: 'pointer',
                background: 'transparent', border: '1px solid #F09595',
                color: '#E24B4A', fontWeight: 600, fontSize: 13,
              }}>
                Annuler mon abonnement
              </button>
            ) : (
              <div style={{
                border: '1px solid #F09595', borderRadius: 14,
                padding: 16, background: '#FCEBEB',
              }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <AlertTriangle size={16} color="#A32D2D"
                    style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700,
                      color: '#A32D2D', marginBottom: 4 }}>
                      Confirmer l'annulation ?
                    </div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
                      Vous perdrez l'accès à la fin de la période en cours.
                      {activePlan?.id !== 'pro' && (
                        <> Les membres de votre organisation repasseront également en mode gratuit.</>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmCancel(false)} style={{
                    flex: 1, padding: 11, borderRadius: 10, border: '1.5px solid #eee',
                    cursor: 'pointer', background: '#fff',
                    fontWeight: 600, fontSize: 13, color: '#888',
                  }}>Garder</button>
                  <button onClick={handleCancel} disabled={cancelling} style={{
                    flex: 2, padding: 11, borderRadius: 10, border: 'none',
                    cursor: 'pointer',
                    background: cancelling ? '#f0a0a0' : '#E24B4A',
                    fontWeight: 700, fontSize: 13, color: '#fff',
                  }}>
                    {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
                  </button>
                </div>
              </div>
            )
          )}

        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}