import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Check, AlertTriangle, Shield } from 'lucide-react'
import api from '../../utils/api'

const ROWS = [
  { key: 'current', label: 'Mot de passe actuel'       },
  { key: 'next',    label: 'Nouveau mot de passe'      },
  { key: 'confirm', label: 'Confirmer le mot de passe' },
]

// Indicateur de force du mot de passe
function PasswordStrength({ password }) {
  if (!password) return null
  const hasLen   = password.length >= 8
  const hasNum   = /\d/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const score    = [hasLen, hasNum, hasUpper].filter(Boolean).length
  const colors   = ['#E24B4A', '#EF9F27', '#1D9E75']
  const labels   = ['Faible', 'Moyen', 'Fort']
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score - 1] : '#eee',
            transition: 'background 0.2s',
          }}/>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[{ ok: hasLen, text: '8 caractères' }, { ok: hasNum, text: 'Chiffre' }, { ok: hasUpper, text: 'Majuscule' }]
          .map(({ ok, text }) => (
            <span key={text} style={{ fontSize: 11, color: ok ? '#1D9E75' : '#ccc',
              display: 'flex', alignItems: 'center', gap: 3 }}>
              <Check size={10} strokeWidth={ok ? 3 : 2}/>{text}
            </span>
          ))}
      </div>
    </div>
  )
}

export default function SecurityPage() {
  const navigate = useNavigate()
  const [show,   setShow]   = useState({})
  const [fields, setFields] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState(null)  // { ok, text }

  const toggle = k => setShow(s => ({ ...s, [k]: !s[k] }))
  const set    = (k, v) => setFields(f => ({ ...f, [k]: v }))

  const showMsg = (ok, text) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const handleSave = async () => {
    const { current, next, confirm } = fields

    // Validations front
    if (!current) return showMsg(false, 'Entrez votre mot de passe actuel')
    if (!next)    return showMsg(false, 'Entrez un nouveau mot de passe')
    if (next.length < 6) return showMsg(false, 'Minimum 6 caractères')
    if (next !== confirm) return showMsg(false, 'Les mots de passe ne correspondent pas')

    setSaving(true)
    try {
      await api.put('/auth/password', {
        currentPassword: current,
        newPassword:     next,
      })
      setFields({ current: '', next: '', confirm: '' })
      showMsg(true, 'Mot de passe mis à jour avec succès')
    } catch (e) {
      showMsg(false, e.response?.data?.error || 'Mot de passe actuel incorrect')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ paddingBottom: 48, minHeight: '100vh', background: '#f7f6fd' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px', borderBottom: '1px solid #f0f0f0',
        background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C5CE7', padding: 4 }}>
          <ArrowLeft size={22}/>
        </button>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#222' }}>Sécurité</span>
      </div>

      {/* Message feedback */}
      {msg && (
        <div style={{
          margin: '10px 16px 0', padding: '11px 14px', borderRadius: 12,
          background: msg.ok ? '#E1F5EE' : '#FCEBEB',
          border: `1px solid ${msg.ok ? '#9FE1CB' : '#F09595'}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {msg.ok
            ? <Check size={15} color="#0F6E56" strokeWidth={2.5}/>
            : <AlertTriangle size={15} color="#A32D2D"/>}
          <span style={{ fontSize: 13, fontWeight: 600,
            color: msg.ok ? '#0F6E56' : '#A32D2D' }}>{msg.text}</span>
        </div>
      )}

      {/* Intro */}
      <div style={{ margin: '16px 16px 12px', background: '#EEEDFE',
        borderRadius: 12, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={18} color="#534AB7" strokeWidth={1.8}/>
        <span style={{ fontSize: 13, color: '#3C3489', lineHeight: 1.5 }}>
          Utilisez un mot de passe unique d'au moins 8 caractères avec chiffres et majuscules.
        </span>
      </div>

      {/* Formulaire */}
      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 16,
        padding: '16px', border: '0.5px solid #eee' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
          Changer le mot de passe
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ROWS.map(({ key, label }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#888',
                textTransform: 'uppercase', letterSpacing: '0.4px',
                display: 'block', marginBottom: 6 }}>
                {label}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show[key] ? 'text' : 'password'}
                  value={fields[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px',
                    borderRadius: 12, border: '1.5px solid #eee',
                    fontSize: 14, color: '#222', outline: 'none',
                    boxSizing: 'border-box', background: '#fafafa',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6C5CE7'}
                  onBlur={e => e.target.style.borderColor = '#eee'}
                />
                <button type="button" onClick={() => toggle(key)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 2,
                }}>
                  {show[key] ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {/* Indicateur de force uniquement sur le nouveau mot de passe */}
              {key === 'next' && <PasswordStrength password={fields.next}/>}
              {/* Alerte si confirmation ne correspond pas */}
              {key === 'confirm' && fields.confirm && fields.next !== fields.confirm && (
                <div style={{ fontSize: 11, color: '#E24B4A', marginTop: 5,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={11}/> Les mots de passe ne correspondent pas
                </div>
              )}
              {key === 'confirm' && fields.confirm && fields.next === fields.confirm && (
                <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 5,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={11} strokeWidth={2.5}/> Les mots de passe correspondent
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', marginTop: 18, padding: '12px', borderRadius: 12,
          background: saving ? '#a09bda' : '#6C5CE7',
          border: 'none', color: '#fff', fontWeight: 700, fontSize: 14,
          cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
        }}>
          {saving ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
        </button>
      </div>

    </div>
  )
}