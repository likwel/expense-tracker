import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth }   from './contexts/AuthContext'
import Layout    from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Expenses  from './pages/Expenses'
import Incomes   from './pages/Incomes'
import Budgets   from './pages/Budgets'
import Reports   from './pages/Reports'
import Recurring from './pages/Recurring'   // ← nouveau
import Login     from './pages/Login'
import Register  from './pages/Register'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
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
      <Route path="/login"    element={<Login/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/" element={<PrivateRoute><Layout/></PrivateRoute>}>
        <Route index             element={<Dashboard/>}/>
        <Route path="expenses"   element={<Expenses/>}/>
        <Route path="recurring"  element={<Recurring/>}/>
        <Route path="incomes"    element={<Incomes/>}/>
        <Route path="budgets"    element={<Budgets/>}/>
        <Route path="reports"    element={<Reports/>}/>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes/>
    </AuthProvider>
  )
}