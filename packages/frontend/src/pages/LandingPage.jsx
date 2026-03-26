import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  FileText, Clock, TrendingUp, Bell, Check, ArrowRight,
  X, User, Users, Briefcase, Zap, AlertTriangle,
  CheckCircle, Copy, Upload, Smartphone, CreditCard,
} from 'lucide-react'
import api from '../utils/api'

// ── Logo ──────────────────────────────────────────────────────────
function Logo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="12" fill="#534AB7"/>
      <rect x="10" y="20" width="24" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
      <rect x="10" y="26" width="16" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
      <circle cx="28" cy="16" r="7" fill="#EEEDFE" opacity="0.15"/>
      <circle cx="28" cy="16" r="5" fill="none" stroke="#EEEDFE" strokeWidth="1.5"/>
      <path d="M28 13v3l2 1.5" stroke="#EEEDFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="10" y="13" width="11" height="3" rx="1.5" fill="#EEEDFE"/>
    </svg>
  )
}

// ── Config plans ──────────────────────────────────────────────────
const PLANS = [
  {
    id:       'pro',
    label:    'Pro',
    sublabel: 'Personnel',
    price:    5000,
    priceUsd: 1.49,
    maxUsers: 1,
    Icon:     User,
    bg:       '#26215C',
    accent:   '#7F77DD',
    text:     '#AFA9EC',
    pill:     '#EEEDFE',
    pillText: '#3C3489',
    badge:    null,
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
    sublabel: 'Jusqu\'à 5 membres',
    price:    15000,
    priceUsd: 4.99,
    maxUsers: 5,
    Icon:     Users,
    bg:       '#04342C',
    accent:   '#1D9E75',
    text:     '#9FE1CB',
    pill:     '#E1F5EE',
    pillText: '#085041',
    badge:    'Populaire',
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
    sublabel: 'Membres illimités',
    price:    40000,
    priceUsd: 12.99,
    maxUsers: null,
    Icon:     Briefcase,
    bg:       '#4A1B0C',
    accent:   '#D85A30',
    text:     '#F0997B',
    pill:     '#FAECE7',
    pillText: '#712B13',
    badge:    null,
    features: [
      'Tout le plan Famille',
      'Membres illimités',
      'Gestion des rôles',
      'Rapports d\'équipe',
    ],
  },
]

const DURATIONS = [
  { months: 1,  label: '1 mois', badge: null   },
  { months: 3,  label: '3 mois', badge: null   },
  { months: 12, label: '1 an',   badge: '-17%' },
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

const FEATURES_LIST = [
  { icon: FileText,   title: 'Suivi dépenses & revenus',  desc: 'Catégorisez chaque transaction en quelques secondes. Ponctuelles ou récurrentes.' },
  { icon: Clock,      title: 'Dépenses récurrentes',       desc: 'Jirama, loyer, abonnements — ne ratez plus aucune échéance mensuelle.' },
  { icon: TrendingUp, title: 'Rapports visuels',           desc: 'Graphiques clairs par mois, par catégorie. Voyez où va votre argent.' },
  { icon: Bell,       title: 'Alertes de budget',          desc: 'Fixez un plafond par catégorie et recevez une alerte quand vous approchez la limite.' },
]

const MOCK_ROWS = [
  { label: 'Salaire',  sub: '1 mars',    amount: '+850 000 Ar', color: '#0F6E56', bg: '#EAF3DE' },
  { label: 'Loyer',    sub: '5 mars',    amount: '-250 000 Ar', color: '#A32D2D', bg: '#FAECE7' },
  { label: 'Jirama',   sub: 'Récurrent', amount: '-45 000 Ar',  color: '#A32D2D', bg: '#E1F5EE' },
]

// ── Helpers ───────────────────────────────────────────────────────
function MockRow({ label, sub, amount, color, bg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff', borderRadius: 10,
      padding: '10px 12px', border: '0.5px solid #eee',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, opacity: 0.6 }}/>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#aaa' }}>{sub}</div>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color }}>{amount}</div>
    </div>
  )
}

