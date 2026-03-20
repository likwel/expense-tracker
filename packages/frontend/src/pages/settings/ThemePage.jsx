import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

const THEMES = [
  { key: 'light',  Icon: Sun,     label: 'Clair'   },
  { key: 'dark',   Icon: Moon,    label: 'Sombre'  },
  { key: 'system', Icon: Monitor, label: 'Système' },
]

export default function ThemePage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C5CE7' }}>
          <ArrowLeft size={22} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#222' }}>Thème</span>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {THEMES.map(({ key, Icon, label }) => {
          const active = theme === key
          return (
            <button key={key} onClick={() => setTheme(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14,
                border: `2px solid ${active ? '#6C5CE7' : '#eee'}`,
                background: active ? '#f5f3ff' : '#fff',
                cursor: 'pointer', textAlign: 'left',
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: active ? '#6C5CE7' : '#f5f5f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={active ? '#fff' : '#aaa'} strokeWidth={1.8} />
              </div>
              <span style={{ fontWeight: active ? 700 : 500, fontSize: 15,
                color: active ? '#6C5CE7' : '#444' }}>{label}</span>
              {active && (
                <span style={{ marginLeft: 'auto', width: 10, height: 10,
                  borderRadius: 5, background: '#6C5CE7' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}