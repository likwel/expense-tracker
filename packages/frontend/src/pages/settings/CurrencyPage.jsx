import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'

const CURRENCIES = [
  { code: 'EUR', symbol: '€',    label: 'Euro'              },
  { code: 'USD', symbol: '$',    label: 'Dollar US'         },
  { code: 'GBP', symbol: '£',    label: 'Livre sterling'    },
  { code: 'MGA', symbol: 'Ar',   label: 'Ariary'            },
  { code: 'CHF', symbol: 'Fr',   label: 'Franc suisse'      },
  { code: 'JPY', symbol: '¥',    label: 'Yen japonais'      },
  { code: 'CAD', symbol: '$',    label: 'Dollar canadien'   },
  { code: 'MAD', symbol: 'د.م',  label: 'Dirham marocain'   },
  { code: 'XOF', symbol: 'CFA',  label: 'Franc CFA (UEMOA)' },
]

export default function CurrencyPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState('EUR')
  const [query, setQuery]       = useState('')

  const filtered = CURRENCIES.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.code.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C5CE7' }}>
          <ArrowLeft size={22} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#222' }}>Devise</span>
      </div>

      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          background: '#f7f7f7', borderRadius: 12, padding: '10px 14px' }}>
          <Search size={15} color="#bbb" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une devise..."
            style={{ border: 'none', background: 'none', outline: 'none',
              fontSize: 14, color: '#222', flex: 1 }} />
        </div>
      </div>

      <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(({ code, symbol, label }) => {
          const active = selected === code
          return (
            <button key={code} onClick={() => setSelected(code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 14,
                border: `2px solid ${active ? '#6C5CE7' : '#eee'}`,
                background: active ? '#f5f3ff' : '#fff',
                cursor: 'pointer', textAlign: 'left',
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: active ? '#6C5CE7' : '#f5f5f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
                color: active ? '#fff' : '#aaa',
              }}>
                {symbol}
              </div>
              <div>
                <div style={{ fontWeight: active ? 700 : 500, fontSize: 14,
                  color: active ? '#6C5CE7' : '#222' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{code}</div>
              </div>
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