import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { TrendingDown, TrendingUp, Check } from 'lucide-react'
import Modal from './ui/Modal'
import { useApi, notifyDataChanged } from '../hooks/useApi'
import { expensesApi, incomesApi } from '../services/api'
import { useFmt } from '../hooks/useFmt'
import { useToast } from './ui/Toast'
import { LucideIcon } from '../utils/iconResolver'
import { localISODate, SYMBOLS } from '../utils/format'

const QuickAddContext = createContext(null)

const TYPES = {
  expense: { label: 'Dépense', color: '#E24B4A', soft: '#FCEBEB', Icon: TrendingDown, api: expensesApi },
  income:  { label: 'Revenu',  color: '#00b894', soft: '#e8f8f2', Icon: TrendingUp,   api: incomesApi  },
}

const lastCatKey = type => `quickadd-last-cat-${type}`
const readLastCat = type => { try { return localStorage.getItem(lastCatKey(type)) || '' } catch { return '' } }
const saveLastCat = (type, id) => { try { localStorage.setItem(lastCatKey(type), id) } catch { /* stockage indisponible */ } }

const isTyping = el =>
  el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

function QuickAddModal({ initialType, onClose }) {
  const { currency } = useFmt()
  const toast = useToast()
  const { data: cats } = useApi('/categories')
  const amountRef = useRef(null)

  const today     = localISODate()
  const yesterday = localISODate(new Date(Date.now() - 86400000))

  const [type, setType]   = useState(initialType)
  const [form, setForm]   = useState(() => ({ amount: '', categoryId: readLastCat(initialType), description: '', date: today }))
  const [saving, setSaving] = useState(false)

  const cfg      = TYPES[type]
  const typeCats = (cats || []).filter(c => c.type === type)

  const switchType = t => {
    setType(t)
    setForm(f => ({ ...f, categoryId: readLastCat(t) }))
    amountRef.current?.focus()
  }

  const save = async (keepOpen = false) => {
    const amount = parseFloat(String(form.amount).replace(',', '.'))
    if (!amount || amount <= 0) { toast.error('Saisissez un montant valide'); amountRef.current?.focus(); return }
    setSaving(true)
    try {
      await cfg.api.create({
        amount,
        categoryId:  Number(form.categoryId) || null,
        description: form.description.trim(),
        date:        form.date,
      })
      if (form.categoryId) saveLastCat(type, form.categoryId)
      notifyDataChanged(['/expenses', '/incomes', '/reports', '/budgets'])
      toast.success(`${cfg.label} enregistré${type === 'expense' ? 'e' : ''}`)
      if (keepOpen) {
        setForm(f => ({ ...f, amount: '', description: '' }))
        amountRef.current?.focus()
      } else {
        onClose()
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => { amountRef.current?.focus() }, [])

  const onKeyDown = e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(e.ctrlKey || e.metaKey) }
  }

  const label = { fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 8 }
  const chip  = active => ({
    padding: '7px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
    border: `1.5px solid ${active ? cfg.color : '#eee'}`,
    background: active ? cfg.soft : '#fff', color: active ? cfg.color : '#777',
  })

  return (
    <Modal title="Ajout rapide" onClose={onClose} maxWidth={520}>
      <div onKeyDown={onKeyDown}>
        {/* Type */}
        <div role="tablist" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f4f3f9', borderRadius: 12, padding: 3, marginBottom: 16 }}>
          {Object.entries(TYPES).map(([key, t]) => (
            <button key={key} role="tab" aria-selected={type === key} onClick={() => switchType(key)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: type === key ? 700 : 500,
              background: type === key ? '#fff' : 'transparent',
              color: type === key ? t.color : '#999',
              boxShadow: type === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
              <t.Icon size={14} strokeWidth={2.2}/>{t.label}
            </button>
          ))}
        </div>

        {/* Montant */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 18,
          padding: '14px 12px', borderRadius: 16, background: cfg.soft }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: cfg.color }}>{type === 'expense' ? '−' : '+'}</span>
          <input
            ref={amountRef}
            aria-label="Montant"
            inputMode="decimal"
            placeholder="0"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^\d.,]/g, '') }))}
            style={{
              width: '100%', maxWidth: 260, border: 'none', outline: 'none', background: 'transparent', boxShadow: 'none',
              fontSize: 34, fontWeight: 800, color: cfg.color, textAlign: 'center', letterSpacing: '-1px',
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, color: cfg.color, opacity: 0.7 }}>{SYMBOLS[currency] || currency}</span>
        </div>

        {/* Catégorie */}
        <span style={label}>Catégorie</span>
        {typeCats.length === 0 ? (
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>Aucune catégorie de ce type.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 7, marginBottom: 16 }}>
            {typeCats.map(c => {
              const active = String(form.categoryId) === String(c.id)
              const color  = c.color || cfg.color
              return (
                <button key={c.id} type="button" aria-pressed={active}
                  onClick={() => setForm(f => ({ ...f, categoryId: active ? '' : String(c.id) }))}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 4px', borderRadius: 12, cursor: 'pointer', position: 'relative',
                    border: `1.5px solid ${active ? color : '#eee'}`, background: active ? color + '15' : '#fafafa',
                  }}>
                  {active && <Check size={11} color={color} strokeWidth={3} style={{ position: 'absolute', top: 5, right: 6 }}/>}
                  <LucideIcon name={c.icon} size={19} color={active ? color : '#aaa'} strokeWidth={1.8}/>
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? color : '#777', textAlign: 'center',
                    lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Date */}
        <span style={label}>Date</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <button type="button" style={chip(form.date === today)}     onClick={() => setForm(f => ({ ...f, date: today }))}>Aujourd'hui</button>
          <button type="button" style={chip(form.date === yesterday)} onClick={() => setForm(f => ({ ...f, date: yesterday }))}>Hier</button>
          <input type="date" aria-label="Autre date" value={form.date} max={today}
            onChange={e => setForm(f => ({ ...f, date: e.target.value || today }))}
            style={{ ...chip(form.date !== today && form.date !== yesterday), outline: 'none', fontFamily: 'inherit' }}/>
        </div>

        {/* Note */}
        <span style={label}>Note (optionnel)</span>
        <input
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder={type === 'expense' ? 'Courses, taxi, facture…' : 'Salaire, prime, vente…'}
          maxLength={500}
          style={{ display: 'block', width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
            background: '#fafafa', border: '1px solid #eee', outline: 'none', marginBottom: 18 }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => save(true)} disabled={saving} style={{
            flex: 1, padding: 13, borderRadius: 12, cursor: saving ? 'wait' : 'pointer',
            background: '#f4f3f9', border: 'none', fontWeight: 600, fontSize: 13, color: '#666',
          }}>
            + Autre
          </button>
          <button onClick={() => save(false)} disabled={saving} style={{
            flex: 2, padding: 13, borderRadius: 12, cursor: saving ? 'wait' : 'pointer',
            background: cfg.color, opacity: saving ? 0.7 : 1, border: 'none',
            fontWeight: 700, fontSize: 14, color: '#fff', boxShadow: `0 4px 14px ${cfg.color}55`,
          }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
        <div className="desktop-only" style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 10 }}>
          <span className="kbd">Entrée</span> enregistrer · <span className="kbd">Ctrl</span>+<span className="kbd">Entrée</span> enregistrer et continuer
        </div>
      </div>
    </Modal>
  )
}

export function QuickAddProvider({ children }) {
  const [openType, setOpenType] = useState(null)
  const open  = useCallback((type = 'expense') => setOpenType(type), [])
  const close = useCallback(() => setOpenType(null), [])

  // Raccourcis clavier : N = nouvelle dépense, R = nouveau revenu
  useEffect(() => {
    const onKey = e => {
      if (openType || e.ctrlKey || e.metaKey || e.altKey || isTyping(document.activeElement)) return
      if (document.querySelector('.modal-backdrop')) return
      const k = e.key.toLowerCase()
      if (k === 'n') { e.preventDefault(); open('expense') }
      if (k === 'r') { e.preventDefault(); open('income') }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openType, open])

  return (
    <QuickAddContext.Provider value={open}>
      {children}
      {openType && <QuickAddModal initialType={openType} onClose={close}/>}
    </QuickAddContext.Provider>
  )
}

export function useQuickAdd() {
  return useContext(QuickAddContext) || (() => {})
}
