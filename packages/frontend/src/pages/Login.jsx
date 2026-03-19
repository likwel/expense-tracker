import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Input  from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const [f,   setF]   = useState({ email:'', password:'' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try { await login(f); nav('/') }
    catch (e) { setErr(e.response?.data?.error || 'Erreur de connexion') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth:400, margin:'80px auto', padding:24 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#222', marginBottom:6 }}>Connexion</h1>
        <p style={{ color:'#aaa', fontSize:14 }}>Bienvenue sur Expense Tracker</p>
      </div>
      {err && <div style={{ background:'#fdecea', color:'#c0392b', borderRadius:10,
        padding:'10px 14px', marginBottom:12, fontSize:13 }}>{err}</div>}
      <form onSubmit={submit}>
        <Input label="Email" type="email" placeholder="vous@email.com"
          value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} required/>
        <Input label="Mot de passe" type="password" placeholder="••••••••"
          value={f.password} onChange={e=>setF(p=>({...p,password:e.target.value}))} required/>
        <Button fullWidth disabled={loading} style={{ marginTop:4 }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>
      <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#aaa' }}>
        Pas de compte ?{' '}
        <Link to="/register" style={{ color:'#6C5CE7', fontWeight:600 }}>Créer un compte</Link>
      </p>
    </div>
  )
}
