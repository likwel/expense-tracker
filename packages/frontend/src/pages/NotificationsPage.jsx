import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Trash2, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import { useNotifications, LEVEL_STYLE } from '../hooks/useNotifications'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return "À l'instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)   return `Il y a ${h}h`
  const d = Math.floor(h / 24)
  return d < 7 ? `Il y a ${d}j`
    : new Date(dateStr).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
}

function NotifIcon({ level, color }) {
  const p = { size: 16, color, strokeWidth: 2 }
  if (level === 'danger' || level === 'warning') return <AlertTriangle {...p}/>
  if (level === 'success') return <CheckCircle {...p}/>
  return <Info {...p}/>
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifs, loading, markRead, markAllRead, dismiss, dismissAll, unreadCount } = useNotifications()
  const [confirm, setConfirm] = useState(false)

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 20px', borderBottom:'1px solid #f0f0f0',
        position:'sticky', top:0, background:'#fff', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => navigate(-1)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#6C5CE7' }}>
            <ArrowLeft size={22}/>
          </button>
          <span style={{ fontWeight:800, fontSize:17, color:'#222' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ background:'#E24B4A', color:'#fff',
              fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
              {unreadCount}
            </span>
          )}
        </div>
        {notifs.length > 0 && (
          <div style={{ display:'flex', gap:10 }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                background:'none', border:'none', cursor:'pointer',
                fontSize:12, color:'#6C5CE7', fontWeight:600 }}>
                Tout lire
              </button>
            )}
            <button onClick={() => setConfirm(true)} style={{
              background:'none', border:'none', cursor:'pointer', color:'#E24B4A' }}>
              <Trash2 size={18}/>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation suppression totale */}
      {confirm && (
        <div style={{ margin:'12px 16px', background:'#FCEBEB', borderRadius:12,
          padding:'14px 16px', border:'1px solid #F09595' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#A32D2D', marginBottom:10 }}>
            Supprimer toutes les notifications ?
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setConfirm(false)} style={{
              flex:1, padding:'9px', borderRadius:10, border:'none', cursor:'pointer',
              background:'#f5f5f5', fontWeight:600, fontSize:13, color:'#888' }}>
              Annuler
            </button>
            <button onClick={() => { dismissAll(); setConfirm(false) }} style={{
              flex:2, padding:'9px', borderRadius:10, border:'none', cursor:'pointer',
              background:'#E24B4A', fontWeight:700, fontSize:13, color:'#fff' }}>
              Tout supprimer
            </button>
          </div>
        </div>
      )}

      <div style={{ padding:'8px 16px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#ccc', fontSize:13 }}>
            Chargement...
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <Bell size={40} color="#e0e0e0" style={{ margin:'0 auto 12px', display:'block' }}/>
            <div style={{ fontSize:15, color:'#bbb', marginBottom:6 }}>Aucune notification</div>
            <div style={{ fontSize:12, color:'#ccc' }}>
              Les alertes budget et activités apparaîtront ici
            </div>
          </div>
        ) : notifs.map(n => {
          const s = n.style || LEVEL_STYLE.info
          return (
            <div key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              style={{
                display:'flex', alignItems:'flex-start', gap:12,
                padding:'14px 12px', borderRadius:14, marginBottom:8,
                background: !n.isRead ? s.bg : '#fafafa',
                border:`1px solid ${!n.isRead ? s.border : '#f0f0f0'}`,
                cursor: !n.isRead ? 'pointer' : 'default',
                transition:'background 0.15s',
              }}>
              {/* Icône */}
              <div style={{
                width:38, height:38, borderRadius:12, flexShrink:0,
                background: s.bg, border:`1px solid ${s.border}`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <NotifIcon level={n.level} color={s.color}/>
              </div>

              {/* Contenu */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <span style={{ fontSize:13, fontWeight: !n.isRead ? 700 : 500,
                    color: !n.isRead ? '#222' : '#555', lineHeight:1.4 }}>
                    {n.title}
                  </span>
                  {!n.isRead && (
                    <span style={{ width:7, height:7, borderRadius:'50%',
                      background:'#6C5CE7', flexShrink:0, marginTop:4, marginLeft:8 }}/>
                  )}
                </div>
                {n.message && (
                  <div style={{ fontSize:12, color:'#888', marginTop:3, lineHeight:1.5 }}>
                    {n.message}
                  </div>
                )}
                <div style={{ fontSize:11, color:'#bbb', marginTop:5 }}>
                  {timeAgo(n.createdAt)}
                </div>
              </div>

              {/* Supprimer */}
              <button
                onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                style={{ background:'none', border:'none', cursor:'pointer',
                  color:'#ddd', padding:0, flexShrink:0, marginTop:2 }}
                onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                onMouseLeave={e => e.currentTarget.style.color = '#ddd'}>
                <X size={15}/>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}