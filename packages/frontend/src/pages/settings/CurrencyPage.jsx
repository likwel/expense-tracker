import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Check, AlertTriangle, RefreshCw } from 'lucide-react'
import { useAuth }        from '../../contexts/AuthContext'
import api                from '../../utils/api'
import { setRates, fmt, SYMBOLS } from '../../utils/format'

const CURRENCIES = [
  { code: 'MGA', symbol: 'Ar',   label: 'Ariary malgache'        },
  { code: 'EUR', symbol: '€',    label: 'Euro'                    },
  { code: 'USD', symbol: '$',    label: 'Dollar US'               },
  { code: 'GBP', symbol: '£',    label: 'Livre sterling'          },
  { code: 'CHF', symbol: 'Fr',   label: 'Franc suisse'            },
  { code: 'JPY', symbol: '¥',    label: 'Yen japonais'            },
  { code: 'CAD', symbol: 'CA$',  label: 'Dollar canadien'         },
  { code: 'MAD', symbol: 'MAD',  label: 'Dirham marocain'         },
  { code: 'XOF', symbol: 'CFA',  label: 'Franc CFA (UEMOA)'       },
  { code: 'MUR', symbol: 'Rs',   label: 'Roupie mauricienne'      }, // ₨ → Rs (ASCII safe)
  { code: 'CNY', symbol: 'CNY',  label: 'Yuan chinois (renminbi)' }, // ¥ ambigu avec JPY → CNY
]

// Surcharge locale des symboles pour les devises où SYMBOLS (format.js)
// pourrait retourner un caractère non supporté
const SYMBOL_OVERRIDE = {
  MUR: 'Rs',
  MAD: 'MAD',
  CNY: 'CNY',
}

// Résout le symbole à afficher : override local en priorité, puis SYMBOLS, puis code
const getSymbol = (code) => SYMBOL_OVERRIDE[code] || SYMBOLS[code] || code

const DEMO_AMOUNT = 100000

