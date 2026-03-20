import { useNavigate } from 'react-router-dom'
import {
  FileText, Clock, TrendingUp, Bell,
  Check, ArrowRight
} from 'lucide-react'
import PricingSection from '../components/ui/PricingSection'

// ─── Logo ─────────────────────────────────────────────────────────────────────
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

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: FileText,
    title: 'Suivi dépenses & revenus',
    desc: 'Catégorisez chaque transaction en quelques secondes. Ponctuelles ou récurrentes.',
  },
  {
    icon: Clock,
    title: 'Dépenses récurrentes',
    desc: 'Jirama, loyer, abonnements — ne ratez plus aucune échéance mensuelle.',
  },
  {
    icon: TrendingUp,
    title: 'Rapports visuels',
    desc: 'Graphiques clairs par mois, par catégorie. Voyez où va votre argent.',
  },
  {
    icon: Bell,
    title: 'Alertes de budget',
    desc: 'Fixez un plafond par catégorie et recevez une alerte quand vous approchez la limite.',
  },
]

const FREE_FEATURES  = [
  "Jusqu'à 30 transactions/mois",
  '3 catégories',
  'Rapport mensuel basique',
]

const PRO_FEATURES = [
  'Transactions illimitées',
  'Catégories & budgets illimités',
  'Dépenses récurrentes',
  'Rapports avancés & exports',
  'Alertes de budget',
  'Multi-devises (Ar, €, $)',
]

const MOCK_ROWS = [
  { label: 'Salaire',  sub: '1 mars',    amount: '+850 000 Ar', color: '#0F6E56', bg: '#EAF3DE', type: 'in'  },
  { label: 'Loyer',    sub: '5 mars',    amount: '-250 000 Ar', color: '#A32D2D', bg: '#FAECE7', type: 'out' },
  { label: 'Jirama',   sub: 'Récurrent', amount: '-45 000 Ar',  color: '#A32D2D', bg: '#E1F5EE', type: 'out' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <span style={{
      width: 18, height: 18, borderRadius: '50%', background: '#EEEDFE',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Check size={10} color="#534AB7" strokeWidth={2.5}/>
    </span>
  )
}

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

// ─── Main ─────────────────────────────────────────────────────────────────────
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
          Essai gratuit 3 mois — sans carte bancaire
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
        <p style={{ fontSize: 12, color: '#bbb' }}>3 mois offerts · Pas d'engagement · Annulation libre</p>
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
            { label: 'Revenus',   val: '850 000 Ar', color: '#0F6E56' },
            { label: 'Dépenses',  val: '507 500 Ar', color: '#A32D2D' },
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
        <p style={{ fontSize: 11, fontWeight: 700, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'center', marginBottom: 6 }}>
          Fonctionnalités
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#222', textAlign: 'center', marginBottom: 20 }}>
          Tout ce dont vous avez besoin
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
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
      <PricingSection />

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
          Rejoignez Depenzo aujourd'hui.<br/>3 mois gratuits, sans engagement.
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