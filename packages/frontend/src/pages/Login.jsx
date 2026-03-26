import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
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

function Field({ label, type = 'text', placeholder, value, onChange, required, extra }) {
  const [show,    setShow]    = useState(false)
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
      {extra}
    </div>
  )
}

export default function Login() {
  const [f, setF]         = useState({ email: '', password: '' })
  const [err, setErr]     = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  // ✅ Plus besoin de navigate — PublicRoute redirige vers /dashboard
  // dès que user est défini dans AuthContext après login()

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await login(f)
      // ✅ Pas de nav('/dashboard') ici
      // login() met à jour user dans AuthContext
      // PublicRoute détecte user !== null et redirige automatiquement
    } catch (e) {
      setErr(e.response?.data?.error || 'Email ou mot de passe incorrect')
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
        width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20,
        padding: '36px 32px', border: '0.5px solid #eee',
        boxShadow: '0 4px 32px rgba(83,74,183,0.07)',
      }}>
        <Logo/>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#222', marginBottom: 6, textAlign: 'center' }}>
          Connexion
        </h1>
        <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>
          Bienvenue sur Dep<span style={{ color: '#534AB7' }}>enzo</span>
        </p>

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
          <Field label="Email"        type="email"    placeholder="vous@email.com" value={f.email}    onChange={set('email')}    required/>
          <Field label="Mot de passe" type="password" placeholder="••••••••"       value={f.password} onChange={set('password')} required
            extra={
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: '#534AB7', fontWeight: 600, textDecoration: 'none' }}>
                  Mot de passe oublié ?
                </Link>
              </div>
            }
          />

          <button type="submit" disabled={loading} style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 14,
            background: loading ? '#a09bda' : '#534AB7',
            border: 'none', color: '#EEEDFE', fontWeight: 700, fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.2s',
          }}>
            {loading
              ? <><span style={{ width: 16, height: 16, border: '2px solid #EEEDFE',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block' }}/> Connexion...</>
              : <>Se connecter <ArrowRight size={16}/></>
            }
          </button>
        </form>

        <div style={{ position: 'relative', margin: '24px 0', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#f0f0f0' }}/>
          <span style={{ position: 'relative', background: '#fff', padding: '0 12px', fontSize: 12, color: '#ccc' }}>ou</span>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', margin: 0 }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color: '#534AB7', fontWeight: 700, textDecoration: 'none' }}>Créer un compte</Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 8 }}>
          <Link to="/landing" style={{ color: '#bbb', textDecoration: 'none' }}>← Retour à l'accueil</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}