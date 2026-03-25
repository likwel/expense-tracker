import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Check, User, Users, Building2, Search, Plus, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

const CURRENCIES = [
  { code: 'MGA', symbol: 'Ar', label: 'Ariary malgache' },
  { code: 'EUR', symbol: '€',  label: 'Euro'            },
  { code: 'USD', symbol: '$',  label: 'Dollar US'       },
  { code: 'GBP', symbol: '£',  label: 'Livre sterling'  },
]

const USAGE_TYPES = [
  { code: 'personal', label: 'Personnel',   sub: 'Usage individuel',      Icon: User,      color: '#534AB7', bg: '#EEEDFE' },
  { code: 'family',   label: 'Famille',     sub: 'Comptes partagés',      Icon: Users,     color: '#0F6E56', bg: '#E1F5EE' },
  { code: 'business', label: 'Entreprise',  sub: 'Gestion pro',           Icon: Building2, color: '#BA7517', bg: '#FAEEDA' },
]

/* ─── Étape 1 : Infos personnelles ──────────────────────────────── */
function StepPersonal({ f, setF }) {
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
  return (
    <>
      <Field label="Nom complet"  type="text"     placeholder="Jean Dupont"       value={f.name}     onChange={set('name')}/>
      <Field label="Email"        type="email"    placeholder="vous@email.com"    value={f.email}    onChange={set('email')}/>
      <Field label="Mot de passe" type="password" placeholder="Min. 8 caractères" value={f.password} onChange={set('password')}/>
      <PasswordStrength password={f.password}/>
      <div style={{ marginBottom:20 }}>
        <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#888',
          textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>
          Devise principale
        </label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {CURRENCIES.map(c => (
            <button key={c.code} type="button" onClick={() => setF(p => ({ ...p, currency: c.code }))}
              style={{
                display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:12,
                cursor:'pointer', border:`1.5px solid ${f.currency===c.code ? '#534AB7' : '#eee'}`,
                background: f.currency===c.code ? '#EEEDFE' : '#fafafa', transition:'all 0.15s',
              }}>
              <span style={{ fontSize:16, fontWeight:700, color: f.currency===c.code ? '#534AB7' : '#aaa' }}>
                {c.symbol}
              </span>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:12, fontWeight:600, color: f.currency===c.code ? '#3C3489' : '#444' }}>{c.code}</div>
                <div style={{ fontSize:10, color:'#aaa' }}>{c.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/* ─── Étape 2 : Type d'utilisation ──────────────────────────────── */
function StepUsage({ f, setF }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:8 }}>
      {USAGE_TYPES.map(({ code, label, sub, Icon, color, bg }) => {
        const active = f.usageType === code
        return (
          <button key={code} type="button" onClick={() => setF(p => ({ ...p, usageType: code }))}
            style={{
              display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:14,
              cursor:'pointer', textAlign:'left', transition:'all 0.15s',
              border:`1.5px solid ${active ? color : '#eee'}`,
              background: active ? bg : '#fafafa',
            }}>
            <div style={{
              width:42, height:42, borderRadius:12, flexShrink:0,
              background: active ? color : '#f0f0f0',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Icon size={20} color={active ? '#fff' : '#aaa'} strokeWidth={1.8}/>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color: active ? color : '#222' }}>{label}</div>
              <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{sub}</div>
            </div>
            {active && (
              <div style={{ marginLeft:'auto', width:22, height:22, borderRadius:11,
                background: color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Check size={13} color="#fff" strokeWidth={3}/>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Étape 3 : Organisation ─────────────────────────────────────── */
function StepOrg({ f, setF }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [mode,    setMode]    = useState(null)
  const debounceRef = useRef(null)

  const typeLabel = f.usageType === 'family' ? 'famille' : 'organisation'
  const TypeIcon  = f.usageType === 'family' ? Users : Building2
  const color     = f.usageType === 'family' ? '#0F6E56' : '#BA7517'
  const bg        = f.usageType === 'family' ? '#E1F5EE' : '#FAEEDA'

  // ✅ Debounce — évite de chercher à chaque frappe
  const handleChange = (val) => {
    
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await api.get(`/organizations/search?q=${encodeURIComponent(val)}&type=${f.usageType}`)
        setResults(Array.isArray(data) ? data : [])
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 400)
  }

  const clear = () => { setQuery(''); setResults([]) }

  const selectOrg = (org) => {
    setF(p => ({ ...p, orgId: org.id, orgName: '', orgCreate: false }))
    setMode('join')
    setQuery(org.name)
    setResults([])
  }

  const toggleCreate = () => {
    const next = mode !== 'create'
    setMode(next ? 'create' : null)
    setF(p => ({ ...p, orgId: null, orgCreate: next }))
  }

  const skip = () => {
    setF(p => ({ ...p, orgId: null, orgName: '', orgCreate: false }))
    setMode(null)
    clear()
  }

  return (
    <div style={{ marginBottom:8 }}>
      <p style={{ fontSize:13, color:'#888', marginBottom:16, lineHeight:1.5 }}>
        Rejoignez une {typeLabel} existante ou créez-en une nouvelle.
      </p>

      {/* Recherche */}
      {mode !== 'create' && (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fafafa',
            borderRadius:12, padding:'10px 14px', border:'1.5px solid #eee' }}>
            <Search size={14} color="#bbb" style={{ flexShrink:0 }}/>
            <input
              type="text"
              value={query}
              onChange={e => handleChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
              placeholder={`Rechercher une ${typeLabel}...`}
              style={{ border:'none', background:'none', outline:'none',
                fontSize:14, color:'#222', flex:1, minWidth:0 }}
            />
            {loading && (
              <span style={{ width:14, height:14, border:'2px solid #ddd', borderTopColor:'#534AB7',
                borderRadius:'50%', animation:'spin 0.7s linear infinite',
                display:'inline-block', flexShrink:0 }}/>
            )}
            {query.length > 0 && !loading && (
              <button type="button" onClick={clear}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', padding:0, flexShrink:0 }}>
                <X size={13}/>
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
              {results.map(org => (
                <button key={org.id} type="button" onClick={() => selectOrg(org)}
                  style={{
                    display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                    borderRadius:12, border:`1.5px solid ${f.orgId===org.id ? color : '#eee'}`,
                    background: f.orgId===org.id ? bg : '#fff', cursor:'pointer', textAlign:'left',
                  }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:bg,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <TypeIcon size={18} color={color} strokeWidth={1.8}/>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#222' }}>{org.name}</div>
                    <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                      {org._count?.members || 0} membre{(org._count?.members||0) > 1 ? 's' : ''}
                    </div>
                  </div>
                  {f.orgId === org.id && (
                    <div style={{ marginLeft:'auto', width:20, height:20, borderRadius:10,
                      background:color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Check size={12} color="#fff" strokeWidth={3}/>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          {query.length >= 2 && !loading && results.length === 0 && (
            <div style={{ fontSize:12, color:'#aaa', textAlign:'center', padding:'8px 0' }}>
              Aucune {typeLabel} trouvée
            </div>
          )}
        </div>
      )}

      {/* Créer */}
      {mode !== 'join' && (
        <button type="button" onClick={toggleCreate}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px',
            borderRadius:14, cursor:'pointer', textAlign:'left',
            border:`1.5px solid ${mode==='create' ? color : '#eee'}`,
            background: mode==='create' ? bg : '#fafafa',
          }}>
          <div style={{ width:36, height:36, borderRadius:10,
            background: mode==='create' ? color : '#f0f0f0',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Plus size={18} color={mode==='create' ? '#fff' : '#aaa'} strokeWidth={2}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color: mode==='create' ? color : '#222' }}>
              Créer une nouvelle {typeLabel}
            </div>
            <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>Vous en serez le fondateur</div>
          </div>
        </button>
      )}

      {mode === 'create' && (
        <div style={{ marginTop:10 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#888',
            textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>
            Nom de la {typeLabel}
          </label>
          <input
            type="text"
            value={f.orgName || ''}
            onChange={e => setF(p => ({ ...p, orgName: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            placeholder={f.usageType==='family' ? 'Famille Dupont' : 'Mon Entreprise'}
            style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:12,
              border:'1.5px solid #eee', fontSize:14, color:'#222', outline:'none', background:'#fafafa' }}
          />
        </div>
      )}

      <button type="button" onClick={skip}
        style={{ width:'100%', marginTop:12, padding:'10px', borderRadius:12,
          background:'none', border:'none', cursor:'pointer',
          fontSize:13, color:'#bbb', textDecoration:'underline' }}>
        Continuer sans organisation
      </button>
    </div>
  )
}

/* ─── Sous-composants ────────────────────────────────────────────── */
function Field({ label, type='text', placeholder, value, onChange }) {
  const [show,    setShow]   = useState(false)
  const [focused, setFocus]  = useState(false)
  const isPwd = type === 'password'
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#888',
        textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input
          type={isPwd && show ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
          style={{ width:'100%', padding: isPwd ? '12px 44px 12px 14px' : '12px 14px',
            borderRadius:12, fontSize:14, color:'#222', outline:'none', boxSizing:'border-box',
            border:`1.5px solid ${focused ? '#534AB7' : '#eee'}`, background:'#fafafa' }}
        />
        {isPwd && (
          <button type="button" onClick={() => setShow(v => !v)}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:'#bbb', padding:2 }}>
            {show ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        )}
      </div>
    </div>
  )
}

function PasswordStrength({ password }) {
  if (!password) return null
  const hasLen = password.length >= 8
  const hasNum = /\d/.test(password)
  const hasUp  = /[A-Z]/.test(password)
  const score  = [hasLen, hasNum, hasUp].filter(Boolean).length
  const colors = ['#E24B4A','#EF9F27','#1D9E75']
  return (
    <div style={{ marginTop:-8, marginBottom:16 }}>
      <div style={{ display:'flex', gap:4, marginBottom:5 }}>
        {[0,1,2].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:2,
          background: i<score ? colors[score-1] : '#eee' }}/>)}
      </div>
      <div style={{ display:'flex', gap:12 }}>
        {[{ok:hasLen,text:'8 car.'},{ok:hasNum,text:'Chiffre'},{ok:hasUp,text:'Majuscule'}].map(({ok,text}) => (
          <span key={text} style={{ fontSize:11, color:ok?'#1D9E75':'#ccc',
            display:'flex', alignItems:'center', gap:3 }}>
            <Check size={10} strokeWidth={ok?3:2}/>{text}
          </span>
        ))}
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', marginBottom:24 }}>
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
        <rect width="44" height="44" rx="12" fill="#534AB7"/>
        <rect x="10" y="20" width="24" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
        <rect x="10" y="26" width="16" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
        <circle cx="28" cy="16" r="7" fill="#EEEDFE" opacity="0.15"/>
        <circle cx="28" cy="16" r="5" fill="none" stroke="#EEEDFE" strokeWidth="1.5"/>
        <path d="M28 13v3l2 1.5" stroke="#EEEDFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="10" y="13" width="11" height="3" rx="1.5" fill="#EEEDFE"/>
      </svg>
      <span style={{ fontSize:20, fontWeight:800, color:'#222', letterSpacing:-0.5 }}>
        Dep<span style={{ color:'#534AB7' }}>enzo</span>
      </span>
    </div>
  )
}

/* ─── Page principale ────────────────────────────────────────────── */
const STEPS = ['Compte', 'Type', 'Organisation']

export default function Register() {
  const [step, setStep] = useState(0)
  const [f, setF] = useState({
    name:'', email:'', password:'', currency:'MGA',
    usageType:'personal',
    orgId: null, orgName:'', orgCreate: false,
  })
  const [agreed,  setAgreed]  = useState(false)
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const nav = useNavigate()

  const needsOrg   = f.usageType !== 'personal'
  const totalSteps = needsOrg ? 3 : 2
  const stepLabels = needsOrg ? STEPS : STEPS.slice(0,2)
  const isLastStep = step === totalSteps - 1

  const nextStep = () => {
    setErr('')
    if (step === 0) {
      if (!f.name.trim())        return setErr('Le nom est requis')
      if (!f.email.trim())       return setErr('L\'email est requis')
      if (f.password.length < 6) return setErr('Minimum 6 caractères')
    }
    setStep(s => Math.min(s+1, totalSteps-1))
  }

  const prevStep = () => { setErr(''); setStep(s => Math.max(s-1, 0)) }

  const submit = async (e) => {
    e.preventDefault()
    if (!agreed) return setErr('Vous devez accepter les CGU')
    setLoading(true)
    try {
      await register({
        name:      f.name,
        email:     f.email,
        password:  f.password,
        currency:  f.currency,
        usageType: f.usageType,
        orgId:     f.orgId     || undefined,
        orgName:   f.orgCreate ? f.orgName : undefined,
        orgCreate: f.orgCreate,
      })
      nav('/dashboard')
    } catch (e) {
      setErr(e.response?.data?.error || "Erreur lors de l'inscription")
    } finally { setLoading(false) }
  }

  // ✅ handleSubmit toujours preventDefault
  const handleSubmit = (e) => {
    e.preventDefault()
    if (isLastStep) submit(e)
    else nextStep()
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'#f7f6fd', padding:20 }}>
      <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:20,
        padding:'32px 28px', border:'0.5px solid #eee',
        boxShadow:'0 4px 32px rgba(83,74,183,0.07)' }}>

        <Logo/>

        {/* Indicateur étapes */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:24 }}>
          {stepLabels.map((label, i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{ display:'flex', alignItems:'center', width:'100%' }}>
                {i > 0 && <div style={{ flex:1, height:2, background: i<=step ? '#534AB7' : '#eee' }}/>}
                <div style={{
                  width:26, height:26, borderRadius:13, flexShrink:0,
                  background: i<=step ? '#534AB7' : '#f0f0f0',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, fontWeight:700, color: i<=step ? '#fff' : '#aaa',
                }}>
                  {i < step ? <Check size={13} strokeWidth={3}/> : i+1}
                </div>
                {i < stepLabels.length-1 && <div style={{ flex:1, height:2, background: i<step ? '#534AB7' : '#eee' }}/>}
              </div>
              <span style={{ fontSize:10, fontWeight:600, color: i===step ? '#534AB7' : '#bbb' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Titre étape */}
        <h1 style={{ fontSize:20, fontWeight:800, color:'#222', marginBottom:4, textAlign:'center' }}>
          {step===0 ? 'Créer un compte' : step===1 ? 'Type d\'utilisation' : 'Votre organisation'}
        </h1>
        <p style={{ color:'#aaa', fontSize:13, textAlign:'center', marginBottom:20 }}>
          {step===0 ? 'Commencez à suivre vos finances'
            : step===1 ? 'Comment allez-vous utiliser Depenzo ?'
            : 'Rejoignez ou créez votre groupe'}
        </p>

        {step === 0 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            background:'#E1F5EE', borderRadius:10, padding:'9px 14px', marginBottom:18 }}>
            <Check size={13} color="#0F6E56" strokeWidth={2.5}/>
            <span style={{ fontSize:12, color:'#0F6E56', fontWeight:600 }}>3 mois Pro offerts</span>
          </div>
        )}

        {err && (
          <div style={{ background:'#fdecea', color:'#c0392b', borderRadius:10,
            padding:'10px 14px', marginBottom:16, fontSize:13,
            border:'1px solid #f5c6cb', display:'flex', alignItems:'center', gap:8 }}>
            <span>⚠</span> {err}
          </div>
        )}

        {/* ✅ handleSubmit toujours appelé avec preventDefault */}
        <form onSubmit={handleSubmit}>
          {step === 0 && <StepPersonal f={f} setF={setF}/>}
          {step === 1 && <StepUsage   f={f} setF={setF}/>}
          {step === 2 && <StepOrg     f={f} setF={setF}/>}

          {isLastStep && (
            <label style={{ display:'flex', alignItems:'flex-start', gap:10,
              marginBottom:16, cursor:'pointer' }}>
              <div onClick={() => setAgreed(v => !v)} style={{
                width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1,
                border:`2px solid ${agreed ? '#534AB7' : '#ddd'}`,
                background: agreed ? '#534AB7' : '#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.15s', cursor:'pointer',
              }}>
                {agreed && <Check size={12} color="#fff" strokeWidth={3}/>}
              </div>
              <span style={{ fontSize:12, color:'#666', lineHeight:1.6 }}>
                J'accepte les{' '}
                <Link to="/terms" onClick={e => e.stopPropagation()}
                  style={{ color:'#534AB7', fontWeight:600, textDecoration:'none' }}>CGU</Link>
                {' '}et la{' '}
                <Link to="/privacy" onClick={e => e.stopPropagation()}
                  style={{ color:'#534AB7', fontWeight:600, textDecoration:'none' }}>confidentialité</Link>
              </span>
            </label>
          )}

          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            {step > 0 && (
              <button type="button" onClick={prevStep} style={{
                flex:1, padding:'12px', borderRadius:12, cursor:'pointer',
                background:'#f7f7f7', border:'none', fontWeight:600, fontSize:14, color:'#888',
              }}>
                Retour
              </button>
            )}
            <button type="submit"
              disabled={loading || (isLastStep && !agreed)}
              style={{
                flex:2, padding:'13px', borderRadius:13,
                background: loading ? '#a09bda' : isLastStep && !agreed ? '#c4bfed' : '#534AB7',
                border:'none', color:'#EEEDFE', fontWeight:700, fontSize:14,
                cursor: loading || (isLastStep && !agreed) ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              {loading ? (
                <><span style={{ width:16, height:16, border:'2px solid #EEEDFE',
                  borderTopColor:'transparent', borderRadius:'50%',
                  animation:'spin 0.7s linear infinite', display:'inline-block' }}/>
                  Création...</>
              ) : isLastStep
                ? <>Créer mon compte <ArrowRight size={15}/></>
                : <>Suivant <ArrowRight size={15}/></>
              }
            </button>
          </div>
        </form>

        {step === 0 && (
          <>
            <div style={{ position:'relative', margin:'16px 0', textAlign:'center' }}>
              <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'#f0f0f0' }}/>
              <span style={{ position:'relative', background:'#fff', padding:'0 10px', fontSize:11, color:'#ccc' }}>ou</span>
            </div>
            <p style={{ textAlign:'center', fontSize:13, color:'#aaa', margin:0 }}>
              Déjà un compte ?{' '}
              <Link to="/login" style={{ color:'#534AB7', fontWeight:700, textDecoration:'none' }}>
                Se connecter
              </Link>
            </p>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}