// ── Modal paiement (standalone, sans auth) ────────────────────────
function PaymentModal({ plan, onClose, onSuccess }) {
  const [tab,         setTab]         = useState('mobile')
  const [months,      setMonths]      = useState(1)
  const [operator,    setOperator]    = useState('mvola')
  const [senderNum,   setSenderNum]   = useState('')
  const [justif,      setJustif]      = useState(null)
  const [copied,      setCopied]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [ussdClicked, setUssdClicked] = useState(false)
  const navigate                      = useNavigate()

  const op       = OPERATORS.find(o => o.id === operator)
  const total    = plan.price * months
  const ussdCode = op.ussd(op.number, total)

  const fmt = n => n.toLocaleString('fr-MG') + ' Ar'

  const copy = txt =>
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(txt); setTimeout(() => setCopied(null), 2000)
    })

  // Si non connecté → rediriger vers register avec le plan en param
  const requireAuth = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      onClose()
      navigate(`/register?plan=${plan.id}&months=${months}`)
      return false
    }
    return true
  }

  const submitMobile = async () => {
    if (!requireAuth()) return
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
    if (!requireAuth()) return
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
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, background: '#fff',
        borderRadius: '24px 24px 0 0', maxHeight: '94vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0' }}/>
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
              <plan.Icon size={16} color={plan.text}/>
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
            <X size={16} color="#888"/>
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
              { id: 'mobile', label: 'Mobile Money',  Icon: Smartphone  },
              { id: 'card',   label: 'Carte bancaire', Icon: CreditCard  },
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
                <Icon size={13} strokeWidth={2}/>{label}
              </button>
            ))}
          </div>

          {msg && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14,
              background: '#FCEBEB', borderRadius: 10, padding: '10px 12px',
              border: '1px solid #F09595', fontSize: 12, color: '#A32D2D',
            }}>
              <AlertTriangle size={14}/>{msg}
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
                  <QRCodeSVG value={ussdCode} size={94} bgColor="#fff" fgColor="#222" level="M"/>
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
                      {copied === op.number ? <Check size={11}/> : <Copy size={11}/>}
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
                      <Smartphone size={11}/>Composer
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

              {/* Code USSD */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#f7f7f7', borderRadius: 10, padding: '10px 12px',
                marginBottom: 14, border: '1px solid #f0f0f0',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#333' }}>{ussdCode}</span>
                <button onClick={() => copy(ussdCode)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: plan.accent,
                }}>
                  {copied === ussdCode ? <Check size={13}/> : <Copy size={13}/>}
                </button>
              </div>

              {ussdClicked && (
                <div style={{
                  border: '1px solid #9FE1CB', borderRadius: 12, padding: '12px 14px',
                  background: '#E1F5EE', marginBottom: 12,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <CheckCircle size={15} color="#0F6E56" style={{ flexShrink: 0, marginTop: 1 }}/>
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
                  style={{ display: 'none' }}/>
                {justif
                  ? <><CheckCircle size={14}/>{justif.name}</>
                  : <><Upload size={14}/>Justificatif · capture SMS ou app</>
                }
              </label>

              <button onClick={submitMobile} disabled={loading || !justif} style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: (!justif || loading) ? '#ccc' : plan.bg,
                color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: (!justif || loading) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Zap size={15}/>
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
                      fontSize: 11, fontWeight: 700,
                      color: plan.pillText, background: plan.pill,
                      borderRadius: 6, padding: '3px 8px',
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
                <CreditCard size={15}/>
                {loading
                  ? 'Redirection...'
                  : `Payer $${(plan.priceUsd * months).toFixed(2)} avec Stripe`}
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

// ── Section pricing ───────────────────────────────────────────────
function PricingSection() {
  const [activePlan,  setActivePlan]  = useState(null)   // plan ouvert dans le modal
  const [successMsg,  setSuccessMsg]  = useState(null)
  const navigate = useNavigate()

  const fmt = n => n.toLocaleString('fr-MG') + ' Ar'

  const handleSelect = (plan) => {
    // Vérifier si connecté
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      // Non connecté → register avec pré-sélection du plan
      navigate(`/register?plan=${plan.id}`)
      return
    }
    setActivePlan(plan)
  }

  return (
    <section style={{ padding: '0 16px 36px' }}>
      {activePlan && (
        <PaymentModal
          plan={activePlan}
          onClose={() => setActivePlan(null)}
          onSuccess={msg => { setActivePlan(null); setSuccessMsg(msg) }}
        />
      )}

      <p style={{ fontSize: 11, fontWeight: 700, color: '#534AB7', textTransform: 'uppercase',
        letterSpacing: '0.6px', textAlign: 'center', marginBottom: 6 }}>
        Tarifs
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#222', textAlign: 'center', marginBottom: 6 }}>
        Choisissez votre plan
      </h2>
      <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center', marginBottom: 20 }}>
        2 mois d'essai gratuit · Sans engagement
      </p>

      {successMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          background: '#E1F5EE', borderRadius: 10, padding: '11px 14px',
          border: '1px solid #9FE1CB',
        }}>
          <CheckCircle size={14} color="#0F6E56"/>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0F6E56' }}>{successMsg}</span>
        </div>
      )}

      {/* Plan gratuit */}
      <div style={{
        background: '#f7f7f7', border: '1px solid #eee',
        borderRadius: 16, padding: 16, marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#222' }}>Gratuit</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Pour commencer</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#222' }}>0 Ar</div>
        </div>
        {[
          "Jusqu'à 30 transactions / mois",
          '3 catégories',
          'Rapport mensuel basique',
          'Invitable dans une organisation',
        ].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 8, background: '#eee',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Check size={9} color="#aaa" strokeWidth={3}/>
            </div>
            <span style={{ fontSize: 12, color: '#888' }}>{f}</span>
          </div>
        ))}
        <button onClick={() => navigate('/register')} style={{
          width: '100%', marginTop: 12, padding: '11px', borderRadius: 10,
          background: 'transparent', border: '1.5px solid #ddd',
          color: '#888', fontWeight: 600, fontSize: 13, cursor: 'pointer',
        }}>
          Commencer gratuitement
        </button>
      </div>

      {/* Plans payants */}
      {PLANS.map(plan => (
        <div key={plan.id} style={{
          background: '#fff', border: `1.5px solid ${plan.accent}22`,
          borderRadius: 16, padding: 16, marginBottom: 12,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Bande colorée top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: plan.accent, borderRadius: '16px 16px 0 0',
          }}/>

          {plan.badge && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              fontSize: 10, fontWeight: 700,
              background: plan.pill, color: plan.pillText,
              borderRadius: 20, padding: '3px 9px',
            }}>
              {plan.badge}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: plan.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <plan.Icon size={16} color={plan.text}/>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#222' }}>{plan.label}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>{plan.sublabel}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: plan.accent }}>
                {fmt(plan.price)}
              </div>
              <div style={{ fontSize: 10, color: '#bbb' }}>/ mois</div>
            </div>
          </div>

          {plan.features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 16, height: 16, borderRadius: 8, background: plan.pill, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={9} color={plan.accent} strokeWidth={3}/>
              </div>
              <span style={{ fontSize: 12, color: '#555' }}>{f}</span>
            </div>
          ))}

          <button onClick={() => handleSelect(plan)} style={{
            width: '100%', marginTop: 14, padding: '12px', borderRadius: 10,
            background: plan.bg, border: 'none',
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Zap size={13} fill="#fff" color="#fff"/>
            Choisir {plan.label}
          </button>

          <p style={{ fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 6, marginBottom: 0 }}>
            2 mois d'essai gratuit inclus
          </p>
        </div>
      ))}
    </section>
  )
}

