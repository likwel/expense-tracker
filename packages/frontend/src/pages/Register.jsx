import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const CURRENCIES = [
  { code: 'MGA', symbol: 'Ar', label: 'Ariary malgache' },
  { code: 'EUR', symbol: '€',  label: 'Euro'            },
  { code: 'USD', symbol: '$',  label: 'Dollar US'       },
  { code: 'GBP', symbol: '£',  label: 'Livre sterling'  },
]

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
      <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
        <rect width="44" height="44" rx="12" fill="#534AB7"/>
        <rect x="10" y="20" width="24" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
        <rect x="10" y="26" width="16" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
        <circle cx="28" cy="16" r="7" fill="#EEEDFE" opacity="0.15"/>
        <circle cx="28" cy="16" r="5" fill="none" stroke="#EEEDFE" strokeWidth="1.5"/>
        <path d="M28 13v3l2 1.5" stroke="#EEEDFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="10" y="13" width="11" height="3" rx="1.5" fill="#EEEDFE"/>
      </svg>
      <span style={{ fontSize: 22, fontWeight: 800, color: '#222', letterSpacing: -0.5 }}>
        Dep<span style={{ color: '#534AB7' }}>enzo</span>
      </span>
    </div>
  )
}

function Field({ label, type = 'text', placeholder, value, onChange, required }) {
  const [show, setShow]       = useState(false)
  const [focused, setFocused] = useState(false)
  const isPassword = type === 'password'

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700,
        color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && show ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: isPassword ? '12px 44px 12px 14px' : '12px 14px',
            borderRadius: 12, fontSize: 14, color: '#222', outline: 'none',
            border: `1.5px solid ${focused ? '#534AB7' : '#eee'}`,
            background: '#fafafa', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 2,
          }}>
            {show ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        )}
      </div>
    </div>
  )
}

// Indicateur de force du mot de passe
function PasswordStrength({ password }) {
  if (!password) return null
  const hasLen    = password.length >= 8
  const hasNum    = /\d/.test(password)
  const hasUpper  = /[A-Z]/.test(password)
  const score     = [hasLen, hasNum, hasUpper].filter(Boolean).length
  const labels    = ['Faible', 'Moyen', 'Fort']
  const colors    = ['#E24B4A', '#EF9F27', '#1D9E75']

  return (
    <div style={{ marginTop: -8, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score - 1] : '#eee',
            transition: 'background 0.2s',
          }}/>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { ok: hasLen,   text: '8 caractères min.' },
          { ok: hasNum,   text: 'Un chiffre'        },
          { ok: hasUpper, text: 'Une majuscule'     },
        ].map(({ ok, text }) => (
          <span key={text} style={{ fontSize: 11, color: ok ? '#1D9E75' : '#ccc',
            display: 'flex', alignItems: 'center', gap: 3 }}>
            <Check size={10} strokeWidth={ok ? 3 : 2}/>
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '', currency: 'MGA' })
  const [agreed, setAgreed]   = useState(false)
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const nav = useNavigate()

  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (f.password.length < 6) return setErr('Le mot de passe doit faire au moins 6 caractères')
    if (!agreed) return setErr('Vous devez accepter les CGU et la politique de confidentialité')
    setLoading(true)
    try {
      await register(f)
      nav('/dashboard')
    } catch (e) {
      setErr(e.response?.data?.error || "Erreur lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f7f6fd', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#fff', borderRadius: 20,
        padding: '36px 32px', border: '0.5px solid #eee',
        boxShadow: '0 4px 32px rgba(83,74,183,0.07)',
      }}>
        <Logo/>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#222', marginBottom: 6, textAlign: 'center' }}>
          Créer un compte
        </h1>
        <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>
          Commencez à suivre vos finances
        </p>

        {/* Badge essai */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: '#E1F5EE', borderRadius: 10, padding: '9px 14px', marginBottom: 20,
        }}>
          <Check size={14} color="#0F6E56" strokeWidth={2.5}/>
          <span style={{ fontSize: 13, color: '#0F6E56', fontWeight: 600 }}>
            3 mois Pro offerts — sans carte bancaire
          </span>
        </div>

        {/* Erreur */}
        {err && (
          <div style={{
            background: '#fdecea', color: '#c0392b', borderRadius: 10,
            padding: '10px 14px', marginBottom: 20, fontSize: 13,
            border: '1px solid #f5c6cb', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⚠</span> {err}
          </div>
        )}

        <form onSubmit={submit}>
          <Field label="Nom complet"  type="text"     placeholder="Jean Dupont"
            value={f.name}     onChange={set('name')}     required/>
          <Field label="Email"        type="email"    placeholder="vous@email.com"
            value={f.email}    onChange={set('email')}    required/>
          <Field label="Mot de passe" type="password" placeholder="Min. 8 caractères"
            value={f.password} onChange={set('password')} required/>
          <PasswordStrength password={f.password}/>

          {/* Devise */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700,
              color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
              Devise principale
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CURRENCIES.map(c => (
                <button key={c.code} type="button" onClick={() => setF(p => ({ ...p, currency: c.code }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${f.currency === c.code ? '#534AB7' : '#eee'}`,
                    background: f.currency === c.code ? '#EEEDFE' : '#fafafa',
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 16, fontWeight: 700,
                    color: f.currency === c.code ? '#534AB7' : '#aaa' }}>
                    {c.symbol}
                  </span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 600,
                      color: f.currency === c.code ? '#3C3489' : '#444' }}>
                      {c.code}
                    </div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>{c.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Checkbox CGU */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            marginTop: 4, marginBottom: 20, cursor: 'pointer',
          }}>
            <div
              onClick={() => setAgreed(v => !v)}
              style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                border: `2px solid ${agreed ? '#534AB7' : '#ddd'}`,
                background: agreed ? '#534AB7' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', cursor: 'pointer',
              }}
            >
              {agreed && <Check size={12} color="#fff" strokeWidth={3}/>}
            </div>
            <span style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              J'ai lu et j'accepte les{' '}
              <Link
                to="/terms"
                onClick={e => e.stopPropagation()}
                style={{ color: '#534AB7', fontWeight: 600, textDecoration: 'none' }}
              >
                Conditions générales d'utilisation
              </Link>
              {' '}et la{' '}
              <Link
                to="/privacy"
                onClick={e => e.stopPropagation()}
                style={{ color: '#534AB7', fontWeight: 600, textDecoration: 'none' }}
              >
                politique de confidentialité
              </Link>
            </span>
          </label>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: loading ? '#a09bda' : !agreed ? '#c4bfed' : '#534AB7',
            border: 'none', color: '#EEEDFE', fontWeight: 700, fontSize: 15,
            cursor: loading || !agreed ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.2s',
          }}>
            {loading ? (
              <>
                <span style={{
                  width: 16, height: 16, border: '2px solid #EEEDFE',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }}/>
                Création du compte...
              </>
            ) : (
              <>Créer mon compte <ArrowRight size={16}/></>
            )}
          </button>
        </form>

        <div style={{ position: 'relative', margin: '20px 0', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#f0f0f0' }}/>
          <span style={{ position: 'relative', background: '#fff', padding: '0 12px', fontSize: 12, color: '#ccc' }}>ou</span>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', margin: 0 }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: '#534AB7', fontWeight: 700, textDecoration: 'none' }}>
            Se connecter
          </Link>
        </p>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 8 }}>
          <Link to="/landing" style={{ color: '#bbb', textDecoration: 'none' }}>← Retour à l'accueil</Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}