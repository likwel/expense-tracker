import { useState } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, ChevronRight, Wallet, RefreshCw,
  Plus, Target, Gauge, CalendarClock, TrendingUp, TrendingDown, PiggyBank,
  AlertTriangle, CheckCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Donut from '../components/ui/Donut'
import MonthlyChart from '../components/ui/MonthlyChart'
import { useFmt } from '../hooks/useFmt'
import { MONTHS } from '../utils/format'
import { useApi } from '../hooks/useApi'
import { recurringExpensesApi, recurringIncomesApi } from '../services/api'
import { useOrg } from '../contexts/OrgContext'
import { useAuth } from '../contexts/AuthContext'
import { useQuickAdd } from '../components/QuickAdd'
import { useToast } from '../components/ui/Toast'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { LucideIcon } from '../utils/iconResolver'

const now = new Date()
const SAVING_TARGET = 20   // règle 50/30/20 : viser 20 % d'épargne
const FALLBACK_COLORS = ['#6C5CE7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#a29bfe']

const greeting = () => {
  const h = now.getHours()
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
}

/* ─── Petits composants ─────────────────────────────────────────── */
function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <h2 style={{ fontWeight: 700, fontSize: 15, color: '#222', letterSpacing: '-0.2px' }}>{children}</h2>
      {action}
    </div>
  )
}

function LinkButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color: '#6C5CE7', fontSize: 12, cursor: 'pointer',
      fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2,
    }}>
      {children} <ChevronRight size={13}/>
    </button>
  )
}

