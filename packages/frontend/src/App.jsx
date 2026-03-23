import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout       from './components/layout/Layout'
import Dashboard    from './pages/Dashboard'
import Expenses     from './pages/Expenses'
import Incomes      from './pages/Incomes'
import Budgets      from './pages/Budgets'
import Reports      from './pages/Reports'
import Recurring    from './pages/Recurring'
import Login        from './pages/Login'
import Register     from './pages/Register'
import LandingPage  from './pages/LandingPage'
import ProfilePage  from './pages/settings/ProfilePage'
import SecurityPage from './pages/settings/SecurityPage'
import ThemePage    from './pages/settings/ThemePage'
import CurrencyPage from './pages/settings/CurrencyPage'
import TermsPage   from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import NotificationsPage from './pages/NotificationsPage'
import HelpPage          from './pages/HelpPage'
import PlanPage          from './pages/settings/PlanPage'
import AdminPage from './pages/Admin'

function PrivateRoute({ children }) {
  const { user, loading, ratesReady } = useAuth()

  if (loading || !ratesReady) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', color:'#aaa', fontSize:14 }}>
      Chargement...
    </div>
  )
  return user ? children : <Navigate to="/login" replace/>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Pages publiques */}
      <Route path="/landing"  element={<LandingPage/>}/>
      <Route path="/login"    element={<Login/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/terms"   element={<TermsPage/>}/>
      <Route path="/privacy" element={<PrivacyPage/>}/>

      {/* Redirection racine : landing si non connecté, dashboard si connecté */}
      <Route path="/" element={<RootRedirect/>}/>

      {/* Pages privées sous Layout */}
      <Route element={<PrivateRoute><Layout/></PrivateRoute>}>
        <Route path="/dashboard"          element={<Dashboard/>}/>
        <Route path="/expenses"           element={<Expenses/>}/>
        <Route path="/recurring"          element={<Recurring/>}/>
        <Route path="/incomes"            element={<Incomes/>}/>
        <Route path="/budgets"            element={<Budgets/>}/>
        <Route path="/reports"            element={<Reports/>}/>
        <Route path="/settings/profile"   element={<ProfilePage/>}/>
        <Route path="/settings/security"  element={<SecurityPage/>}/>
        <Route path="/settings/theme"     element={<ThemePage/>}/>
        <Route path="/settings/currency"  element={<CurrencyPage/>}/>
        <Route path="/notifications"     element={<NotificationsPage />} />
        <Route path="/help"              element={<HelpPage />} />
        <Route path="/settings/plan"     element={<PlanPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  )
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', color:'#aaa', fontSize:14 }}>
      Chargement...
    </div>
  )
  return user
    ? <Navigate to="/dashboard" replace/>
    : <Navigate to="/landing"   replace/>
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes/>
    </AuthProvider>
  )
}