import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap } from 'lucide-react'
import { PLANS, formatPrice, formatYearlyPrice } from '../../config/pricingFeatures'

const CURRENCIES = [
  { key: 'mga', label: 'Ar' },
  { key: 'usd', label: '$' },
  { key: 'eur', label: '€' },
]

function CheckItem({ text }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
      fontSize: 13, color: '#555', marginBottom: 8 }}>
      <span style={{
        width: 18, height: 18, borderRadius: '50%', background: '#EEEDFE',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>
        <Check size={10} color="#534AB7" strokeWidth={2.5}/>
      </span>
      {text}
    </li>
  )
}

export default function PricingSection() {
  const navigate   = useNavigate()
  const [cur, setCur]       = useState('mga')
  const [yearly, setYearly] = useState(false)

  const handleCta = (plan) => {
    if (plan.key === 'business') {
      window.location.href = 'mailto:contact@depenzo.app'
    } else {
      navigate(`/register?plan=${plan.key}`)
    }
  }

  return (
    <section style={{ padding: '0 24px 40px' }}>

      {/* Titre */}
      <p style={{ fontSize: 11, fontWeight: 700, color: '#534AB7', textTransform: 'uppercase',
        letterSpacing: '0.6px', textAlign: 'center', marginBottom: 6 }}>
        Tarifs
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#222',
        textAlign: 'center', marginBottom: 20 }}>
        Simple et transparent
      </h2>

      {/* Sélecteur devise + facturation */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20, gap: 12 }}>

        {/* Toggle devise */}
        <div style={{ display: 'flex', background: '#f5f5f5',
          borderRadius: 10, padding: 3, gap: 2 }}>
          {CURRENCIES.map(c => (
            <button key={c.key} onClick={() => setCur(c.key)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: cur === c.key ? '#fff' : 'transparent',
              color:      cur === c.key ? '#534AB7' : '#aaa',
              boxShadow:  cur === c.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>{c.label}</button>
          ))}
        </div>

        {/* Toggle mensuel / annuel */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', fontSize: 12, color: '#888' }}>
          <span style={{ color: !yearly ? '#534AB7' : '#aaa', fontWeight: !yearly ? 600 : 400 }}>
            Mensuel
          </span>
          <div onClick={() => setYearly(v => !v)} style={{
            width: 36, height: 20, borderRadius: 10,
            background: yearly ? '#534AB7' : '#ddd',
            position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute', top: 2,
              left: yearly ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }}/>
          </div>
          <span style={{ color: yearly ? '#534AB7' : '#aaa', fontWeight: yearly ? 600 : 400 }}>
            Annuel
          </span>
          {yearly && (
            <span style={{ background: '#E1F5EE', color: '#0F6E56',
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20 }}>
              2 mois offerts
            </span>
          )}
        </label>
      </div>

      {/* Cartes plans */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PLANS.map(plan => {
          const price      = yearly && plan.price[cur] > 0
            ? formatYearlyPrice(plan, cur)
            : formatPrice(plan, cur)
          const monthLabel = yearly ? '/ an' : '/ mois'

          return (
            <div key={plan.key} style={{
              borderRadius: 16, padding: 20,
              border: plan.highlight ? '2px solid #534AB7' : '0.5px solid #eee',
              background: plan.highlight ? '#fff' : '#f7f7f7',
            }}>
              {/* Badge essai */}
              {plan.trial && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#EEEDFE', color: '#3C3489',
                  fontSize: 11, fontWeight: 700, padding: '3px 10px',
                  borderRadius: 20, marginBottom: 10,
                }}>
                  <Zap size={10} strokeWidth={2.5}/>
                  {plan.trial} mois d'essai offerts
                </div>
              )}

              <div style={{ fontSize: 17, fontWeight: 800, color: '#222', marginBottom: 2 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>{plan.desc}</div>

              {/* Prix */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: plan.price[cur] === 0 ? 22 : 26,
                  fontWeight: 800, color: '#222' }}>
                  {yearly && plan.price[cur] > 0 ? price : formatPrice(plan, cur)}
                </span>
                {plan.price[cur] > 0 && !yearly && (
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#aaa' }}>
                    {' '}{monthLabel}
                  </span>
                )}
                {yearly && plan.price[cur] > 0 && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    soit {formatPrice(plan, cur)} / mois · 2 mois offerts
                  </div>
                )}
                {plan.key === 'pro' && cur === 'mga' && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                    ou $4.99 USD / {yearly ? 'mois' : 'mois'} à l'international
                  </div>
                )}
              </div>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16 }}>
                {plan.features.map(f => <CheckItem key={f} text={f}/>)}
              </ul>

              <button onClick={() => handleCta(plan)} style={{
                width: '100%', padding: 13, borderRadius: 12,
                background: plan.highlight ? '#534AB7' : 'transparent',
                border: plan.highlight ? 'none' : '1px solid #ddd',
                color: plan.highlight ? '#EEEDFE' : '#888',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                {plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* Note bas de page */}
      <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 16 }}>
        Paiement sécurisé · Annulation à tout moment · Sans engagement
      </p>
    </section>
  )
}