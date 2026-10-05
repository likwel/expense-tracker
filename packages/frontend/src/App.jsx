import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout             from './components/layout/Layout'
import { OrgProvider }    from './contexts/OrgContext'
import { ToastProvider }  from './components/ui/Toast'

// Pages chargées à la demande (bundle initial plus léger)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Incomes = lazy(() => import('./pages/Incomes'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Reports = lazy(() => import('./pages/Reports'))
const Recurring = lazy(() => import('./pages/Recurring'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const ProfilePage = lazy(() => import('./pages/settings/ProfilePage'))
const SecurityPage = lazy(() => import('./pages/settings/SecurityPage'))
const ThemePage = lazy(() => import('./pages/settings/ThemePage'))
const CurrencyPage = lazy(() => import('./pages/settings/CurrencyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const PlanPage = lazy(() => import('./pages/settings/PlanPage'))
const AdminPage = lazy(() => import('./pages/Admin'))

// ── Spinner partagé ───────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '3px solid #EEEDFE', borderTopColor: '#534AB7',
        animation: 'spin .7s linear infinite',
      }}/>
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
    <Suspense fallback={<Spinner/>}>
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
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <ToastProvider>
          <AppRoutes/>
        </ToastProvider>
      </OrgProvider>
    </AuthProvider>
  )
}