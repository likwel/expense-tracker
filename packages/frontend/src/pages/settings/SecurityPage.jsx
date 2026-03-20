import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'

const ROWS = [
  { key: 'current', label: 'Mot de passe actuel'       },
  { key: 'next',    label: 'Nouveau mot de passe'      },
  { key: 'confirm', label: 'Confirmer le mot de passe' },
]

export default function SecurityPage() {
  const navigate = useNavigate()
  const [show, setShow]     = useState({})
  const [fields, setFields] = useState({ current: '', next: '', confirm: '' })
  const [saved, setSaved]   = useState(false)

  const toggle = (k) => setShow(s => ({ ...s, [k]: !s[k] }))
  const set    = (k, v) => setFields(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    // valide + appelle ton API
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C5CE7' }}>
          <ArrowLeft size={22} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#222' }}>Sécurité</span>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {ROWS.map(({ key, label }) => (
          <div key={key}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#999',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
            <div style={{ position: 'relative', marginTop: 6 }}>
              <input
                type={show[key] ? 'text' : 'password'}
                value={fields[key]}
                onChange={e => set(key, e.target.value)}
                style={{
                  width: '100%', padding: '12px 44px 12px 14px',
                  borderRadius: 12, border: '1.5px solid #eee',
                  fontSize: 14, color: '#222', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#6C5CE7'}
                onBlur={e => e.target.style.borderColor = '#eee'}
              />
              <button onClick={() => toggle(key)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#bbb' }}>
                {show[key] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}

        <button onClick={handleSave} style={{
          marginTop: 8, padding: '14px', borderRadius: 14,
          background: saved ? '#00b894' : '#6C5CE7',
          border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
          cursor: 'pointer', transition: 'background 0.3s',
        }}>
          {saved ? '✓ Mot de passe mis à jour' : 'Mettre à jour'}
        </button>
      </div>
    </div>
  )
}