import { useState, useRef, useEffect } from 'react'
import {
  Calendar, User, Shield, Sun, DollarSign, X, LogOut,
  Zap, CreditCard, HelpCircle, Bell, LayoutList,
  AlertTriangle, CheckCircle, Info, Trash2, Settings2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../../contexts/AuthContext'
import { usePlan }     from '../../hooks/usePlan'
import { useNotifications, LEVEL_STYLE } from '../../hooks/useNotifications'
import { MONTHS_FULL } from '../../utils/format'

const MENU_ITEMS = [
  { icon: User,       label: 'Profil',    sub: 'Nom, email, avatar',  to: '/settings/profile',  color: '#534AB7', bg: '#EEEDFE' },
  { icon: Settings2,       label: 'Espace Admin',    sub: 'Espace administrateur',  to: '/admin',  color: '#f7a93c', bg: '#f6f5cf' },
  { icon: Shield,     label: 'Sécurité',  sub: 'Mot de passe',        to: '/settings/security', color: '#0F6E56', bg: '#E1F5EE' },
  { icon: Sun,        label: 'Thème',     sub: 'Clair, sombre',       to: '/settings/theme',    color: '#BA7517', bg: '#FAEEDA' },
  { icon: DollarSign, label: 'Devise',    sub: 'Ar, €, $...',         to: '/settings/currency', color: '#185FA5', bg: '#E6F1FB' },
  { icon: CreditCard, label: 'Mon plan',  sub: 'Abonnement, limites', to: '/settings/plan',     color: '#993556', bg: '#FBEAF0' },
  { icon: Bell,       label: 'Alertes',   sub: 'Notifications',       to: '/notifications',   color: '#854F0B', bg: '#FAEEDA' },
  { icon: HelpCircle, label: 'Aide',      sub: 'FAQ, support',        to: '/help',              color: '#5F5E5A', bg: '#F1EFE8' },
]

const PLAN_STYLE = {
  free:  { label: 'Gratuit', bg: '#f1f0fb', color: '#534AB7' },
  pro:   { label: 'Pro',     bg: '#EEEDFE', color: '#3C3489' },
  trial: { label: 'Essai',   bg: '#E1F5EE', color: '#0F6E56' },
}

function NotifIcon({ level, color, size = 13 }) {
  const p = { size, color, strokeWidth: 2 }
  if (level === 'danger' || level === 'warning') return <AlertTriangle {...p}/>
  if (level === 'success') return <CheckCircle {...p}/>
  return <Info {...p}/>
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return "À l'instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)   return `Il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)    return `Il y a ${d}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="10" fill="#534AB7"/>
      <rect x="10" y="20" width="24" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
      <rect x="10" y="26" width="16" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
      <circle cx="28" cy="16" r="7" fill="#EEEDFE" opacity="0.15"/>
      <circle cx="28" cy="16" r="5" fill="none" stroke="#EEEDFE" strokeWidth="1.5"/>
      <path d="M28 13v3l2 1.5" stroke="#EEEDFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="10" y="13" width="11" height="3" rx="1.5" fill="#EEEDFE"/>
    </svg>
  )
}

