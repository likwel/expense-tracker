import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, Wallet, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import { useFmt } from '../hooks/useFmt'
import { MONTHS, MONTHS_SM } from '../utils/format'
import { useApi } from '../hooks/useApi'
import { recurringExpensesApi, recurringIncomesApi } from '../services/api'
import MonthlyChart from '../components/ui/MonthlyChart'

const now = new Date()
const PARAMS = { month: now.getMonth() + 1, year: now.getFullYear() }

export default function Dashboard() {
  const { fmt } = useFmt()
  const nav = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const [txFilter, setTxFilter] = useState('all')

  const { data: summary, refetch: refetchSummary } = useApi('/reports/summary', PARAMS)
  const { data: monthly } = useApi('/reports/monthly', { year: now.getFullYear() })
  const { data: expData, refetch: refetchExp } = useApi('/expenses', { ...PARAMS, take: 5 })
  const { data: recurExp, refetch: refetchRecurExp } = useApi('/recurring')
  const { data: recurInc, refetch: refetchRecurInc } = useApi('/recurring-income')
  const { data: incData } = useApi('/incomes', { ...PARAMS, take: 5 })

  // ── Valeurs réelles backend ───────────────────────────────────
  const punctualExp = summary?.punctualExpenses || 0
  const recurringExp = summary?.recurringExpenses || 0
  const totalIncReal = summary?.totalIncomes || 0  // ← total réel depuis backend
  const punctualInc = summary?.punctualIncomes || 0
  const recurringInc = summary?.recurringIncomes || 0
  const expenses = expData?.data || []

  // 3. Extraire les données
  const incomes = incData?.data || []

  // 4. Fusionner + trier par date desc
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

  // ── Estimation récurrentes non encore générées ────────────────
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const workingDays = Math.round(daysInMonth * 5 / 7)
  
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
      // Début effectif = max(startDate, début du mois)
      const effStart = rStart > mStart ? rStart : mStart
      // Fin effective  = min(endDate,   fin du mois)
      const effEnd   = rEnd && rEnd < mEnd ? rEnd : mEnd

      const effDays    = Math.max(0, Math.round((effEnd - effStart) / 86400000) + 1)
      
      const effWorking = Math.round(effDays * 5 / 7)
      return s + amt * (r.dayType === 'working' ? effWorking : effDays)
    }

    return s
  }, 0)

  const estimatedExp = estimate(activeRecurExp)
  const estimatedInc = estimate(activeRecurInc)
  

  // ── Totaux cohérents ──────────────────────────────────────────
  // Dépenses : ponctuel + récurrent (réel ou estimé)
  // const totalRecurExp = recurringExp > 0 ? recurringExp : estimatedExp
  const totalRecurExp = estimatedExp
  const totalExp = punctualExp + totalRecurExp

  // Revenus : priorité totalIncReal (backend) qui inclut ponctuel + récurrent déjà générés
  // + estimation des récurrents non encore générés
  // const totalRecurInc = recurringInc > 0 ? recurringInc : estimatedInc
  const totalRecurInc = estimatedInc
  // const totalInc = totalIncReal > 0
  //   ? totalIncReal + (recurringInc === 0 ? estimatedInc : 0)  // réel + estimation si pas encore générés
  //   : punctualInc + totalRecurInc
    
  const totalInc = punctualInc + totalRecurInc
    

  const balance = totalInc - totalExp
  const savingPct = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0

  const isExpEstimated = recurringExp === 0 && estimatedExp > 0
  const isIncEstimated = recurringInc === 0 && estimatedInc > 0

  // ── Génération ────────────────────────────────────────────────
  const generate = async () => {
    setGenerating(true)
    setGenResult(null)
    try {
      // Générer dépenses ET revenus récurrents
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
      await Promise.all([
        refetchSummary(),
        refetchExp(),
        refetchRecurExp(),
        refetchRecurInc(),
      ])
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur génération')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <Header title="Tableau de bord" />
      <div style={{ padding: '12px 16px' }}>

        {/* ── Hero ───────────────────────────────────────────── */}
        <div style={{
          background: '#6C5CE7', borderRadius: 20,
          padding: '22px 20px', marginBottom: 14, color: '#fff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontSize: 11, opacity: 0.8, marginBottom: 4, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                Solde du mois
              </div>
              <div style={{
                fontSize: 32, fontWeight: 800, letterSpacing: '-1px',
                color: balance >= 0 ? '#fff' : '#ffb3b3'
              }}>
                {balance >= 0 ? '+' : ''}{fmt(balance)}
              </div>
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
                {MONTHS[now.getMonth()]} {now.getFullYear()}
                {(isExpEstimated || isIncEstimated) && (
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>* estimé</span>
                )}
              </div>
            </div>
            <div style={{
              width: 42, height: 42, borderRadius: 21,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wallet size={20} color="#fff" strokeWidth={1.8} />
            </div>
          </div>

          {/* 3 colonnes : Revenus | Dépenses | Épargne */}
          <div style={{ display: 'flex', marginTop: 18 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 3 }}>Revenus</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {isIncEstimated ? '~' : ''}{fmt(totalInc)}
              </div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 14px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 3 }}>Dépenses</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {isExpEstimated ? '~' : ''}{fmt(totalExp)}
              </div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 14px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 3 }}>Épargne</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{savingPct}%</div>
            </div>
          </div>
        </div>

        {/* ── 2 cartes stats ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>

          {/* Revenus */}
          <div style={{
            flex: 1, background: '#fff', borderRadius: 16,
            padding: '14px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, background: '#e8f8f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ArrowDownCircle size={17} color="#00b894" strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 10, color: '#999', fontWeight: 600 }}>REVENUS</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#00b894', marginBottom: 6 }}>
              {isIncEstimated ? '~' : ''}{fmt(totalInc)}
            </div>
            <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 6 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, marginBottom: 3
              }}>
                <span style={{ color: '#aaa' }}>Ponctuel</span>
                <span style={{ color: '#00b894', fontWeight: 600 }}>{fmt(punctualInc)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#aaa' }}>
                  Récurrent
                  {isIncEstimated && (
                    <span style={{ fontSize: 10, color: '#bbb' }}> (estimé)</span>
                  )}
                </span>
                <span style={{ color: '#6C5CE7', fontWeight: 600 }}>{fmt(totalRecurInc)}</span>
              </div>
            </div>
          </div>

          {/* Dépenses */}
          <div style={{
            flex: 1, background: '#fff', borderRadius: 16,
            padding: '14px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, background: '#fdecea',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ArrowUpCircle size={17} color="#e74c3c" strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 10, color: '#999', fontWeight: 600 }}>DÉPENSES</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#e74c3c', marginBottom: 6 }}>
              {isExpEstimated ? '~' : ''}{fmt(totalExp)}
            </div>
            <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 6 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, marginBottom: 3
              }}>
                <span style={{ color: '#aaa' }}>Ponctuel</span>
                <span style={{ color: '#e74c3c', fontWeight: 600 }}>{fmt(punctualExp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#aaa' }}>
                  Récurrent
                  {isExpEstimated && (
                    <span style={{ fontSize: 10, color: '#bbb' }}> (estimé)</span>
                  )}
                </span>
                <span style={{ color: '#6C5CE7', fontWeight: 600 }}>{fmt(totalRecurExp)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Récurrentes actives ─────────────────────────────── */}
        {(activeRecurExp.length > 0 || activeRecurInc.length > 0) && (
          <Card>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={16} color="#6C5CE7" strokeWidth={1.8} />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#222' }}>
                  Récurrents actifs
                </span>
                <span style={{
                  fontSize: 11, background: '#6C5CE722', color: '#6C5CE7',
                  borderRadius: 99, padding: '2px 8px', fontWeight: 600
                }}>
                  {activeRecurExp.length + activeRecurInc.length}
                </span>
              </div>
              <button onClick={generate} disabled={generating} style={{
                background: generating ? '#aaa' : '#6C5CE7',
                border: 'none', borderRadius: 10, padding: '6px 12px',
                color: '#fff', fontSize: 11, fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <RefreshCw size={11} />
                {generating ? 'En cours...' : 'Générer'}
              </button>
            </div>

            {/* Résultat génération */}
            {genResult && (
              <div style={{
                background: (genResult.generatedExp + genResult.generatedInc) > 0 ? '#e8f8f2' : '#f5f5f5',
                border: `1px solid ${(genResult.generatedExp + genResult.generatedInc) > 0 ? '#00b894' : '#ddd'}`,
                borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontSize: 12,
                color: (genResult.generatedExp + genResult.generatedInc) > 0 ? '#00b894' : '#888',
              }}>
                {(genResult.generatedExp + genResult.generatedInc) > 0
                  ? `✓ ${genResult.generatedExp} dépense(s) + ${genResult.generatedInc} revenu(s) générés — ${genResult.date}`
                  : `Aucune transaction à générer (${genResult.isHoliday ? `jour férié : ${genResult.holidayName}` :
                    genResult.isWorkingDay ? 'déjà générés aujourd\'hui' :
                      'week-end'
                  })`
                }
              </div>
            )}

            {/* Dépenses récurrentes */}
            {activeRecurExp.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{
                  fontSize: 10, color: '#e74c3c', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: 6, marginTop: 4
                }}>
                  Dépenses
                </div>
                {activeRecurExp.slice(0, 2).map(r => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 0', borderBottom: '1px solid #f5f5f5'
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: (r.category?.color || '#e74c3c') + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <RefreshCw size={14} color={r.category?.color || '#e74c3c'} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#222' }}>
                        {r.description || r.category?.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#aaa' }}>
                        {r.frequency === 'daily' && 'Quotidien'}
                        {r.frequency === 'weekly' && 'Hebdomadaire'}
                        {r.frequency === 'monthly' && `Le ${r.dayOfMonth} du mois`}
                        {r.dayType === 'working' && ' · jours ouvrés'}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#e74c3c', flexShrink: 0 }}>
                      -{fmt(r.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Revenus récurrents */}
            {activeRecurInc.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, color: '#00b894', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: 6, marginTop: 4
                }}>
                  Revenus
                </div>
                {activeRecurInc.slice(0, 2).map(r => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 0', borderBottom: '1px solid #f5f5f5'
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: (r.category?.color || '#00b894') + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <RefreshCw size={14} color={r.category?.color || '#00b894'} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#222' }}>
                        {r.description || r.category?.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#aaa' }}>
                        {r.frequency === 'daily' && 'Quotidien'}
                        {r.frequency === 'weekly' && 'Hebdomadaire'}
                        {r.frequency === 'monthly' && `Le ${r.dayOfMonth} du mois`}
                        {r.dayType === 'working' && ' · jours ouvrés'}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#00b894', flexShrink: 0 }}>
                      +{fmt(r.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(activeRecurExp.length > 2 || activeRecurInc.length > 2) && (
              <button onClick={() => nav('/recurring')}
                style={{
                  background: 'none', border: 'none', color: '#6C5CE7',
                  fontSize: 12, cursor: 'pointer', fontWeight: 600, marginTop: 8,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                Voir tout <ChevronRight size={13} />
              </button>
            )}

            {/* Résumé généré ce mois */}
            <div style={{
              marginTop: 10, background: '#f9f7ff', borderRadius: 10,
              padding: '8px 12px', display: 'flex', justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: 11 }}>
                <div style={{ color: '#00b894', fontWeight: 600, marginBottom: 2 }}>
                  +{isIncEstimated ? '~' : ''}{fmt(totalRecurInc)} revenus
                </div>
                <div style={{ color: '#e74c3c', fontWeight: 600 }}>
                  -{isExpEstimated ? '~' : ''}{fmt(totalRecurExp)} dépenses
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11 }}>
                <div style={{ color: '#aaa', marginBottom: 2 }}>Net récurrent</div>
                <div style={{
                  fontWeight: 700, fontSize: 13,
                  color: (totalRecurInc - totalRecurExp) >= 0 ? '#00b894' : '#e74c3c'
                }}>
                  {(totalRecurInc - totalRecurExp) >= 0 ? '+' : ''}
                  {fmt(totalRecurInc - totalRecurExp)}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Transactions récentes ───────────────────────────── */}
        <Card>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 10
          }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#222' }}>
              Transactions récentes
            </span>
            <button
              onClick={() => nav(txFilter === 'income' ? '/incomes' : '/expenses')}
              style={{
                background: 'none', border: 'none', color: '#6C5CE7',
                fontSize: 12, cursor: 'pointer', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 2
              }}>
              Voir tout <ChevronRight size={13} />
            </button>
          </div>

          {/* Filtre dépenses / revenus */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            background: '#f5f5f5', borderRadius: 10, padding: 3, marginBottom: 12,
          }}>
            {[
              { id: 'all', label: 'Tout' },
              { id: 'expense', label: 'Dépenses' },
              { id: 'income', label: 'Revenus' },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setTxFilter(id)} style={{
                padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: txFilter === id ? 700 : 500,
                background: txFilter === id ? '#fff' : 'transparent',
                color: txFilter === id
                  ? id === 'expense' ? '#e74c3c' : id === 'income' ? '#00b894' : '#222'
                  : '#999',
                boxShadow: txFilter === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>

          {filteredTx.length === 0
            ? <div style={{ textAlign: 'center', color: '#ccc', padding: '16px 0', fontSize: 13 }}>
              Aucune transaction ce mois
            </div>
            : filteredTx.map(tx => {
              const isIncome = tx._type === 'income'
              const color = isIncome ? '#00b894' : '#e74c3c'
              const sign = isIncome ? '+' : '-'
              return (
                <div key={`${tx._type}-${tx.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid #f5f5f5',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: (tx.category?.color || color) + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {tx.isRecurring
                      ? <RefreshCw size={15} color={tx.category?.color || color} strokeWidth={1.8} />
                      : <span style={{
                        width: 8, height: 8, borderRadius: 99,
                        background: tx.category?.color || color, display: 'block'
                      }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontWeight: 600, fontSize: 13, color: '#222',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {tx.description || tx.category?.name || '-'}
                      </span>
                      {tx.isRecurring && (
                        <span style={{
                          fontSize: 10, background: '#6C5CE722', color: '#6C5CE7',
                          borderRadius: 99, padding: '1px 7px', fontWeight: 600, flexShrink: 0
                        }}>
                          auto
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: 3,
                        background: isIncome ? '#00b894' : '#e74c3c',
                        display: 'inline-block', flexShrink: 0
                      }} />
                      {tx.category?.name} · {new Date(tx.date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color, flexShrink: 0 }}>
                    {sign}{fmt(tx.amount)}
                  </div>
                </div>
              )
            })
          }
        </Card>

        {/* ── Graphique mensuel ───────────────────────────────── */}

        {monthly && monthly.length > 0 && (
          <Card>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 10
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#222' }}>
                Évolution {now.getFullYear()}
              </span>
              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                <span style={{ color: '#00b894', fontWeight: 600 }}>■ Rev.</span>
                <span style={{ color: '#e74c3c', fontWeight: 600 }}>■ Dép.</span>
              </div>
            </div>

            <MonthlyChart data={monthly} fmt={fmt} />
          </Card>
        )}

      </div>
    </div>
  )
}