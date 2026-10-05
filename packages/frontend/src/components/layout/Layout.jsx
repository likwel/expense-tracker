import { Suspense } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingDown, TrendingUp, Target, BarChart2,
  RefreshCw, Bell, User, CreditCard, HelpCircle, Plus,
} from 'lucide-react'
import { QuickAddProvider, useQuickAdd } from '../QuickAdd'
import { useAuth } from '../../contexts/AuthContext'

const NAV = [
  { to:'/dashboard', Icon:LayoutDashboard, label:'Accueil'     },
  { to:'/expenses',  Icon:TrendingDown,    label:'Dépenses'    },
  { to:'/incomes',   Icon:TrendingUp,      label:'Revenus'     },
  { to:'/budgets',   Icon:Target,          label:'Budgets'     },
  { to:'/reports',   Icon:BarChart2,       label:'Rapports'    },
]

const NAV_EXTRA = [
  { to:'/recurring', Icon:RefreshCw, label:'Récurrents' },
]

const NAV_ACCOUNT = [
  { to:'/notifications',    Icon:Bell,       label:'Alertes'  },
  { to:'/settings/profile', Icon:User,       label:'Profil'   },
  { to:'/settings/plan',    Icon:CreditCard, label:'Mon plan' },
  { to:'/help',             Icon:HelpCircle, label:'Aide'     },
]

function BrandMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <rect width="44" height="44" rx="11" fill="#534AB7"/>
      <rect x="10" y="20" width="24" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
      <rect x="10" y="26" width="16" height="3" rx="1.5" fill="#EEEDFE" opacity="0.4"/>
      <circle cx="28" cy="16" r="5" fill="none" stroke="#EEEDFE" strokeWidth="1.5"/>
      <path d="M28 13v3l2 1.5" stroke="#EEEDFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="10" y="13" width="11" height="3" rx="1.5" fill="#EEEDFE"/>
    </svg>
  )
}

function SideLink({ to, Icon, label }) {
  return (
    <NavLink to={to} end title={label} className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
      <Icon size={19} strokeWidth={1.9} style={{ flexShrink:0 }}/>
      <span className="sidebar-label">{label}</span>
    </NavLink>
  )
}

function Sidebar() {
  const openQuickAdd = useQuickAdd()
  const { user }     = useAuth()

  return (
    <aside className="app-sidebar" aria-label="Navigation principale">
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 4px', marginBottom:22, justifyContent:'center' }}>
        <BrandMark/>
        <div className="sidebar-brand-name" style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:17, color:'var(--text)', letterSpacing:'-0.4px' }}>Depenzo</div>
          <div style={{ fontSize:11, color:'var(--muted)' }}>Budget & dépenses</div>
        </div>
      </div>

      <button onClick={() => openQuickAdd('expense')} title="Ajout rapide (N)" style={{
        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        padding:'11px 12px', borderRadius:12, border:'none', cursor:'pointer',
        background:'var(--brand)', color:'#fff', fontWeight:700, fontSize:14,
        boxShadow:'0 4px 14px rgba(108,92,231,0.35)', marginBottom:18,
      }}>
        <Plus size={18} strokeWidth={2.5}/>
        <span className="sidebar-label" style={{ flex:1, textAlign:'left' }}>Ajouter</span>
        <span className="sidebar-hint kbd" style={{ color:'#fff', borderColor:'rgba(255,255,255,0.4)' }}>N</span>
      </button>

      <nav style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {[...NAV, ...NAV_EXTRA].map(item => <SideLink key={item.to} {...item}/>)}
      </nav>

      <div className="sidebar-section" style={{ fontSize:10, fontWeight:700, color:'#b5b5c5', textTransform:'uppercase',
        letterSpacing:'0.6px', padding:'20px 12px 6px' }}>
        Compte
      </div>
      <div style={{ height:1, background:'var(--border)', margin:'14px 6px' }} className="sidebar-divider"/>
      <nav style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {NAV_ACCOUNT.map(item => <SideLink key={item.to} {...item}/>)}
      </nav>

      <div style={{ flex:1 }}/>

      <NavLink to="/settings/profile" title={user?.email} style={{
        display:'flex', alignItems:'center', gap:10, padding:8, borderRadius:12,
        textDecoration:'none', background:'var(--brand-tint)', justifyContent:'center',
      }}>
        <div style={{ width:34, height:34, borderRadius:17, background:'var(--brand)', color:'#fff', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14 }}>
          {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
        </div>
        <div className="sidebar-label" style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {user?.name || 'Mon compte'}
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {user?.email}
          </div>
        </div>
      </NavLink>
    </aside>
  )
}

function PageSkeleton() {
  return (
    <div className="page-pad" aria-busy="true">
      <div className="skeleton" style={{ height:28, width:180, marginBottom:20 }}/>
      <div className="skeleton" style={{ height:150, borderRadius:20, marginBottom:14 }}/>
      <div className="grid-2">
        <div className="skeleton" style={{ height:110, borderRadius:16 }}/>
        <div className="skeleton" style={{ height:110, borderRadius:16 }}/>
      </div>
    </div>
  )
}

function BottomNav() {
  const location = useLocation()
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {NAV.map(({ to, Icon, label }) => {
        const isActive = location.pathname === to ||
          (to === '/expenses' && location.pathname === '/recurring')
        return (
          <NavLink key={to} to={to} end className={isActive ? 'active' : ''} aria-current={isActive ? 'page' : undefined}>
            <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8}/>
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default function Layout() {
  return (
    <QuickAddProvider>
      <div className="app-shell">
        <Sidebar/>
        <main className="app-main">
          <div className="app-content">
            <Suspense fallback={<PageSkeleton/>}>
              <Outlet/>
            </Suspense>
          </div>
        </main>
        <BottomNav/>
      </div>
    </QuickAddProvider>
  )
}