export default function Header({ title }) {
  const { user, logout }          = useAuth()
  const { plan }                  = usePlan()
  const navigate                  = useNavigate()
  const now                       = new Date()
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const menuRef  = useRef(null)
  const notifRef = useRef(null)

  // ── Notifications avec valeurs par défaut sécurisées ─────────
  const {
    notifs      = [],
    unreadCount = 0,
    loading     = false,
    markRead    = () => {},
    markAllRead = () => {},
    dismiss     = () => {},
    dismissAll  = () => {},
  } = useNotifications() || {}

  // ── Fermer dropdowns au clic extérieur ────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { setMenuOpen(false); logout(); navigate('/login') }

  const planKey   = plan?.isTrial ? 'trial' : (plan?.effectivePlan ?? 'free')
  const planStyle = PLAN_STYLE[planKey] ?? PLAN_STYLE.free

  const handleNotifOpen = () => { setNotifOpen(v => !v); setMenuOpen(false) }
  const handleNotifClick = async (n) => { if (!n.isRead) await markRead(n.id) }

  return (
    <div style={{
      background: '#fff', padding: '10px 20px',
      boxShadow: '0 1px 0 #eee', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        {/* ── Logo + titre + date ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo/>
          <div style={{ width: 1, height: 28, background: '#eee' }}/>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#222', lineHeight: 1.2 }}>
              {title}
            </div>
            <div style={{ fontSize: 11, color: '#bbb', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <Calendar size={10}/>
              {MONTHS_FULL[now.getMonth()]} {now.getFullYear()}
            </div>
          </div>
        </div>

        {/* ── Actions droite ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Cloche notifications */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button onClick={handleNotifOpen} style={{
              width: 38, height: 38, borderRadius: 19,
              background: notifOpen ? '#6C5CE7' : '#f5f3ff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', position: 'relative',
            }}>
              <Bell size={17} color={notifOpen ? '#fff' : '#6C5CE7'} strokeWidth={1.9}/>
              {unreadCount > 0 && !notifOpen && (
                <span style={{
                  position: 'absolute', top: 5, right: 5,
                  minWidth: unreadCount > 9 ? 16 : 8,
                  height: unreadCount > 9 ? 16 : 8,
                  borderRadius: 8, background: '#E24B4A',
                  border: '1.5px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: '#fff',
                  padding: unreadCount > 9 ? '0 3px' : 0,
                }}>
                  {unreadCount > 9 ? '9+' : ''}
                </span>
              )}
            </button>

            {notifOpen && (
              <div style={{
                position: 'absolute', top: 46, right: 0,
                background: '#fff', borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
                width: 300, zIndex: 50, overflow: 'hidden',
              }}>
                {/* En-tête notifs */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px 8px', borderBottom: '1px solid #f0f0f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span style={{
                        background: '#E24B4A', color: '#fff',
                        fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                      }}>{unreadCount}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 11, color: '#6C5CE7', fontWeight: 600,
                      }}>
                        Tout lire
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc' }}>
                      <X size={14}/>
                    </button>
                  </div>
                </div>

                {/* Liste notifs */}
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#ccc', fontSize: 13 }}>
                      Chargement...
                    </div>
                  ) : notifs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 0' }}>
                      <Bell size={28} color="#e0e0e0" style={{ margin: '0 auto 8px', display: 'block' }}/>
                      <div style={{ fontSize: 13, color: '#ccc' }}>Aucune notification</div>
                    </div>
                  ) : (
                    <div style={{ padding: '6px 8px' }}>
                      {notifs.map(n => {
                        const s = n.style || LEVEL_STYLE.info
                        return (
                          <div key={n.id}
                            onClick={() => handleNotifClick(n)}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              padding: '9px 8px', borderRadius: 10, marginBottom: 2,
                              background: !n.isRead ? s.bg : 'none',
                              cursor: 'pointer', transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = !n.isRead ? s.bg : '#f7f7f7'}
                            onMouseLeave={e => e.currentTarget.style.background = !n.isRead ? s.bg : 'none'}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                              background: s.bg, border: `1px solid ${s.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <NotifIcon level={n.level} color={s.color}/>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 12, lineHeight: 1.4,
                                fontWeight: !n.isRead ? 700 : 400,
                                color: !n.isRead ? '#222' : '#555',
                              }}>
                                {n.title}
                              </div>
                              {n.message && (
                                <div style={{
                                  fontSize: 11, color: '#aaa', marginTop: 2,
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {n.message}
                                </div>
                              )}
                              <div style={{ fontSize: 10, color: '#bbb', marginTop: 3 }}>
                                {timeAgo(n.createdAt)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              {!n.isRead && (
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6C5CE7' }}/>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', padding: 0 }}
                                onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                                onMouseLeave={e => e.currentTarget.style.color = '#ddd'}
                              >
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Footer notifs */}
                <div style={{
                  borderTop: '1px solid #f0f0f0', padding: '8px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <button
                    onClick={() => { navigate('/notifications'); setNotifOpen(false) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6C5CE7', fontWeight: 600 }}>
                    Gérer les alertes →
                  </button>
                  {notifs.length > 0 && (
                    <button onClick={dismissAll}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#aaa' }}>
                      Tout effacer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bouton menu */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => { setMenuOpen(v => !v); setNotifOpen(false) }}
              style={{
                width: 38, height: 38, borderRadius: 19,
                background: menuOpen ? '#6C5CE7' : '#f5f3ff',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}>
              <LayoutList size={18} color={menuOpen ? '#fff' : '#6C5CE7'} strokeWidth={1.9}/>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 46, right: 0,
                background: '#fff', borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
                minWidth: 230, zIndex: 50, overflow: 'hidden',
              }}>
                {/* En-tête menu */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '10px 14px 8px', borderBottom: '1px solid #f0f0f0',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>
                      {user?.name || 'Utilisateur'}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                      {user?.email || ''}
                    </div>
                    <button
                      onClick={() => { navigate('/settings/plan'); setMenuOpen(false) }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: planStyle.bg, color: planStyle.color,
                        fontSize: 11, fontWeight: 700, padding: '3px 8px',
                        borderRadius: 20, border: 'none', cursor: 'pointer',
                      }}>
                      <Zap size={10} strokeWidth={2.5}/>
                      {planStyle.label}
                      {plan?.isTrial && plan?.trialEndAt && (
                        <span style={{ fontWeight: 400, opacity: 0.75 }}>
                          · fin {new Date(plan.trialEndAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </button>
                  </div>
                  <button onClick={() => setMenuOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2 }}>
                    <X size={14}/>
                  </button>
                </div>

                {/* Items menu */}
                <div style={{ padding: '6px 8px' }}>
                  {MENU_ITEMS.map(({ icon: Icon, label, sub, to, color, bg }) => (
                    <button key={to}
                      onClick={() => { navigate(to); setMenuOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '9px 8px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderRadius: 10, textAlign: 'left', transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f7f6fd'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, background: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon size={15} color={color} strokeWidth={1.8}/>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#222', lineHeight: 1.2 }}>{label}</div>
                        <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{sub}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{ height: 1, background: '#f0f0f0', margin: '0 8px' }}/>

                {/* Déconnexion */}
                <div style={{ padding: '6px 8px' }}>
                  <button onClick={handleLogout}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '9px 8px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderRadius: 10, textAlign: 'left', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, background: '#FCEBEB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <LogOut size={15} color="#E24B4A" strokeWidth={1.8}/>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#E24B4A', lineHeight: 1.2 }}>Déconnexion</div>
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>Quitter l'application</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}