function Insight({ icon: Icon, color, bg, label, value, hint }) {
  return (
    <div style={{ background: '#fafafd', border: '1px solid #f0eff6', borderRadius: 14, padding: '12px 12px 10px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 24, height: 24, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={13} color={color} strokeWidth={2}/>
        </div>
        <span style={{ fontSize: 11, color: '#888', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 16, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {hint && <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 2, lineHeight: 1.35 }}>{hint}</div>}
    </div>
  )
}

function QuickActions({ onExpense, onIncome, onBudget }) {
  const btn = (bg, color) => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 8px', borderRadius: 14, border: 'none', cursor: 'pointer',
    background: bg, color, fontWeight: 700, fontSize: 13, minWidth: 0,
  })
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
      <button onClick={onExpense} style={btn('#FCEBEB', '#E24B4A')}><Plus size={15} strokeWidth={2.5}/>Dépense</button>
      <button onClick={onIncome}  style={btn('#e8f8f2', '#0F6E56')}><Plus size={15} strokeWidth={2.5}/>Revenu</button>
      <button onClick={onBudget}  style={btn('#EEEDFE', '#534AB7')}><Target size={15} strokeWidth={2.2}/>Budgets</button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 170, borderRadius: 20, marginBottom: 14 }}/>
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="skeleton" style={{ height: 120, borderRadius: 16 }}/>
        <div className="skeleton" style={{ height: 120, borderRadius: 16 }}/>
      </div>
      <div className="skeleton" style={{ height: 240, borderRadius: 16 }}/>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { fmt } = useFmt()
  const nav = useNavigate()
  const { user } = useAuth()
  const { activeOrg } = useOrg()
  const openQuickAdd = useQuickAdd()
  const toast = useToast()
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const [txFilter, setTxFilter] = useState('all')
  const twoColumns = useMediaQuery('(min-width: 1024px)')

  // ✅ Paramètres réactifs selon l'org active
  const orgParam = activeOrg ? { orgId: activeOrg.id } : {}
  const PARAMS   = { month: now.getMonth() + 1, year: now.getFullYear(), ...orgParam }

  const { data: summary,  refetch: refetchSummary  } = useApi('/reports/summary',  PARAMS)
  const { data: monthly                             } = useApi('/reports/monthly',  { year: now.getFullYear(), ...orgParam })
  const { data: expData,  refetch: refetchExp       } = useApi('/expenses',         { ...PARAMS, take: 5 })
  const { data: recurExp, refetch: refetchRecurExp  } = useApi('/recurring',        orgParam)
  const { data: recurInc, refetch: refetchRecurInc  } = useApi('/recurring-income', orgParam)
  const { data: incData                             } = useApi('/incomes',          { ...PARAMS, take: 5 })
  const { data: budgets                             } = useApi('/budgets',          PARAMS)

  // ── Valeurs réelles backend ───────────────────────────────────
  const punctualExp = summary?.punctualExpenses || 0
  const recurringExp = summary?.recurringExpenses || 0
  const punctualInc = summary?.punctualIncomes || 0
  const recurringInc = summary?.recurringIncomes || 0
  const expenses = expData?.data || []
  const incomes = incData?.data || []

  // Fusionner + trier par date desc
  const allTx = [
    ...expenses.map(e => ({ ...e, _type: 'expense' })),
    ...incomes.map(i => ({ ...i, _type: 'income' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8)

  const filteredTx = txFilter === 'all'
    ? allTx
    : allTx.filter(t => t._type === txFilter)

  // ── Récurrences actives ce mois ───────────────────────────────
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const filterActive = (list) => (list || []).filter(r => {
    if (!r.isActive) return false
    const start = new Date(r.startDate)
    const end = r.endDate ? new Date(r.endDate) : null
    return start <= mEnd && (!end || end >= mStart)
  })

  const activeRecurExp = filterActive(recurExp)
  const activeRecurInc = filterActive(recurInc)

  // ── Estimation récurrentes ────────────────────────────────────
  const daysInMonth = mEnd.getDate()
  const dayOfMonth  = now.getDate()
  const daysLeft    = daysInMonth - dayOfMonth + 1   // aujourd'hui inclus

  const estimate = (list) => list.reduce((s, r) => {
    const amt  = Number(r.amount)
    const rEnd = r.endDate ? new Date(r.endDate) : null

    if (r.frequency === 'monthly') {
      const dueDay = r.dayOfMonth || 1
      if (rEnd && rEnd < new Date(now.getFullYear(), now.getMonth(), dueDay)) return s
      return s + amt
    }

    if (r.frequency === 'weekly') {
      const effEnd  = rEnd && rEnd < mEnd ? rEnd : mEnd
      const effDays = Math.max(0, Math.round((effEnd - mStart) / 86400000) + 1)
      return s + amt * (effDays / 7)
    }

    if (r.frequency === 'daily') {
      const rStart = r.startDate ? new Date(r.startDate) : mStart
      const effStart = rStart > mStart ? rStart : mStart
      const effEnd   = rEnd && rEnd < mEnd ? rEnd : mEnd
      const effDays    = Math.max(0, Math.round((effEnd - effStart) / 86400000) + 1)
      const effWorking = Math.round(effDays * 5 / 7)
      return s + amt * (r.dayType === 'working' ? effWorking : effDays)
    }

    return s
  }, 0)

  const totalRecurExp = estimate(activeRecurExp)
  const totalRecurInc = estimate(activeRecurInc)
  const totalExp = punctualExp + totalRecurExp
  const totalInc = punctualInc + totalRecurInc

  const balance = totalInc - totalExp
  const savingPct = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0
  const spentPct  = totalInc > 0 ? Math.min(100, Math.round((totalExp / totalInc) * 100)) : 0
  const monthPct  = Math.round((dayOfMonth / daysInMonth) * 100)

  const isExpEstimated = recurringExp === 0 && totalRecurExp > 0
  const isIncEstimated = recurringInc === 0 && totalRecurInc > 0

  // ── Indicateurs de pilotage ───────────────────────────────────
  // Rythme : dépenses ponctuelles / jour écoulé → projection fin de mois
  const dailyPace      = dayOfMonth > 0 ? punctualExp / dayOfMonth : 0
  const projectedExp   = totalRecurExp + dailyPace * daysInMonth
  const projectedBal   = totalInc - projectedExp
  const safePerDay     = Math.max(0, balance) / daysLeft
  const prevMonth      = now.getMonth() > 0 ? monthly?.[now.getMonth() - 1] : null
  const prevExp        = Number(prevMonth?.totalExpenses || 0)
  const vsPrevPct      = prevExp > 0 ? Math.round(((projectedExp - prevExp) / prevExp) * 100) : null

  // ── Catégories ────────────────────────────────────────────────
  const byCat = (summary?.byCategory || []).filter(c => c.total > 0)
  const catTotal = byCat.reduce((s, c) => s + c.total, 0)
  const topCats = byCat.slice(0, 5).map((c, i) => ({
    ...c, name: c.name || 'Sans catégorie', color: c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }))
  const otherTotal = catTotal - topCats.reduce((s, c) => s + c.total, 0)

  // ── Budgets ───────────────────────────────────────────────────
  const budgetList   = Array.isArray(budgets) ? budgets : []
  const budgetTotal  = budgetList.reduce((s, b) => s + Number(b.amount), 0)
  const budgetSpent  = budgetList.reduce((s, b) => s + Number(b.spent), 0)
  const overBudgets  = budgetList.filter(b => Number(b.spent) > Number(b.amount))
  const nearBudgets  = budgetList.filter(b => Number(b.spent) <= Number(b.amount) && Number(b.spent) >= Number(b.amount) * 0.8)
  const budgetPct    = budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0

  // ── Génération ────────────────────────────────────────────────
  const generate = async () => {
    setGenerating(true)
    setGenResult(null)
    try {
      const [resExp, resInc] = await Promise.all([
        recurringExpensesApi.generate(),
        recurringIncomesApi.generate(),
      ])
      setGenResult({
        generatedExp: resExp.data.generated,
        generatedInc: resInc.data.generated,
        date: resExp.data.date,
        isHoliday: resExp.data.isHoliday,
        isWorkingDay: resExp.data.isWorkingDay,
        holidayName: resExp.data.holidayName,
      })
      await Promise.all([refetchSummary(), refetchExp(), refetchRecurExp(), refetchRecurInc()])
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur génération')
    } finally {
      setGenerating(false)
    }
  }

  const firstName = (user?.name || '').split(' ')[0]

  /* ── Blocs ─────────────────────────────────────────────────────── */
  const hero = (
    <div style={{
      background: 'linear-gradient(135deg, #6C5CE7 0%, #5848d0 60%, #4a3fc0 100%)', borderRadius: 20,
      padding: '22px 20px', marginBottom: 14, color: '#fff', position: 'relative', overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(108,92,231,0.30)',
    }}>
      <div aria-hidden="true" style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%',
        background: 'rgba(255,255,255,0.07)', top: -90, right: -60 }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Solde du mois
          </div>
          <div style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', color: balance >= 0 ? '#fff' : '#ffc4c4' }}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            {MONTHS[now.getMonth()]} {now.getFullYear()} · jour {dayOfMonth}/{daysInMonth}
            {(isExpEstimated || isIncEstimated) && <span style={{ marginLeft: 6 }}>· * estimé</span>}
          </div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 21, background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wallet size={20} color="#fff" strokeWidth={1.8}/>
        </div>
      </div>

      {/* Jauge : part des revenus déjà dépensée vs temps écoulé */}
      <div style={{ marginTop: 16, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.85, marginBottom: 5 }}>
          <span>{spentPct}% des revenus dépensés</span>
          <span>{monthPct}% du mois écoulé</span>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.18)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${spentPct}%`, borderRadius: 4, transition: 'width .5s',
            background: spentPct > monthPct + 10 ? '#ffb3b3' : '#7df0cf' }}/>
          <div title="Aujourd'hui" style={{ position: 'absolute', top: -2, bottom: -2, left: `${monthPct}%`, width: 2, background: '#fff', opacity: 0.8 }}/>
        </div>
      </div>

      <div style={{ display: 'flex', marginTop: 16, position: 'relative' }}>
        {[
          { label: 'Revenus',  value: (isIncEstimated ? '~' : '') + fmt(totalInc) },
          { label: 'Dépenses', value: (isExpEstimated ? '~' : '') + fmt(totalExp) },
          { label: 'Épargne',  value: `${savingPct}%` },
        ].map((c, i) => (
          <div key={c.label} style={{ flex: 1, minWidth: 0, display: 'flex' }}>
            {i > 0 && <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 12px' }}/>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const splitCard = (kind) => {
    const isInc = kind === 'income'
    const color = isInc ? '#00b894' : '#e74c3c'
    const Icon  = isInc ? ArrowDownCircle : ArrowUpCircle
    const total = isInc ? totalInc : totalExp
    const punct = isInc ? punctualInc : punctualExp
    const recur = isInc ? totalRecurInc : totalRecurExp
    const est   = isInc ? isIncEstimated : isExpEstimated
    return (
      <button onClick={() => nav(isInc ? '/incomes' : '/expenses')} style={{
        background: '#fff', borderRadius: 16, padding: '14px 12px', boxShadow: 'var(--shadow)',
        border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: isInc ? '#e8f8f2' : '#fdecea',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={17} color={color} strokeWidth={1.8}/>
          </div>
          <span style={{ fontSize: 10, color: '#999', fontWeight: 700, letterSpacing: '0.4px' }}>{isInc ? 'REVENUS' : 'DÉPENSES'}</span>
          <ChevronRight size={14} color="#ccc" style={{ marginLeft: 'auto' }}/>
        </div>
        <div style={{ fontWeight: 800, fontSize: 17, color, marginBottom: 6 }}>{est ? '~' : ''}{fmt(total)}</div>
        <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: '#aaa' }}>Ponctuel</span>
            <span style={{ color, fontWeight: 600 }}>{fmt(punct)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: '#aaa' }}>Récurrent{est && <span style={{ fontSize: 10, color: '#bbb' }}> (estimé)</span>}</span>
            <span style={{ color: '#6C5CE7', fontWeight: 600 }}>{fmt(recur)}</span>
          </div>
        </div>
      </button>
    )
  }

  const splitCards = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'clamp(10px, 1.5vw, 16px)', marginBottom: 14 }}>
      {splitCard('income')}
      {splitCard('expense')}
    </div>
  )

  const insights = (
    <Card>
      <SectionTitle>Pilotage du mois</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <Insight icon={Gauge} color="#534AB7" bg="#EEEDFE"
          label="Reste à vivre / jour" value={fmt(safePerDay)}
          hint={`${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`}/>
        <Insight icon={CalendarClock} color={projectedBal >= 0 ? '#0F6E56' : '#E24B4A'} bg={projectedBal >= 0 ? '#E1F5EE' : '#FCEBEB'}
          label="Solde projeté" value={`${projectedBal >= 0 ? '+' : ''}${fmt(projectedBal)}`}
          hint="Au rythme actuel, fin de mois"/>
        <Insight icon={vsPrevPct != null && vsPrevPct > 0 ? TrendingUp : TrendingDown}
          color={vsPrevPct != null && vsPrevPct > 0 ? '#E24B4A' : '#0F6E56'}
          bg={vsPrevPct != null && vsPrevPct > 0 ? '#FCEBEB' : '#E1F5EE'}
          label="Vs mois dernier"
          value={vsPrevPct == null ? '—' : `${vsPrevPct > 0 ? '+' : ''}${vsPrevPct}%`}
          hint={vsPrevPct == null ? 'Pas encore de comparaison' : `Dépenses projetées vs ${fmt(prevExp)}`}/>
        <Insight icon={PiggyBank} color={savingPct >= SAVING_TARGET ? '#0F6E56' : '#BA7517'} bg={savingPct >= SAVING_TARGET ? '#E1F5EE' : '#FAEEDA'}
          label="Taux d'épargne" value={`${savingPct}%`}
          hint={savingPct >= SAVING_TARGET ? `Objectif ${SAVING_TARGET}% atteint 🎉` : `Objectif conseillé : ${SAVING_TARGET}%`}/>
      </div>
      {dailyPace > 0 && (
        <div style={{ fontSize: 11.5, color: '#888', marginTop: 10, lineHeight: 1.5 }}>
          Vous dépensez en moyenne <b style={{ color: '#444' }}>{fmt(dailyPace)}</b> par jour (hors récurrents).
        </div>
      )}
    </Card>
  )

  const categories = (
    <Card>
      <SectionTitle action={<LinkButton onClick={() => nav('/reports')}>Rapports</LinkButton>}>Où va votre argent</SectionTitle>
      {topCats.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#bbb', padding: '18px 0', fontSize: 13 }}>Aucune dépense ce mois-ci</div>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Donut data={[...topCats.map(c => ({ value: c.total, color: c.color })), ...(otherTotal > 0 ? [{ value: otherTotal, color: '#d6d4e4' }] : [])]} size={120} thickness={14}>
            <div style={{ fontSize: 10, color: '#aaa' }}>Total</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#222', maxWidth: 84, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmt(catTotal)}</div>
          </Donut>
          <div style={{ flex: 1, minWidth: 170 }}>
            {topCats.map(c => {
              const p = Math.round((c.total / catTotal) * 100)
              return (
                <div key={c.id ?? c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: c.color + '1f', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LucideIcon name={c.icon} size={13} color={c.color} strokeWidth={2}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 6 }}>
                      <span style={{ color: '#444', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                      <span style={{ color: '#888', flexShrink: 0 }}>{p}%</span>
                    </div>
                    <div style={{ height: 4, background: '#f3f2f8', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p}%`, background: c.color, borderRadius: 2 }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )

  const budgetHealth = (
    <Card>
      <SectionTitle action={<LinkButton onClick={() => nav('/budgets')}>Gérer</LinkButton>}>Budgets</SectionTitle>
      {budgetList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
            Fixez une limite par catégorie pour garder le contrôle.
          </div>
          <button onClick={() => nav('/budgets')} style={{ padding: '9px 16px', borderRadius: 12, border: 'none',
            background: '#EEEDFE', color: '#534AB7', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Créer un budget
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: '#666' }}>{fmt(budgetSpent)} / {fmt(budgetTotal)}</span>
            <span style={{ fontWeight: 700, color: budgetPct > 100 ? '#E24B4A' : budgetPct >= 80 ? '#BA7517' : '#0F6E56' }}>{budgetPct}%</span>
          </div>
          <div style={{ height: 8, background: '#f1f0f7', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${Math.min(100, budgetPct)}%`, borderRadius: 4, transition: 'width .5s',
              background: budgetPct > 100 ? '#E24B4A' : budgetPct >= 80 ? '#EF9F27' : '#00b894' }}/>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${monthPct}%`, width: 2, background: '#1a1a2e', opacity: 0.25 }}/>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {overBudgets.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
                padding: '4px 9px', borderRadius: 20, background: '#FCEBEB', color: '#E24B4A' }}>
                <AlertTriangle size={11}/>{overBudgets.length} dépassé{overBudgets.length > 1 ? 's' : ''}
              </span>
            )}
            {nearBudgets.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
                padding: '4px 9px', borderRadius: 20, background: '#FAEEDA', color: '#BA7517' }}>
                <AlertTriangle size={11}/>{nearBudgets.length} proche{nearBudgets.length > 1 ? 's' : ''} de la limite
              </span>
            )}
            {overBudgets.length === 0 && nearBudgets.length === 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
                padding: '4px 9px', borderRadius: 20, background: '#E1F5EE', color: '#0F6E56' }}>
                <CheckCircle size={11}/>Tous les budgets sont sous contrôle
              </span>
            )}
          </div>
          {overBudgets.slice(0, 3).map(b => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
              <span style={{ color: '#555' }}>{b.category?.name || 'Sans catégorie'}</span>
              <span style={{ color: '#E24B4A', fontWeight: 700 }}>+{fmt(Number(b.spent) - Number(b.amount))}</span>
            </div>
          ))}
        </>
      )}
    </Card>
  )

  const recurringRow = (r, isInc) => {
    const color = isInc ? '#00b894' : '#e74c3c'
    return (
      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: (r.category?.color || color) + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={14} color={r.category?.color || color} strokeWidth={1.8}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.description || r.category?.name}
          </div>
          <div style={{ fontSize: 10, color: '#aaa' }}>
            {r.frequency === 'daily' && 'Quotidien'}
            {r.frequency === 'weekly' && 'Hebdomadaire'}
            {r.frequency === 'monthly' && `Le ${r.dayOfMonth} du mois`}
            {r.dayType === 'working' && ' · jours ouvrés'}
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, color, flexShrink: 0 }}>{isInc ? '+' : '-'}{fmt(r.amount)}</div>
      </div>
    )
  }

  const recurring = (activeRecurExp.length > 0 || activeRecurInc.length > 0) && (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={16} color="#6C5CE7" strokeWidth={1.8}/>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#222' }}>Récurrents actifs</span>
          <span style={{ fontSize: 11, background: '#6C5CE722', color: '#6C5CE7', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
            {activeRecurExp.length + activeRecurInc.length}
          </span>
        </div>
        <button onClick={generate} disabled={generating} style={{
          background: generating ? '#aaa' : '#6C5CE7', border: 'none', borderRadius: 10, padding: '6px 12px',
          color: '#fff', fontSize: 11, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <RefreshCw size={11} style={generating ? { animation: 'spin .8s linear infinite' } : undefined}/>
          {generating ? 'En cours...' : 'Générer'}
        </button>
      </div>

      {genResult && (() => {
        const n = genResult.generatedExp + genResult.generatedInc
        return (
          <div style={{
            background: n > 0 ? '#e8f8f2' : '#f5f5f5', border: `1px solid ${n > 0 ? '#00b894' : '#ddd'}`,
            borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: n > 0 ? '#0F6E56' : '#888',
          }}>
            {n > 0
              ? `✓ ${genResult.generatedExp} dépense(s) + ${genResult.generatedInc} revenu(s) générés — ${genResult.date}`
              : `Aucune transaction à générer (${genResult.isHoliday ? `jour férié : ${genResult.holidayName}` :
                genResult.isWorkingDay ? 'déjà générés aujourd\'hui' : 'week-end'})`}
          </div>
        )
      })()}

      {activeRecurExp.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: '#e74c3c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 6px' }}>Dépenses</div>
          {activeRecurExp.slice(0, 2).map(r => recurringRow(r, false))}
        </div>
      )}
      {activeRecurInc.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#00b894', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 6px' }}>Revenus</div>
          {activeRecurInc.slice(0, 2).map(r => recurringRow(r, true))}
        </div>
      )}

      {(activeRecurExp.length > 2 || activeRecurInc.length > 2) && (
        <div style={{ marginTop: 8 }}><LinkButton onClick={() => nav('/recurring')}>Voir tout</LinkButton></div>
      )}

      <div style={{ marginTop: 10, background: '#f9f7ff', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11 }}>
          <div style={{ color: '#00b894', fontWeight: 600, marginBottom: 2 }}>+{isIncEstimated ? '~' : ''}{fmt(totalRecurInc)} revenus</div>
          <div style={{ color: '#e74c3c', fontWeight: 600 }}>-{isExpEstimated ? '~' : ''}{fmt(totalRecurExp)} dépenses</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11 }}>
          <div style={{ color: '#aaa', marginBottom: 2 }}>Net récurrent</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: (totalRecurInc - totalRecurExp) >= 0 ? '#00b894' : '#e74c3c' }}>
            {(totalRecurInc - totalRecurExp) >= 0 ? '+' : ''}{fmt(totalRecurInc - totalRecurExp)}
          </div>
        </div>
      </div>
    </Card>
  )

  const transactions = (
    <Card>
      <SectionTitle action={<LinkButton onClick={() => nav(txFilter === 'income' ? '/incomes' : '/expenses')}>Voir tout</LinkButton>}>
        Transactions récentes
      </SectionTitle>

      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#f5f5f5', borderRadius: 10, padding: 3, marginBottom: 12 }}>
        {[
          { id: 'all', label: 'Tout' },
          { id: 'expense', label: 'Dépenses' },
          { id: 'income', label: 'Revenus' },
        ].map(({ id, label }) => (
          <button key={id} role="tab" aria-selected={txFilter === id} onClick={() => setTxFilter(id)} style={{
            padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: txFilter === id ? 700 : 500,
            background: txFilter === id ? '#fff' : 'transparent',
            color: txFilter === id ? (id === 'expense' ? '#e74c3c' : id === 'income' ? '#00b894' : '#222') : '#999',
            boxShadow: txFilter === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {filteredTx.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ color: '#bbb', fontSize: 13, marginBottom: 10 }}>Aucune transaction ce mois</div>
          <button onClick={() => openQuickAdd(txFilter === 'income' ? 'income' : 'expense')} style={{
            padding: '8px 14px', borderRadius: 10, border: 'none', background: '#EEEDFE', color: '#534AB7',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <Plus size={13} strokeWidth={2.5}/>Ajouter une transaction
          </button>
        </div>
      ) : filteredTx.map(tx => {
        const isIncome = tx._type === 'income'
        const color = isIncome ? '#00b894' : '#e74c3c'
        const catColor = tx.category?.color || color
        return (
          <div key={`${tx._type}-${tx.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: catColor + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {tx.isRecurring
                ? <RefreshCw size={15} color={catColor} strokeWidth={1.8}/>
                : <LucideIcon name={tx.category?.icon} size={16} color={catColor} strokeWidth={1.8}/>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tx.description || tx.category?.name || '-'}
                </span>
                {tx.isRecurring && (
                  <span style={{ fontSize: 10, background: '#6C5CE722', color: '#6C5CE7', borderRadius: 99, padding: '1px 7px', fontWeight: 600, flexShrink: 0 }}>auto</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#aaa' }}>
                {tx.category?.name ? `${tx.category.name} · ` : ''}
                {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color, flexShrink: 0 }}>{isIncome ? '+' : '-'}{fmt(tx.amount)}</div>
          </div>
        )
      })}
    </Card>
  )

  const chart = monthly && monthly.length > 0 && (
    <Card>
      <SectionTitle action={
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <span style={{ color: '#00b894', fontWeight: 600 }}>■ Rev.</span>
          <span style={{ color: '#e74c3c', fontWeight: 600 }}>■ Dép.</span>
        </div>
      }>
        Évolution {now.getFullYear()}
      </SectionTitle>
      {/* Mois à venir masqués : ils tireraient la courbe vers 0 */}
      <MonthlyChart data={monthly.slice(0, Math.max(2, now.getMonth() + 1))} fmt={fmt}/>
    </Card>
  )

  return (
    <div>
      <Header title="Tableau de bord"/>
      <div className="page-pad">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 'clamp(17px, 2.4vw, 22px)', fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.4px' }}>
            {greeting()}{firstName ? `, ${firstName}` : ''} 👋
          </div>
          <div style={{ fontSize: 12.5, color: '#888' }}>
            {balance >= 0
              ? `Il vous reste ${fmt(safePerDay)} par jour jusqu'à la fin du mois.`
              : 'Attention : vos dépenses dépassent vos revenus ce mois-ci.'}
          </div>
        </div>

        <div className="mobile-only">
          <QuickActions onExpense={() => openQuickAdd('expense')} onIncome={() => openQuickAdd('income')} onBudget={() => nav('/budgets')}/>
        </div>

        {!summary ? <DashboardSkeleton/> : twoColumns ? (
          <div className="dash-grid">
            <div style={{ minWidth: 0 }}>
              {hero}
              {splitCards}
              {transactions}
              {chart}
            </div>
            <div style={{ minWidth: 0 }}>
              {insights}
              {budgetHealth}
              {categories}
              {recurring}
            </div>
          </div>
        ) : (
          // Mobile / tablette : une colonne, l'essentiel en premier
          <div>
            {hero}
            {splitCards}
            {insights}
            {budgetHealth}
            {transactions}
            {categories}
            {recurring}
            {chart}
          </div>
        )}
      </div>
    </div>
  )
}
