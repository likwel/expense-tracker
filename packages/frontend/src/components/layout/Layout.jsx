import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, TrendingDown, TrendingUp,
  Target, BarChart2, RefreshCw, Settings, X
} from 'lucide-react'

const NAV = [
  { to:'/',         Icon:LayoutDashboard, label:'Accueil'  },
  { to:'/expenses', Icon:TrendingDown,    label:'Dépenses' },
  { to:'/incomes',  Icon:TrendingUp,      label:'Revenus'  },
  { to:'/budgets',  Icon:Target,          label:'Budget'   },
  { to:'/reports',  Icon:BarChart2,       label:'Rapports' },
]

// Sous-menu qui s'ouvre depuis "Dépenses"
const EXPENSES_SUBMENU = [
  { to:'/expenses',  Icon:TrendingDown, label:'Dépenses ponctuelles' },
  { to:'/recurring', Icon:RefreshCw,    label:'Dépenses récurrentes' },
]

export default function Layout() {
  const [subMenu, setSubMenu] = useState(false)
  const navigate = useNavigate()

  const handleExpensesClick = (e, isActive) => {
    // Si déjà sur /expenses ou /recurring → ouvrir/fermer le sous-menu
    // Sinon naviguer vers /expenses
    e.preventDefault()
    setSubMenu(v => !v)
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', paddingBottom:72 }}>
      <Outlet/>

      {/* Overlay sous-menu */}
      {subMenu && (
        <div
          onClick={() => setSubMenu(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', zIndex:18 }}
        />
      )}

      {/* Sous-menu dépenses (pop-up au dessus de la nav) */}
      {subMenu && (
        <div style={{
          position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)',
          width:'calc(100% - 32px)', maxWidth:448,
          background:'#fff', borderRadius:16,
          boxShadow:'0 -4px 24px rgba(0,0,0,0.12)',
          zIndex:19, overflow:'hidden',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'12px 16px 8px', borderBottom:'1px solid #f5f5f5' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#999',
              textTransform:'uppercase', letterSpacing:'0.5px' }}>
              Dépenses
            </span>
            <button onClick={() => setSubMenu(false)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', padding:2 }}>
              <X size={16}/>
            </button>
          </div>
          {EXPENSES_SUBMENU.map(({ to, Icon, label }) => (
            <button key={to}
              onClick={() => { navigate(to); setSubMenu(false) }}
              style={{
                display:'flex', alignItems:'center', gap:14,
                width:'100%', padding:'14px 20px',
                background:'none', border:'none', cursor:'pointer',
                borderBottom:'1px solid #f9f9f9',
                textAlign:'left',
              }}>
              <div style={{ width:38, height:38, borderRadius:12, background:'#6C5CE722',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={18} color="#6C5CE7" strokeWidth={1.8}/>
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:'#222' }}>{label}</div>
                <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>
                  {to === '/expenses'  ? 'Dépenses ponctuelles et journalières' : 'Mensuel, hebdo, jours ouvrés...'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom nav — 5 items */}
      <nav style={{
        position:'fixed', bottom:0, left:'50%',
        transform:'translateX(-50%)', width:'100%', maxWidth:480,
        background:'#fff', borderTop:'1px solid #eee',
        display:'flex', zIndex:20,
      }}>
        {NAV.map(({ to, Icon, label }) => {
          // Bouton Dépenses → ouvre le sous-menu
          if (to === '/expenses') {
            return (
              <button key={to}
                onClick={() => setSubMenu(v => !v)}
                style={{
                  flex:1, display:'flex', flexDirection:'column', alignItems:'center',
                  padding:'10px 0 8px', border:'none', background:'none', cursor:'pointer',
                  color: subMenu ? '#6C5CE7' : '#bbb', gap:3,
                }}>
                <Icon size={20} strokeWidth={1.8}/>
                <span style={{ fontSize:9, fontWeight: subMenu ? 700 : 400 }}>{label}</span>
              </button>
            )
          }
          // Autres items normaux
          return (
            <NavLink key={to} to={to} end={to==='/'} style={({ isActive }) => ({
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              padding:'10px 0 8px', color: isActive ? '#6C5CE7' : '#bbb',
              textDecoration:'none', fontSize:9, fontWeight: isActive ? 700 : 400, gap:3,
            })}>
              <Icon size={20} strokeWidth={1.8}/>
              {label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}