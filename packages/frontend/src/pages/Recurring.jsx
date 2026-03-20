import { useState } from 'react'
import {
  Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight,
  Calendar, AlertTriangle, CheckCircle, Clock, Pencil
} from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { fmt } from '../utils/format'
import { useApi } from '../hooks/useApi'
import api from '../services/api'
import { LucideIcon } from '../utils/iconResolver'

const FREQ_LABEL = { daily: 'Quotidien', weekly: 'Hebdomadaire', monthly: 'Mensuel' }
const DTYPE_LABEL = { all: 'Tous les jours', working: 'Jours ouvrés', holiday: 'Jours fériés' }
const DTYPE_COLOR = { all: '#6C5CE7', working: '#00b894', holiday: '#E24B4A' }
const DOW_LABEL = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const FREQ_OPTIONS = ['daily', 'weekly', 'monthly']
const DTYPE_OPTIONS = ['all', 'working', 'holiday']

const EMPTY_FORM = {
  categoryId: '', amount: '', description: '', frequency: 'monthly',
  dayOfMonth: '', dayOfWeek: '', dayType: 'all',
  startDate: new Date().toISOString().split('T')[0], endDate: '',
}

// ── Carte récurrence (composant externe) ─────────────────────────
function RecurringCard({ item, onEdit, onToggle, onRemove }) {
  const color = item.category?.color || '#6C5CE7'
  return (
    <div style={{
      background: '#fff', borderRadius: 16, marginBottom: 10,
      border: `0.5px solid ${item.isActive ? '#eee' : '#f5f5f5'}`,
      opacity: item.isActive ? 1 : 0.55, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

          <div style={{
            width:50, height: 50, borderRadius: 12, flexShrink: 0,
            background: color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LucideIcon name={item.category?.icon} size={20} color={color} strokeWidth={1.8} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#222' }}>
                {item.description || item.category?.name || 'Sans nom'}
              </span>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#E24B4A', flexShrink: 0, marginLeft: 8 }}>
                -{fmt(item.amount)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: '#EEEDFE', color: '#534AB7'
              }}>
                {FREQ_LABEL[item.frequency]}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: DTYPE_COLOR[item.dayType] + '18', color: DTYPE_COLOR[item.dayType]
              }}>
                {DTYPE_LABEL[item.dayType]}
              </span>
              {item.frequency === 'monthly' && item.dayOfMonth && (
                <span style={{ fontSize: 10, color: '#aaa', padding: '2px 6px' }}>
                  le {item.dayOfMonth}
                </span>
              )}
              {item.frequency === 'weekly' && item.dayOfWeek != null && (
                <span style={{ fontSize: 10, color: '#aaa', padding: '2px 6px' }}>
                  chaque {DOW_LABEL[item.dayOfWeek]}
                </span>
              )}
            </div>

            
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#bbb', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Calendar size={10} />
                Début {new Date(item.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {item.lastRunAt && (
                <span style={{ fontSize: 11, color: '#bbb', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} />
                  Dernier {new Date(item.lastRunAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: 6,
          marginTop: 10, paddingTop: 10, borderTop: '0.5px solid #f5f5f5'
        }}>
          <button onClick={() => onToggle(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: item.isActive ? '#E1F5EE' : '#f5f5f5',
            fontSize: 11, fontWeight: 600,
            color: item.isActive ? '#0F6E56' : '#aaa',
          }}>
            {item.isActive ? <><ToggleRight size={14} /> Actif</> : <><ToggleLeft size={14} /> Inactif</>}
          </button>

          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap:5,
          }}>

            <button onClick={() => onEdit(item)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#f5f5f5', fontSize: 11, fontWeight: 600, color: '#555',
            }}>
              <Pencil size={13} /> Modifier
            </button>

            <button onClick={() => onRemove(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#FCEBEB', fontSize: 11, fontWeight: 600, color: '#E24B4A',
            }}>
              <Trash2 size={13} />
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────
export default function Recurring() {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [genMsg, setGenMsg] = useState(null)
  const [editId, setEditId] = useState(null)

  const { data: list, refetch } = useApi('/recurring')
  const { data: cats } = useApi('/categories')
  const { data: holidays } = useApi('/recurring/holidays', { year: new Date().getFullYear() })

  const expCats = (cats || []).filter(c => c.type === 'expense')
  const items = list || []
  const active = items.filter(i => i.isActive)
  const inactive = items.filter(i => !i.isActive)
  const totalActive = active.reduce((s, r) => s + Number(r.amount), 0)

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit = (item) => {
    setEditId(item.id)
    setForm({
      categoryId: item.categoryId || '',
      amount: item.amount || '',
      description: item.description || '',
      frequency: item.frequency,
      dayOfMonth: item.dayOfMonth || '',
      dayOfWeek: item.dayOfWeek ?? '',
      dayType: item.dayType,
      startDate: item.startDate?.split('T')[0] || '',
      endDate: item.endDate?.split('T')[0] || '',
    })
    setModal(true)
  }

  const save = async () => {
    if (!form.amount || !form.startDate) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        categoryId: Number(form.categoryId) || null,
        dayOfMonth: form.dayOfMonth !== '' ? Number(form.dayOfMonth) : null,
        dayOfWeek: form.dayOfWeek !== '' ? Number(form.dayOfWeek) : null,
        endDate: form.endDate || null,
      }
      editId
        ? await api.put(`/recurring/${editId}`, payload)
        : await api.post('/recurring', payload)
      setModal(false)
      refetch()
    } catch (e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const toggle = async (id) => { await api.patch(`/recurring/${id}/toggle`); refetch() }
  const remove = async (id) => {
    if (!confirm('Supprimer cette récurrence ?')) return
    await api.delete(`/recurring/${id}`); refetch()
  }

  const generate = async () => {
    try {
      const { data } = await api.post('/recurring/generate')
      setGenMsg(data); refetch()
      setTimeout(() => setGenMsg(null), 5000)
    } catch (e) { alert(e.response?.data?.error || 'Erreur génération') }
  }

  const DaySelector = () => {
    if (form.frequency === 'monthly') return (
      <Input label="Jour du mois (1-31)" type="number"
        placeholder="ex: 5 → le 5 de chaque mois"
        min={1} max={31} value={form.dayOfMonth} onChange={set('dayOfMonth')} />
    )
    if (form.frequency === 'weekly') return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#555', fontWeight: 600, marginBottom: 6, display: 'block' }}>
          Jour de la semaine
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DOW_LABEL.map((d, i) => (
            <button key={i} type="button"
              onClick={() => setForm(p => ({ ...p, dayOfWeek: String(i) }))}
              style={{
                padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 12,
                background: String(form.dayOfWeek) === String(i) ? '#6C5CE7' : '#f0f0f0',
                color: String(form.dayOfWeek) === String(i) ? '#fff' : '#555',
              }}>{d}</button>
          ))}
        </div>
      </div>
    )
    return null
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <Header title="Dépenses récurrentes" />
      <div style={{ padding: '12px 16px' }}>

        {/* Résumé */}
        {active.length > 0 && (
          <div style={{ background: '#6C5CE7', borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{
              fontSize: 11, color: '#AFA9EC', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4
            }}>
              Total récurrents actifs
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
              -{fmt(totalActive)}
            </div>
            <div style={{ fontSize: 12, color: '#EEEDFE' }}>
              {active.length} récurrence{active.length > 1 ? 's' : ''} active{active.length > 1 ? 's' : ''}
              {inactive.length > 0 && ` · ${inactive.length} inactive${inactive.length > 1 ? 's' : ''}`}
            </div>
          </div>
        )}

        {/* Bouton générer */}
        <button onClick={generate} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: 12, borderRadius: 14, marginBottom: 14,
          background: '#f7f6fd', border: '1.5px solid #EEEDFE',
          color: '#6C5CE7', fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}>
          <RefreshCw size={15} strokeWidth={2} /> Générer les dépenses du jour
        </button>

        {/* Message génération */}
        {genMsg && (
          <div style={{
            background: genMsg.generated > 0 ? '#E1F5EE' : '#f5f5f5',
            border: `1px solid ${genMsg.generated > 0 ? '#9FE1CB' : '#ddd'}`,
            borderRadius: 12, padding: '12px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <CheckCircle size={16} color={genMsg.generated > 0 ? '#0F6E56' : '#aaa'} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: genMsg.generated > 0 ? '#0F6E56' : '#888' }}>
                {genMsg.generated > 0 ? `${genMsg.generated} dépense(s) générée(s)` : 'Aucune dépense à générer'}
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                {genMsg.isHoliday ? `Jour férié : ${genMsg.holidayName}` : genMsg.isWorkingDay ? 'Jour ouvré' : 'Week-end'}
                {' · '}{genMsg.date}
              </div>
            </div>
          </div>
        )}

        {/* Listes */}
        {active.length === 0 && inactive.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#ccc' }}>
            <RefreshCw size={36} color="#e0e0e0" style={{ margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontSize: 14, marginBottom: 6 }}>Aucune dépense récurrente</div>
            <div style={{ fontSize: 12 }}>Appuyez sur + pour en créer une</div>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#aaa',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8
                }}>
                  Actives ({active.length})
                </div>
                {active.map(item => (
                  <RecurringCard key={item.id} item={item}
                    onEdit={openEdit} onToggle={toggle} onRemove={remove} />
                ))}
              </>
            )}
            {inactive.length > 0 && (
              <>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#aaa',
                  textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 8px'
                }}>
                  Inactives ({inactive.length})
                </div>
                {inactive.map(item => (
                  <RecurringCard key={item.id} item={item}
                    onEdit={openEdit} onToggle={toggle} onRemove={remove} />
                ))}
              </>
            )}
          </>
        )}

        {/* Jours fériés */}
        {holidays?.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 16, border: '0.5px solid #eee',
            overflow: 'hidden', marginTop: 14
          }}>
            <div style={{
              padding: '12px 14px', borderBottom: '0.5px solid #f5f5f5',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <AlertTriangle size={15} color="#E24B4A" />
              <span style={{ fontWeight: 700, fontSize: 13, color: '#222' }}>
                Jours fériés {new Date().getFullYear()}
              </span>
            </div>
            {holidays.map(h => (
              <div key={h.id} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '9px 14px',
                borderBottom: '0.5px solid #fafafa', fontSize: 13
              }}>
                <span style={{ color: '#444' }}>{h.name}</span>
                <span style={{ color: '#aaa', fontSize: 11 }}>
                  {new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={openCreate} style={{
        position: 'fixed', bottom: 84, right: 20,
        width: 52, height: 52, borderRadius: 26,
        background: '#6C5CE7', border: 'none', color: '#fff', cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(108,92,231,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 15,
      }}>
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Modal */}
      {modal && (
        <Modal title={editId ? 'Modifier la récurrence' : 'Nouvelle récurrence'}
          onClose={() => setModal(false)}>
          {/* Zone scrollable */}
          <div style={{ overflowY: 'auto', maxHeight: '60vh', paddingRight: 4 }}>

            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 12, fontWeight: 700, color: '#888',
                textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 8
              }}>
                Catégorie
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
                {expCats.map(c => {
                  const isActive = String(form.categoryId) === String(c.id)
                  const color = c.color || '#6C5CE7'
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setForm(p => ({ ...p, categoryId: String(c.id) }))}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                        padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${isActive ? color : '#eee'}`,
                        background: isActive ? color + '15' : '#fafafa',
                      }}>
                      <LucideIcon name={c.icon} size={18}
                        color={isActive ? color : '#bbb'} strokeWidth={1.8} />
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: isActive ? color : '#888'
                      }}>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Input label="Montant (Ar)" type="number" placeholder="5 000"
              value={form.amount} onChange={set('amount')} />
            <Input label="Description" type="text" placeholder="Transport, loyer..."
              value={form.description} onChange={set('description')} />

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#555', fontWeight: 700, marginBottom: 6, display: 'block' }}>
                Fréquence
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {FREQ_OPTIONS.map(f => (
                  <button key={f} type="button"
                    onClick={() => setForm(p => ({ ...p, frequency: f, dayOfMonth: '', dayOfWeek: '' }))}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 12,
                      background: form.frequency === f ? '#6C5CE7' : '#f0f0f0',
                      color: form.frequency === f ? '#fff' : '#555'
                    }}>
                    {FREQ_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>

            <DaySelector />

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#555', fontWeight: 700, marginBottom: 6, display: 'block' }}>
                Type de jour
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {DTYPE_OPTIONS.map(d => (
                  <button key={d} type="button"
                    onClick={() => setForm(p => ({ ...p, dayType: d }))}
                    style={{
                      flex: 1, padding: '9px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 11,
                      background: form.dayType === d ? DTYPE_COLOR[d] : '#f0f0f0',
                      color: form.dayType === d ? '#fff' : '#555'
                    }}>
                    {DTYPE_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>

            <Input label="Date de début" type="date"
              value={form.startDate} onChange={set('startDate')} />
            <Input label="Date de fin (optionnel)" type="date"
              value={form.endDate} onChange={set('endDate')} />

          </div>{/* fin scroll */}

          {/* Boutons fixés en bas */}
          <div style={{
            display: 'flex', gap: 10, marginTop: 12,
            paddingTop: 12, borderTop: '0.5px solid #f0f0f0'
          }}>
            <button onClick={() => setModal(false)} style={{
              flex: 1, padding: 12, borderRadius: 12, cursor: 'pointer',
              background: '#f7f7f7', border: 'none', fontWeight: 600, fontSize: 14, color: '#888',
            }}>Annuler</button>
            <button onClick={save} disabled={saving} style={{
              flex: 2, padding: 12, borderRadius: 12,
              background: saving ? '#a09bda' : '#6C5CE7',
              border: 'none', fontWeight: 700, fontSize: 14, color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}