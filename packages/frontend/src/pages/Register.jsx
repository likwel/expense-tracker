import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Input  from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Register() {
  const [f,   setF]   = useState({ name:'', email:'', password:'', currency:'MGA' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try { await register(f); nav('/') }
    catch (e) { setErr(e.response?.data?.error || 'Erreur lors de l\'inscription') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth:400, margin:'60px auto', padding:24 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#222', marginBottom:6 }}>Créer un compte</h1>
        <p style={{ color:'#aaa', fontSize:14 }}>Commencez à suivre vos finances</p>
      </div>
      {err && <div style={{ background:'#fdecea', color:'#c0392b', borderRadius:10,
        padding:'10px 14px', marginBottom:12, fontSize:13 }}>{err}</div>}
      <form onSubmit={submit}>
        <Input label="Nom complet"   type="text"     placeholder="Jean Dupont"
          value={f.name}     onChange={e=>setF(p=>({...p,name:e.target.value}))}     required/>
        <Input label="Email"         type="email"    placeholder="vous@email.com"
          value={f.email}    onChange={e=>setF(p=>({...p,email:e.target.value}))}    required/>
        <Input label="Mot de passe"  type="password" placeholder="Min. 6 caractères"
          value={f.password} onChange={e=>setF(p=>({...p,password:e.target.value}))} required/>
        <Button fullWidth disabled={loading} style={{ marginTop:4 }}>
          {loading ? 'Création...' : 'Créer le compte'}
        </Button>
      </form>
      <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#aaa' }}>
        Déjà un compte ?{' '}
        <Link to="/login" style={{ color:'#6C5CE7', fontWeight:600 }}>Se connecter</Link>
      </p>
    </div>
  )
}
