import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingDown, TrendingUp,
  Target, BarChart2,
} from 'lucide-react'

const NAV = [
  { to:'/dashboard', Icon:LayoutDashboard, label:'Accueil'  },
  { to:'/expenses',  Icon:TrendingDown,    label:'Dépenses' },
  { to:'/incomes',   Icon:TrendingUp,      label:'Revenus'  },
  { to:'/budgets',   Icon:Target,          label:'Budget'   },
  { to:'/reports',   Icon:BarChart2,       label:'Rapports' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div style={{ maxWidth:1025, margin:'0 auto', minHeight:'100vh', paddingBottom:72 }}>
      <Outlet/>

      <nav style={{
        position:'fixed', bottom:0, left:'50%',
        transform:'translateX(-50%)', width:'100%', maxWidth:480,
        background:'#fff', borderTop:'1px solid #eee',
        display:'flex', zIndex:20,
      }}>
        {NAV.map(({ to, Icon, label }) => {
          const isActive = location.pathname === to ||
            (to === '/expenses' && location.pathname === '/recurring')
          return (
            <NavLink key={to} to={to} end style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              padding:'10px 0 8px', color: isActive ? '#6C5CE7' : '#bbb',
              textDecoration:'none', fontSize:9, fontWeight: isActive ? 700 : 400, gap:3,
            }}>
              <Icon size={20} strokeWidth={1.8}/>
              {label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}