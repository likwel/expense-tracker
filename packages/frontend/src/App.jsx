import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout             from './components/layout/Layout'
import Dashboard          from './pages/Dashboard'
import Expenses           from './pages/Expenses'
import Incomes            from './pages/Incomes'
import Budgets            from './pages/Budgets'
import Reports            from './pages/Reports'
import Recurring          from './pages/Recurring'
import Login              from './pages/Login'
import Register           from './pages/Register'
import LandingPage        from './pages/LandingPage'
import ProfilePage        from './pages/settings/ProfilePage'
import SecurityPage       from './pages/settings/SecurityPage'
import ThemePage          from './pages/settings/ThemePage'
import CurrencyPage       from './pages/settings/CurrencyPage'
import TermsPage          from './pages/TermsPage'
import PrivacyPage        from './pages/PrivacyPage'
import NotificationsPage  from './pages/NotificationsPage'
import HelpPage           from './pages/HelpPage'
import PlanPage           from './pages/settings/PlanPage'
import AdminPage          from './pages/Admin'
import { OrgProvider }    from './contexts/OrgContext'

// ── Spinner partagé ───────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '3px solid #EEEDFE', borderTopColor: '#534AB7',
        animation: 'spin .7s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── PrivateRoute — attend UNIQUEMENT loading (pas ratesReady) ─────
// ratesReady peut échouer silencieusement → boucle infinie si on l'attend
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner/>
  if (!user)   return <Navigate to="/login" replace/>
  return children
}

// ── PublicRoute — redirige vers /dashboard si déjà connecté ──────
// Pour /login et /register uniquement
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner/>
  if (user)    return <Navigate to="/dashboard" replace/>
  return children
}

// ── RootRedirect — / vers landing ou dashboard ────────────────────
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner/>
  return user
    ? <Navigate to="/dashboard" replace/>
    : <Navigate to="/landing"   replace/>
}

// ── Routes ────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>

      {/* Racine */}
      <Route path="/" element={<RootRedirect/>}/>

      {/* Pages publiques — accessibles à tous */}
      <Route path="/landing"  element={<LandingPage/>}/>
      <Route path="/terms"    element={<TermsPage/>}/>
      <Route path="/privacy"  element={<PrivacyPage/>}/>

      {/* Pages auth — redirige vers /dashboard si déjà connecté */}
      <Route path="/login"    element={<PublicRoute><Login/></PublicRoute>}/>
      <Route path="/register" element={<PublicRoute><Register/></PublicRoute>}/>

      {/* Pages privées sous Layout */}
      <Route element={<PrivateRoute><Layout/></PrivateRoute>}>
        <Route path="/dashboard"         element={<Dashboard/>}/>
        <Route path="/expenses"          element={<Expenses/>}/>
        <Route path="/recurring"         element={<Recurring/>}/>
        <Route path="/incomes"           element={<Incomes/>}/>
        <Route path="/budgets"           element={<Budgets/>}/>
        <Route path="/reports"           element={<Reports/>}/>
        <Route path="/notifications"     element={<NotificationsPage/>}/>
        <Route path="/help"              element={<HelpPage/>}/>
        <Route path="/settings/profile"  element={<ProfilePage/>}/>
        <Route path="/settings/security" element={<SecurityPage/>}/>
        <Route path="/settings/theme"    element={<ThemePage/>}/>
        <Route path="/settings/currency" element={<CurrencyPage/>}/>
        <Route path="/settings/plan"     element={<PlanPage/>}/>
        <Route path="/admin"             element={<AdminPage/>}/>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace/>}/>

    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <AppRoutes/>
      </OrgProvider>
    </AuthProvider>
  )
}