export default function CurrencyPage() {
  const navigate          = useNavigate()
  const { user, setUser } = useAuth()

  const baseCurrency = user?.defaultCurrency || 'MGA'
  const baseSymbol   = getSymbol(baseCurrency)

  const [selected,   setSelected]   = useState(user?.currency || baseCurrency)
  const [query,      setQuery]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState(null)
  const [localRates, setLocalRates] = useState(null)
  const [rateLoad,   setRateLoad]   = useState(false)
  const [rateErr,    setRateErr]    = useState(false)

  useEffect(() => {
    setRateLoad(true)
    fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`)
      .then(r => r.json())
      .then(d => {
        if (d.rates) {
          setLocalRates(d.rates)
          if (baseCurrency === 'MGA') {
            setRates(d.rates)
          } else {
            const mgaRate  = d.rates['MGA'] || 1
            const mgaRates = {}
            Object.entries(d.rates).forEach(([code, rate]) => {
              mgaRates[code] = rate / mgaRate
            })
            setRates(mgaRates)
          }
        }
      })
      .catch(() => setRateErr(true))
      .finally(() => setRateLoad(false))
  }, [baseCurrency])

  const showMsg = (ok, text) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3000)
  }

  const handleSave = async () => {
    if (selected === user?.currency) return showMsg(false, 'Devise déjà sélectionnée')
    setSaving(true)
    try {
      await api.put('/auth/currency', { currency: selected })
      setUser(prev => ({ ...prev, currency: selected }))
      showMsg(true, `Devise mise à jour : ${selected}`)
    } catch (e) {
      showMsg(false, e.response?.data?.error || 'Erreur lors de la mise à jour')
    } finally { setSaving(false) }
  }

  const getRate = (code) => {
    if (!localRates || code === baseCurrency) return null
    const r = localRates[code]
    if (!r) return null
    return (1 / r).toFixed(code === 'JPY' ? 0 : 4)
  }

  const convertDemo = (targetCode) => {
    if (targetCode === baseCurrency) return `${DEMO_AMOUNT.toLocaleString('fr-FR')} ${baseSymbol}`
    if (!localRates) return '—'
    const rate = localRates[targetCode]
    if (!rate) return '—'
    const converted = DEMO_AMOUNT * rate
    const sym = getSymbol(targetCode)
    const PREFIX = ['EUR', 'USD', 'GBP', 'CHF', 'CAD']
    const num = targetCode === 'JPY'
      ? Math.round(converted).toLocaleString('fr-FR')
      : converted.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return PREFIX.includes(targetCode) ? `${sym} ${num}` : `${num} ${sym}`
  }

  const filtered = CURRENCIES.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.code.toLowerCase().includes(query.toLowerCase())
  )
  const isChanged = selected !== (user?.currency || baseCurrency)

  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh', background: '#f7f6fd' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px', borderBottom: '1px solid #f0f0f0',
        background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C5CE7', padding: 4 }}>
          <ArrowLeft size={22}/>
        </button>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#222' }}>Devise</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          {rateLoad
            ? <><RefreshCw size={12} color="#aaa" style={{ animation: 'spin 1s linear infinite' }}/><span style={{ color:'#aaa' }}>Taux en cours...</span></>
            : localRates
              ? <span style={{ color:'#00b894' }}>Taux à jour</span>
              : rateErr && <span style={{ color:'#E24B4A' }}>Taux indisponibles</span>
          }
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div style={{
          margin: '10px 16px 0', padding: '11px 14px', borderRadius: 12,
          background: msg.ok ? '#E1F5EE' : '#FCEBEB',
          border: `1px solid ${msg.ok ? '#9FE1CB' : '#F09595'}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {msg.ok ? <Check size={15} color="#0F6E56" strokeWidth={2.5}/> : <AlertTriangle size={15} color="#A32D2D"/>}
          <span style={{ fontSize: 13, fontWeight: 600,
            color: msg.ok ? '#0F6E56' : '#A32D2D' }}>{msg.text}</span>
        </div>
      )}

      {/* Info devise de base */}
      <div style={{ margin: '12px 16px 0', background: '#f7f7f7', borderRadius: 12,
        padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', border: '0.5px solid #eee' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa',
            textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>
            Devise de base
          </div>
          <div style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>
            Données enregistrées en <strong style={{ color: '#222' }}>{baseCurrency}</strong>.
            L'affichage est converti selon la devise choisie.
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#aaa',
          background: '#fff', borderRadius: 10, padding: '6px 12px',
          border: '0.5px solid #eee', flexShrink: 0, marginLeft: 12 }}>
          {baseSymbol}
        </div>
      </div>

      {/* Aperçu conversion */}
      <div style={{ margin: '10px 16px 0', background: '#fff', borderRadius: 14,
        padding: '14px 16px', border: '0.5px solid #eee' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa',
          textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
          Aperçu — {DEMO_AMOUNT.toLocaleString('fr-FR')} {baseSymbol}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#E24B4A' }}>
            {convertDemo(user?.currency || baseCurrency)}
          </span>
          {isChanged && (
            <>
              <span style={{ fontSize: 16, color: '#bbb' }}>→</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#534AB7' }}>
                {convertDemo(selected)}
              </span>
            </>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
          Modification uniquement de l'affichage
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={{ padding: '10px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', borderRadius: 12, padding: '10px 14px', border: '0.5px solid #eee' }}>
          <Search size={14} color="#bbb"/>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une devise..."
            style={{ border: 'none', background: 'none', outline: 'none',
              fontSize: 14, color: '#222', flex: 1 }}/>
          {query && (
            <button onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: '#ccc', padding: 0, fontSize: 16 }}>×</button>
          )}
        </div>
      </div>

      {/* Liste devises */}
      <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(({ code, label }) => {
          const sym       = getSymbol(code)
          const active    = selected === code
          const isCurrent = user?.currency === code
          const isBase    = baseCurrency === code
          const rate      = getRate(code)

          return (
            <button key={code} onClick={() => setSelected(code)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              border: `1.5px solid ${active ? '#6C5CE7' : '#eee'}`,
              background: active ? '#f5f3ff' : '#fff', transition: 'all 0.15s',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: active ? '#6C5CE7' : '#f5f5f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, color: active ? '#fff' : '#888',
              }}>
                {sym}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: active ? 700 : 500, fontSize: 14,
                    color: active ? '#534AB7' : '#222' }}>{label}</span>
                  {isCurrent && !isBase && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px',
                      borderRadius: 20, background: '#E1F5EE', color: '#0F6E56' }}>
                      Actuelle
                    </span>
                  )}
                  {isBase && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px',
                      borderRadius: 20, background: '#f5f5f5', color: '#888' }}>
                      Base
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: '#aaa' }}>{code}</span>
                  {rate && !rateErr && (
                    <span style={{ fontSize: 11, color: '#888' }}>
                      · 1 {code} = {Number(rate).toLocaleString('fr-FR')} {baseSymbol}
                    </span>
                  )}
                  {localRates && code !== baseCurrency && !rateErr && (
                    <span style={{ fontSize: 11, color: active ? '#534AB7' : '#bbb', marginLeft: 'auto' }}>
                      {convertDemo(code)}
                    </span>
                  )}
                </div>
              </div>

              {active && (
                <div style={{ width: 22, height: 22, borderRadius: 11, background: '#6C5CE7',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={13} color="#fff" strokeWidth={3}/>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Bouton sauvegarder */}
      {isChanged && (
        <div style={{ position: 'fixed', bottom: 84, left: '50%',
          transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 20 }}>
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: saving ? '#a09bda' : '#6C5CE7',
            border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(83,74,183,0.35)',
          }}>
            {saving ? 'Mise à jour...' : `Appliquer — ${getSymbol(selected)} ${selected}`}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}