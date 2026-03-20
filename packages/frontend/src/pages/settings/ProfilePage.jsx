import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Camera } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [name, setName]   = useState(user?.name  || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateUser({ name, email })   // adapte selon ton AuthContext
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C5CE7' }}>
          <ArrowLeft size={22} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#222' }}>Profil utilisateur</span>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 20px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 40, background: '#6C5CE7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 700, color: '#fff',
          }}>
            {name?.charAt(0).toUpperCase() || <User size={32} color="#fff" />}
          </div>
          <button style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 26, height: 26, borderRadius: 13,
            background: '#fff', border: '2px solid #6C5CE7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Camera size={13} color="#6C5CE7" />
          </button>
        </div>
      </div>

      {/* Formulaire */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { label: 'Nom complet', value: name, set: setName, type: 'text' },
          { label: 'Adresse e-mail', value: email, set: setEmail, type: 'email' },
        ].map(({ label, value, set, type }) => (
          <div key={label}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#999',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
            <input type={type} value={value} onChange={e => set(e.target.value)}
              style={{
                display: 'block', width: '100%', marginTop: 6,
                padding: '12px 14px', borderRadius: 12,
                border: '1.5px solid #eee', fontSize: 14, color: '#222',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#6C5CE7'}
              onBlur={e => e.target.style.borderColor = '#eee'}
            />
          </div>
        ))}

        <button onClick={handleSave} style={{
          marginTop: 8, padding: '14px', borderRadius: 14,
          background: saved ? '#00b894' : '#6C5CE7',
          border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
          cursor: 'pointer', transition: 'background 0.3s',
        }}>
          {saved ? '✓ Enregistré' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}