// ── Page principale ───────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: '48px 24px 36px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <Logo size={44}/>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#222', letterSpacing: -0.5 }}>
            Dep<span style={{ color: '#534AB7' }}>enzo</span>
          </span>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#EEEDFE', color: '#3C3489',
          fontSize: 12, fontWeight: 600, padding: '5px 14px',
          borderRadius: 20, marginBottom: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#534AB7' }}/>
          Essai gratuit 2 mois — sans carte bancaire
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#222', lineHeight: 1.3, marginBottom: 12 }}>
          Maîtrisez vos{' '}
          <span style={{ color: '#534AB7' }}>dépenses</span>,<br/>
          reprenez le contrôle
        </h1>
        <p style={{ fontSize: 15, color: '#888', lineHeight: 1.6, maxWidth: 340, margin: '0 auto 28px' }}>
          Suivez revenus, dépenses et budgets en un coup d'œil. Simple, rapide, conçu pour vous.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate('/register')} style={{
            background: '#534AB7', color: '#EEEDFE', border: 'none',
            borderRadius: 14, padding: '14px 32px', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', width: '100%', maxWidth: 280,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            Commencer gratuitement <ArrowRight size={16}/>
          </button>
          <button onClick={() => navigate('/demo')} style={{
            background: 'transparent', color: '#888',
            border: '1px solid #eee', borderRadius: 14,
            padding: '13px 32px', fontSize: 14, cursor: 'pointer',
            width: '100%', maxWidth: 280,
          }}>
            Voir la démo
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#bbb' }}>2 mois offerts · Pas d'engagement · Annulation libre</p>
      </section>

      {/* ── Mockup dashboard ── */}
      <section style={{ margin: '0 16px 36px', background: '#f7f7f7', borderRadius: 16, padding: 16, border: '0.5px solid #eee' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>Accueil</span>
          <span style={{ fontSize: 12, color: '#aaa' }}>Mars 2026</span>
        </div>

        <div style={{
          background: '#534AB7', borderRadius: 12, padding: 16,
          marginBottom: 12, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#AFA9EC', marginBottom: 4 }}>Solde du mois</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#EEEDFE' }}>+ 342 500 Ar</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Revenus',  val: '850 000 Ar', color: '#0F6E56' },
            { label: 'Dépenses', val: '507 500 Ar', color: '#A32D2D' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background: '#fff', borderRadius: 10,
              padding: '10px 12px', border: '0.5px solid #eee',
            }}>
              <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MOCK_ROWS.map(r => <MockRow key={r.label} {...r}/>)}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '0 24px 36px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#534AB7', textTransform: 'uppercase',
          letterSpacing: '0.6px', textAlign: 'center', marginBottom: 6 }}>
          Fonctionnalités
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#222', textAlign: 'center', marginBottom: 20 }}>
          Tout ce dont vous avez besoin
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FEATURES_LIST.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              background: '#f7f7f7', borderRadius: 14,
              padding: 16, border: '0.5px solid #eee',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: '#EEEDFE',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={18} color="#534AB7" strokeWidth={1.8}/>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#222', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection/>

      {/* ── Footer CTA ── */}
      <section style={{
        textAlign: 'center', padding: '32px 24px 48px',
        borderTop: '1px solid #f0f0f0',
      }}>
        <div style={{ marginBottom: 12 }}>
          <Logo size={36}/>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#222', marginBottom: 8 }}>
          Prêt à reprendre le contrôle ?
        </h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
          Rejoignez Depenzo aujourd'hui.<br/>2 mois gratuits, sans engagement.
        </p>
        <button onClick={() => navigate('/register')} style={{
          background: '#534AB7', color: '#EEEDFE', border: 'none',
          borderRadius: 14, padding: '14px 32px', fontSize: 15,
          fontWeight: 700, cursor: 'pointer', width: '100%', maxWidth: 260,
        }}>
          Créer mon compte
        </button>
      </section>

    </div>
  )
}